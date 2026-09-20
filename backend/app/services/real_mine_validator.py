from typing import List, Dict, Any, Optional
from app.core.exceptions import BusinessRuleViolationError

class RealMineValidator:
    """
    Validates Real Mine Data records against domain and physical constraints.
    Adheres strictly to the TRINETRA Real Mine Data Integrity Rules:
    - Never fabricates or silently repairs data.
    - Preserves verbatim NA meanings.
    - Explicitly flags approximate geometry and validation errors.
    """

    @staticmethod
    def validate_coordinates(
        lat: Optional[float],
        lon: Optional[float],
        point_label: str = "",
        mine_name: str = ""
    ) -> List[str]:
        errors = []
        if lat is not None:
            if not (-90.0 <= lat <= 90.0):
                errors.append(
                    f"Invalid latitude {lat} for point '{point_label}' in mine '{mine_name}'. Must be between -90 and 90."
                )
        if lon is not None:
            if not (-180.0 <= lon <= 180.0):
                errors.append(
                    f"Invalid longitude {lon} for point '{point_label}' in mine '{mine_name}'. Must be between -180 and 180."
                )
        return errors

    @staticmethod
    def validate_range(
        min_val: Optional[float],
        max_val: Optional[float],
        field_name: str,
        allow_negative: bool = False
    ) -> List[str]:
        errors = []
        if not allow_negative:
            if min_val is not None and min_val < 0:
                errors.append(f"{field_name} minimum value cannot be negative: {min_val}")
            if max_val is not None and max_val < 0:
                errors.append(f"{field_name} maximum value cannot be negative: {max_val}")
        if min_val is not None and max_val is not None and min_val > max_val:
            errors.append(f"{field_name} min ({min_val}) cannot exceed max ({max_val})")
        return errors

    @staticmethod
    def validate_provenance_link(
        provenance_id: Optional[int],
        data_status: str,
        entity_name: str,
        record_label: str
    ) -> List[str]:
        errors = []
        if data_status == "SOURCE_DERIVED" and provenance_id is None:
            errors.append(
                f"Missing provenance link for SOURCE_DERIVED entity '{entity_name}' ({record_label}). Every source fact must have traceable provenance."
            )
        return errors

    @staticmethod
    def validate_profile(profile_dict: Dict[str, Any]) -> List[str]:
        errors = []
        # Area validation
        area = profile_dict.get("geological_block_area_sq_km")
        if area is not None and area < 0:
            errors.append(f"Geological block area cannot be negative: {area}")
        
        # Reserves validation
        geo_res = profile_dict.get("total_geological_reserve_mt")
        ext_res = profile_dict.get("total_extractable_reserve_mt")
        if geo_res is not None and geo_res < 0:
            errors.append(f"Geological reserve cannot be negative: {geo_res}")
        if ext_res is not None and ext_res < 0:
            errors.append(f"Extractable reserve cannot be negative: {ext_res}")

        # Data status validation
        data_status = profile_dict.get("data_status", "SOURCE_DERIVED")
        if data_status not in ["SOURCE_DERIVED", "APPROXIMATE", "SCHEMATIC", "SIMULATED", "USER_ENTERED", "UNKNOWN"]:
            errors.append(f"Invalid data_status: {data_status}")

        return errors

    @staticmethod
    def validate_seam(seam_dict: Dict[str, Any]) -> List[str]:
        errors = []
        errors.extend(
            RealMineValidator.validate_range(
                seam_dict.get("thickness_min_m"),
                seam_dict.get("thickness_max_m"),
                f"Seam '{seam_dict.get('seam_name')}' thickness"
            )
        )
        errors.extend(
            RealMineValidator.validate_range(
                seam_dict.get("depth_min_m"),
                seam_dict.get("depth_max_m"),
                f"Seam '{seam_dict.get('seam_name')}' depth"
            )
        )
        errors.extend(
            RealMineValidator.validate_range(
                seam_dict.get("parting_min_m"),
                seam_dict.get("parting_max_m"),
                f"Seam '{seam_dict.get('seam_name')}' parting"
            )
        )
        
        geo_res = seam_dict.get("geological_reserve_mt")
        if geo_res is not None and geo_res < 0:
            errors.append(f"Seam geological reserve cannot be negative: {geo_res}")
            
        ext_res = seam_dict.get("extractable_reserve_mt")
        if ext_res is not None and ext_res < 0:
            errors.append(f"Seam extractable reserve cannot be negative: {ext_res}")

        return errors

    @staticmethod
    def compute_quality_metrics(
        profile: Any,
        boundaries: List[Any],
        coordinates: List[Any],
        seams: List[Any],
        clearances: List[Any],
        attributes: List[Any]
    ) -> Dict[str, Any]:
        total_items = 0
        items_with_provenance = 0
        validation_errors_count = 0
        missing_fields = []
        is_approximate = False

        if profile:
            total_items += 1
            if profile.provenance_id:
                items_with_provenance += 1
            if profile.geometry_status == "APPROXIMATE":
                is_approximate = True
            if not profile.geological_block_area_sq_km:
                missing_fields.append("geological_block_area")
            if not profile.total_geological_reserve_mt:
                missing_fields.append("total_geological_reserve")

        for b in boundaries:
            total_items += 1
            if b.provenance_id:
                items_with_provenance += 1
            if b.geometry_status == "APPROXIMATE":
                is_approximate = True

        for c in coordinates:
            total_items += 1
            if c.provenance_id:
                items_with_provenance += 1
            if c.geometry_status == "APPROXIMATE":
                is_approximate = True

        for s in seams:
            total_items += 1
            if s.provenance_id:
                items_with_provenance += 1

        for cl in clearances:
            total_items += 1
            if cl.provenance_id:
                items_with_provenance += 1

        for a in attributes:
            total_items += 1
            if a.provenance_id:
                items_with_provenance += 1

        prov_coverage = items_with_provenance / total_items if total_items > 0 else 1.0
        
        # Source coverage is high if core attributes exist
        source_coverage = 1.0 - (len(missing_fields) * 0.1)
        if source_coverage < 0:
            source_coverage = 0.0

        overall_status = "VALIDATED" if prov_coverage >= 0.95 and validation_errors_count == 0 else "REVIEW_REQUIRED"

        return {
            "overall_status": overall_status,
            "source_coverage": round(source_coverage, 2),
            "provenance_coverage": round(prov_coverage, 2),
            "validation_errors": validation_errors_count,
            "approximate_geometry": is_approximate,
            "survey_grade_geometry": not is_approximate and len(coordinates) > 0,
            "total_attributes_extracted": total_items,
            "missing_critical_fields": missing_fields
        }
