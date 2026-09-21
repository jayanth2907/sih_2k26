import { User, RoleType } from '../../types';
import { MobileAction } from '../types/mobile';

/**
 * Centralized Mobile RBAC permission matrix.
 * Evaluates whether a given user identity has UI permission for a field action.
 * NOTE: Server-side authorization remains authoritative and mandatory.
 */
const ROLE_PERMISSIONS: Record<RoleType, MobileAction[]> = {
  SYSTEM_ADMIN: [
    'INSPECTION_CREATE',
    'INSPECTION_AUDIT',
    'INCIDENT_REPORT',
    'INCIDENT_MANAGE',
    'OBSERVATION_CREATE',
    'EVIDENCE_CAPTURE',
    'EVIDENCE_VERIFY',
    'APPROVAL_ACTION',
    'MINE_OVERVIEW',
    'STATUTORY_AUDIT',
    'VIOLATION_VIEW',
    'WORKFORCE_VERIFY',
    'DIAGNOSTICS_VIEW',
  ],
  FIELD_INSPECTOR: [
    'INSPECTION_CREATE',
    'INCIDENT_REPORT',
    'OBSERVATION_CREATE',
    'EVIDENCE_CAPTURE',
    'MINE_OVERVIEW',
  ],
  MINE_SAFETY_OFFICER: [
    'INSPECTION_AUDIT',
    'INCIDENT_REPORT',
    'INCIDENT_MANAGE',
    'OBSERVATION_CREATE',
    'EVIDENCE_VERIFY',
    'VIOLATION_VIEW',
    'MINE_OVERVIEW',
  ],
  MINE_MANAGER: [
    'APPROVAL_ACTION',
    'INCIDENT_MANAGE',
    'EVIDENCE_VERIFY',
    'MINE_OVERVIEW',
    'WORKFORCE_VERIFY',
  ],
  REGULATOR: [
    'STATUTORY_AUDIT',
    'VIOLATION_VIEW',
    'EVIDENCE_VERIFY',
    'MINE_OVERVIEW',
    'DIAGNOSTICS_VIEW',
  ],
  CONTRACTOR_MANAGER: [
    'WORKFORCE_VERIFY',
    'INCIDENT_REPORT',
    'MINE_OVERVIEW',
  ],
};

export function canMobile(action: MobileAction, user: User | null): boolean {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }
  // SYSTEM_ADMIN has full permissions
  if (user.roles.includes('SYSTEM_ADMIN')) {
    return true;
  }
  // Check if any of the user's active roles grant this action
  return user.roles.some((role) => {
    const allowed = ROLE_PERMISSIONS[role as RoleType];
    return allowed ? allowed.includes(action) : false;
  });
}
