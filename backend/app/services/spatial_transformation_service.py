import math
from typing import Dict, Any, List, Optional, Tuple

class SpatialTransformationService:
    """
    Transforms Geographic (WGS84) and Projected (CoalGrid) coordinates into a
    Local Tangent Plane (Local Mine Coordinate Frame) in meters for 3D visualization.

    Convention:
    - Origin (0, 0, 0): Documented Mine Reference Point (Latitude, Longitude, Elevation)
    - X-axis: East displacement (meters) [Positive East]
    - Y-axis: Elevation above sea level or depth from surface (meters) [Positive Up]
    - Z-axis: South displacement (meters) [Positive South, aligning with Three.js camera frame]
    """

    # Earth radius in meters (WGS84 mean radius)
    EARTH_RADIUS_METERS = 6371000.0

    @staticmethod
    def lat_lon_to_local_meters(
        lat: float,
        lon: float,
        origin_lat: float,
        origin_lon: float
    ) -> Tuple[float, float]:
        """
        Converts (lat, lon) to local (east_m, south_m) relative to origin using
        equirectangular projection for localized mining spatial scales (< 50 km).
        """
        d_lat_rad = math.radians(lat - origin_lat)
        d_lon_rad = math.radians(lon - origin_lon)
        avg_lat_rad = math.radians((lat + origin_lat) / 2.0)

        # East displacement: delta_lon * cos(avg_lat) * R
        east_m = d_lon_rad * math.cos(avg_lat_rad) * SpatialTransformationService.EARTH_RADIUS_METERS
        # North displacement: delta_lat * R. For Three.js Z-axis (pointing towards viewer/south), South = -North
        south_m = -(d_lat_rad * SpatialTransformationService.EARTH_RADIUS_METERS)

        return round(east_m, 2), round(south_m, 2)

    @staticmethod
    def project_boundary_polygon(
        min_lat: Optional[float],
        max_lat: Optional[float],
        min_lon: Optional[float],
        max_lon: Optional[float],
        origin_lat: float,
        origin_lon: float,
        y_elev: float = 0.0
    ) -> List[Dict[str, float]]:
        """
        Generates 4 bounding box corner vertices in local 3D coordinates.
        """
        if None in (min_lat, max_lat, min_lon, max_lon):
            return []

        # 4 corners: NW, NE, SE, SW
        corners_geo = [
            (max_lat, min_lon), # NW
            (max_lat, max_lon), # NE
            (min_lat, max_lon), # SE
            (min_lat, min_lon), # SW
            (max_lat, min_lon)  # Close loop
        ]

        vertices_3d = []
        for lat, lon in corners_geo:
            x, z = SpatialTransformationService.lat_lon_to_local_meters(lat, lon, origin_lat, origin_lon)
            vertices_3d.append({"x": x, "y": y_elev, "z": z, "latitude": lat, "longitude": lon})

        return vertices_3d

    @staticmethod
    def project_cardinal_coordinates(
        coordinates: List[Any],
        origin_lat: float,
        origin_lon: float,
        default_y: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Projects a list of MineCoordinate records to local 3D points.
        """
        projected = []
        for c in coordinates:
            lat = c.latitude
            lon = c.longitude
            if lat is not None and lon is not None:
                x, z = SpatialTransformationService.lat_lon_to_local_meters(lat, lon, origin_lat, origin_lon)
            else:
                x, z = 0.0, 0.0

            prov_dict = None
            if c.provenance:
                prov_dict = {
                    "document_title": c.provenance.document_title,
                    "document_filename": c.provenance.document_filename,
                    "document_hash": c.provenance.document_hash,
                    "page_number": c.provenance.page_number,
                    "section_heading": c.provenance.section_heading,
                    "authority_level": c.provenance.authority_level,
                    "data_status": c.provenance.data_status
                }

            projected.append({
                "id": c.id,
                "point_label": c.point_label,
                "sequence_order": c.sequence_order,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "lat_dms_raw": c.lat_dms_raw,
                "lon_dms_raw": c.lon_dms_raw,
                "x_proj": c.x_proj,
                "y_proj": c.y_proj,
                "x_proj_raw": c.x_proj_raw,
                "y_proj_raw": c.y_proj_raw,
                "local_x": x,
                "local_y": default_y,
                "local_z": z,
                "datum": c.datum,
                "coordinate_system": c.coordinate_system,
                "geometry_status": c.geometry_status,
                "notes": c.notes,
                "provenance": prov_dict
            })
        return projected

    @staticmethod
    def compute_data_completeness(
        mine: Any,
        boundary: Optional[Any],
        coordinates: List[Any],
        seams: List[Any]
    ) -> Dict[str, Any]:
        """
        Computes an explainable data completeness summary indicating which spatial
        aspects are documented vs which remain unavailable.
        """
        has_boundary = boundary is not None and (boundary.min_latitude is not None or len(coordinates) > 0)
        has_coordinates = len(coordinates) > 0 or (mine.latitude is not None and mine.longitude is not None)
        has_seams = len(seams) > 0
        has_elevation = mine.elevation is not None
        has_underground = len(mine.levels) > 0 and any(len(lvl.zones) > 0 for lvl in mine.levels)

        geom_status = "SIMULATED" if mine.is_simulated == "YES" else (
            boundary.geometry_status if boundary else (
                mine.profile.geometry_status if mine.profile else "SOURCE_DERIVED"
            )
        )

        return {
            "boundary": "AVAILABLE" if has_boundary else "NOT_AVAILABLE",
            "coordinates": "AVAILABLE" if has_coordinates else "NOT_AVAILABLE",
            "seams": "AVAILABLE" if has_seams else "NOT_AVAILABLE",
            "elevation": "AVAILABLE" if has_elevation else "NOT_DOCUMENTED",
            "underground_workings": "AVAILABLE" if has_underground else "NOT_DOCUMENTED",
            "geometry_status": geom_status,
            "is_simulated": mine.is_simulated,
            "data_status": mine.data_status
        }
