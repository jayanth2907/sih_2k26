import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.models.user import User
from app.models.mine import Mine
from app.models.notification import Notification
from app.models.alert import Alert
from app.models.incident import Incident
from app.models.governance_task import GovernanceTask
from app.models.field_operation import FieldInspection, FieldEvidence, FieldSyncLog
from app.models.risk import AnomalyEvent, RiskScore
from app.models.audit import AuditEvent
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.core.authz import check_mine_access, get_user_roles, get_user_assigned_mine_ids
from app.core.permissions import RoleEnum
from app.services.audit_service import AuditService

logger = logging.getLogger("trinetra.notifications")

class NotificationService:
    @staticmethod
    def get_user_notifications(
        db: Session,
        user: User,
        mine_id: Optional[int] = None,
        status_filter: Optional[str] = None, # ALL, UNREAD, READ
        category_filter: Optional[str] = None, # CRITICAL, TASKS, INCIDENTS, RISK, VERIFICATION
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Unified role-scoped and mine-isolated notification feed.
        Aggregates canonical Notification records and operational Alerts into actionable notifications.
        """
        roles = get_user_roles(user, db)
        is_admin = user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles

        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            mine_ids = [mine_id]
        else:
            if is_admin:
                mines = db.query(Mine).all()
                mine_ids = [m.id for m in mines]
            else:
                mine_ids = get_user_assigned_mine_ids(user, db)

        now = datetime.now(timezone.utc)
        items: List[Dict[str, Any]] = []

        # 1. Fetch User Notifications
        notif_query = db.query(Notification).filter(
            or_(
                Notification.user_id == user.id,
                Notification.mine_id.in_(mine_ids) if mine_ids else False
            )
        )
        if status_filter == "UNREAD":
            notif_query = notif_query.filter(Notification.is_read.in_(["NO", "UNREAD", False]))
        elif status_filter == "READ":
            notif_query = notif_query.filter(Notification.is_read.in_(["YES", "READ", True]))

        db_notifs = notif_query.order_by(desc(Notification.created_at)).limit(limit).all()

        for n in db_notifs:
            is_read_bool = n.is_read in ["YES", "READ", True]
            severity = "INFO"
            if n.notification_type in ["CRITICAL", "SLA_ALERT"]:
                severity = "CRITICAL"
            elif n.notification_type in ["WARNING", "HIGH"]:
                severity = "HIGH"

            # Parse deep link & resource type
            dest_tab = "home"
            res_type = "NOTIFICATION"
            res_id = str(n.id)
            if n.link:
                if "incident" in n.link.lower():
                    dest_tab = "incidents"
                    res_type = "INCIDENT"
                elif "task" in n.link.lower():
                    dest_tab = "tasks"
                    res_type = "TASK"
                elif "inspection" in n.link.lower():
                    dest_tab = "tasks"
                    res_type = "INSPECTION"
                elif "map" in n.link.lower() or "gis" in n.link.lower():
                    dest_tab = "map"
                    res_type = "MAP"
                elif "copilot" in n.link.lower():
                    dest_tab = "copilot"
                    res_type = "COPILOT"

            items.append({
                "id": f"notif-{n.id}",
                "raw_id": n.id,
                "source_system": "NOTIFICATION",
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "category": n.notification_type or "GENERAL",
                "severity": severity,
                "priority": severity,
                "mine_id": n.mine_id,
                "mine_name": n.mine.name if n.mine else None,
                "zone_name": None,
                "is_read": is_read_bool,
                "created_at": n.created_at.isoformat() if n.created_at else now.isoformat(),
                "link": n.link,
                "deep_link": {
                    "destination_tab": dest_tab,
                    "resource_type": res_type,
                    "resource_id": res_id
                },
                "is_stale": False,
                "stale_reason": None
            })

        # 2. Fetch Operational Alerts
        alert_query = db.query(Alert).filter(Alert.mine_id.in_(mine_ids)) if mine_ids else db.query(Alert)
        if status_filter == "UNREAD":
            alert_query = alert_query.filter(Alert.status == "UNREAD")
        elif status_filter == "READ":
            alert_query = alert_query.filter(Alert.status.in_(["READ", "ACKNOWLEDGED", "RESOLVED"]))

        db_alerts = alert_query.order_by(desc(Alert.created_at)).limit(limit).all()

        for a in db_alerts:
            is_read_bool = a.status != "UNREAD"
            dest_tab = "home"
            res_type = "ALERT"
            res_id = str(a.id)
            lat = a.mine.latitude if a.mine else None
            lon = a.mine.longitude if a.mine else None
            zone_name = None
            is_stale = False
            stale_reason = None

            # Determine deep link & stale state
            if a.incident_id:
                dest_tab = "incidents"
                res_type = "INCIDENT"
                res_id = str(a.incident_id)
                inc = db.query(Incident).filter(Incident.id == a.incident_id).first()
                if inc:
                    zone_name = inc.zone.name if inc.zone else None
                    if inc.status in ["CLOSED", "RESOLVED"]:
                        is_stale = True
                        stale_reason = f"Incident INC-{inc.id} is already {inc.status}."
                else:
                    is_stale = True
                    stale_reason = "Incident is no longer available."
            elif a.sensor_id:
                dest_tab = "map"
                res_type = "SENSOR"
                res_id = str(a.sensor_id)
                if a.sensor:
                    zone_name = a.sensor.zone.name if a.sensor.zone else None
            elif a.anomaly_id:
                dest_tab = "map"
                res_type = "ANOMALY"
                res_id = str(a.anomaly_id)

            category = "ANOMALY"
            if a.severity == "CRITICAL" and a.incident_id:
                category = "CRITICAL_INCIDENT"
            elif a.severity in ["CRITICAL", "HIGH"]:
                category = "HIGH_RISK"

            items.append({
                "id": f"alert-{a.id}",
                "raw_id": a.id,
                "source_system": "ALERT",
                "title": a.title,
                "message": a.message,
                "notification_type": a.severity,
                "category": category,
                "severity": a.severity,
                "priority": a.severity,
                "mine_id": a.mine_id,
                "mine_name": a.mine.name if a.mine else None,
                "zone_name": zone_name,
                "location_context": a.location_context,
                "latitude": lat,
                "longitude": lon,
                "is_read": is_read_bool,
                "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                "link": f"/mobile/{dest_tab}",
                "deep_link": {
                    "destination_tab": dest_tab,
                    "resource_type": res_type,
                    "resource_id": res_id,
                    "coordinates": {"x": lat, "y": 0, "z": lon} if lat and lon else None
                },
                "is_stale": is_stale,
                "stale_reason": stale_reason
            })

        # 3. Category Filter Application
        if category_filter and category_filter != "ALL":
            cat_upper = category_filter.upper()
            if cat_upper == "CRITICAL":
                items = [it for it in items if it["severity"] == "CRITICAL"]
            elif cat_upper == "TASKS":
                items = [it for it in items if "TASK" in it["category"] or it["deep_link"]["destination_tab"] == "tasks"]
            elif cat_upper == "INCIDENTS":
                items = [it for it in items if "INCIDENT" in it["category"] or it["deep_link"]["destination_tab"] == "incidents"]
            elif cat_upper == "RISK":
                items = [it for it in items if "RISK" in it["category"] or "ANOMALY" in it["category"]]
            elif cat_upper == "VERIFICATION":
                items = [it for it in items if "VERIF" in it["category"]]

        # 4. Deterministic Sort: Newest first
        items.sort(key=lambda x: x["created_at"], reverse=True)
        paginated_items = items[offset:offset + limit]

        # 5. Counts Computation
        counts = NotificationService.get_unread_counts(db, user, mine_id)

        return {
            "mine_id": mine_id,
            "total_count": len(items),
            "notifications": paginated_items,
            "counts": counts
        }

    @staticmethod
    def get_unread_counts(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Calculates accurate unread notification counts per category."""
        roles = get_user_roles(user, db)
        is_admin = user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles

        if mine_id is not None:
            mine_ids = [mine_id]
        else:
            if is_admin:
                mines = db.query(Mine).all()
                mine_ids = [m.id for m in mines]
            else:
                mine_ids = get_user_assigned_mine_ids(user, db)

        # Count unread notifications
        notif_cnt = db.query(Notification).filter(
            or_(
                Notification.user_id == user.id,
                Notification.mine_id.in_(mine_ids) if mine_ids else False
            ),
            Notification.is_read.in_(["NO", "UNREAD", False])
        ).count()

        # Count unread alerts
        alert_query = db.query(Alert).filter(Alert.status == "UNREAD")
        if mine_ids:
            alert_query = alert_query.filter(Alert.mine_id.in_(mine_ids))
        alert_cnt = alert_query.count()

        critical_cnt = alert_query.filter(Alert.severity == "CRITICAL").count()

        # Check pending verification count in mine scope
        verif_tasks_cnt = 0
        if mine_ids:
            verif_tasks_cnt = db.query(GovernanceTask).filter(
                GovernanceTask.mine_id.in_(mine_ids),
                GovernanceTask.status.in_(["RESOLVED", "SUBMITTED"])
            ).count()

        # Open critical incidents count
        incidents_cnt = 0
        if mine_ids:
            incidents_cnt = db.query(Incident).filter(
                Incident.mine_id.in_(mine_ids),
                Incident.status.in_(["OPEN", "TRIAGED", "ASSIGNED"]),
                Incident.severity.in_(["HIGH", "CRITICAL"])
            ).count()

        total_unread = notif_cnt + alert_cnt

        return {
            "total_unread": total_unread,
            "critical_unread": critical_cnt,
            "tasks_unread": notif_cnt,
            "incidents_unread": incidents_cnt,
            "verification_unread": verif_tasks_cnt,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def mark_as_read(
        db: Session,
        user: User,
        notification_id: str
    ) -> Dict[str, Any]:
        """
        Marks an individual notification or alert as read.
        Enforces authorization and logs an immutable audit trail.
        """
        now = datetime.now(timezone.utc)
        if notification_id.startswith("notif-"):
            raw_id = int(notification_id.replace("notif-", ""))
            notif = db.query(Notification).filter(Notification.id == raw_id).first()
            if not notif:
                raise EntityNotFoundError("Notification", raw_id)
            if notif.mine_id and not check_mine_access(user, notif.mine_id, db):
                raise PermissionDeniedError(f"Access denied to Notification ID {notification_id}")

            notif.is_read = "YES"
            db.commit()

            AuditService.log_event(
                db=db,
                actor_id=user.id,
                action="NOTIFICATION_MARKED_READ",
                resource_type="NOTIFICATION",
                resource_id=str(raw_id),
                mine_id=notif.mine_id,
                before_state={"is_read": "NO"},
                after_state={"is_read": "YES"}
            )
            return {"status": "SUCCESS", "id": notification_id, "is_read": True}

        elif notification_id.startswith("alert-"):
            raw_id = int(notification_id.replace("alert-", ""))
            alert = db.query(Alert).filter(Alert.id == raw_id).first()
            if not alert:
                raise EntityNotFoundError("Alert", raw_id)
            if not check_mine_access(user, alert.mine_id, db):
                raise PermissionDeniedError(f"Access denied to Alert ID {notification_id}")

            prev_st = alert.status
            alert.status = "READ"
            db.commit()

            AuditService.log_event(
                db=db,
                actor_id=user.id,
                action="ALERT_MARKED_READ",
                resource_type="ALERT",
                resource_id=str(raw_id),
                mine_id=alert.mine_id,
                before_state={"status": prev_st},
                after_state={"status": "READ"}
            )
            return {"status": "SUCCESS", "id": notification_id, "is_read": True}
        else:
            # Fallback numeric id
            try:
                raw_id = int(notification_id)
                notif = db.query(Notification).filter(Notification.id == raw_id).first()
                if notif:
                    notif.is_read = "YES"
                    db.commit()
                    return {"status": "SUCCESS", "id": str(raw_id), "is_read": True}
            except ValueError:
                pass
            raise EntityNotFoundError("Notification", notification_id)

    @staticmethod
    def mark_all_as_read(
        db: Session,
        user: User,
        mine_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Marks all notifications and alerts in user's scope as read.
        """
        roles = get_user_roles(user, db)
        is_admin = user.is_superuser or RoleEnum.SYSTEM_ADMIN.value in roles or RoleEnum.REGULATOR.value in roles

        if mine_id is not None:
            if not check_mine_access(user, mine_id, db):
                raise PermissionDeniedError(f"Access denied to Mine ID {mine_id}")
            mine_ids = [mine_id]
        else:
            if is_admin:
                mines = db.query(Mine).all()
                mine_ids = [m.id for m in mines]
            else:
                mine_ids = get_user_assigned_mine_ids(user, db)

        # Mark user notifications as read
        notifs = db.query(Notification).filter(
            or_(
                Notification.user_id == user.id,
                Notification.mine_id.in_(mine_ids) if mine_ids else False
            ),
            Notification.is_read.in_(["NO", "UNREAD", False])
        ).all()
        for n in notifs:
            n.is_read = "YES"

        # Mark alerts as read
        alert_query = db.query(Alert).filter(Alert.status == "UNREAD")
        if mine_ids:
            alert_query = alert_query.filter(Alert.mine_id.in_(mine_ids))
        alerts = alert_query.all()
        for a in alerts:
            a.status = "READ"

        db.commit()

        AuditService.log_event(
            db=db,
            actor_id=user.id,
            action="NOTIFICATIONS_MARK_ALL_READ",
            resource_type="NOTIFICATION_BATCH",
            resource_id=f"MINE_{mine_id or 'ALL'}",
            mine_id=mine_id,
            before_state={"unread_notifs": len(notifs), "unread_alerts": len(alerts)},
            after_state={"marked_read_count": len(notifs) + len(alerts)}
        )

        return {
            "status": "SUCCESS",
            "marked_read_count": len(notifs) + len(alerts)
        }

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        notification_type: str = "INFO",
        mine_id: Optional[int] = None,
        link: Optional[str] = None
    ) -> Notification:
        """Helper to create and persist a notification with deduplication check."""
        now = datetime.now(timezone.utc)
        # Deduplication: same user, title, mine within 10 minutes
        ten_mins_ago = now - timedelta(minutes=10)
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.title == title,
            Notification.mine_id == mine_id,
            Notification.created_at >= ten_mins_ago
        ).first()

        if existing:
            existing.message = message
            existing.is_read = "NO"
            db.commit()
            return existing

        notif = Notification(
            user_id=user_id,
            mine_id=mine_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
            is_read="NO",
            created_at=now
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
