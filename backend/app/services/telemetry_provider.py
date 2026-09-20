from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import random

class TelemetryReadingDTO:
    def __init__(
        self,
        sensor_id: int,
        sensor_code: str,
        value: float,
        unit: str,
        quality: str = "GOOD",
        source: str = "SIMULATED",
        timestamp: Optional[datetime] = None,
        message_id: Optional[str] = None
    ):
        self.sensor_id = sensor_id
        self.sensor_code = sensor_code
        self.value = value
        self.unit = unit
        self.quality = quality
        self.source = source
        self.timestamp = timestamp or datetime.now(timezone.utc)
        self.message_id = message_id or f"MSG-SIM-{sensor_id}-{int(self.timestamp.timestamp())}"

class TelemetryProvider(ABC):
    @abstractmethod
    def get_source_name(self) -> str:
        """Returns the telemetry source identifier (e.g. SIMULATED, MQTT, SCADA)"""
        pass

    @abstractmethod
    def generate_or_fetch_reading(
        self,
        sensor_metadata: Dict[str, Any],
        scenario: str = "NORMAL"
    ) -> TelemetryReadingDTO:
        """Fetch or generate a reading for a specific sensor under a scenario"""
        pass

class SimulatedTelemetryProvider(TelemetryProvider):
    def get_source_name(self) -> str:
        return "SIMULATED"

    def generate_or_fetch_reading(
        self,
        sensor_metadata: Dict[str, Any],
        scenario: str = "NORMAL"
    ) -> TelemetryReadingDTO:
        normal_min = sensor_metadata.get("normal_min", 0.0) or 0.0
        normal_max = sensor_metadata.get("normal_max", 10.0) or 10.0
        warning_thresh = sensor_metadata.get("warning_threshold", 8.0)
        critical_thresh = sensor_metadata.get("critical_threshold", 12.0)
        sensor_code = sensor_metadata.get("sensor_code", "")

        code_upper = sensor_code.upper()

        if scenario == "NORMAL":
            val = random.uniform(normal_min, normal_max)
        elif scenario == "WARNING":
            val = random.uniform(warning_thresh, (warning_thresh + critical_thresh) / 2.0)
        elif scenario == "CRITICAL":
            val = random.uniform(critical_thresh * 1.05, critical_thresh * 1.40)
        elif scenario == "METHANE_SPIKE":
            if any(k in code_upper for k in ["CH4", "METH", "GAS"]):
                val = random.uniform(critical_thresh * 1.08, critical_thresh * 1.45)
            else:
                val = random.uniform(normal_min, normal_max)
        elif scenario == "CO_SPIKE":
            if any(k in code_upper for k in ["CO", "CARBON"]):
                val = random.uniform(critical_thresh * 1.10, critical_thresh * 1.50)
            else:
                val = random.uniform(normal_min, normal_max)
        elif scenario == "VENTILATION_DROP":
            if any(k in code_upper for k in ["VEL", "AIR", "WIND", "FLOW"]):
                # Velocity drops below critical floor
                val = random.uniform(0.15, max(0.25, (normal_min or 1.0) * 0.35))
            else:
                val = random.uniform(normal_min, normal_max)
        elif scenario == "TRENDING_UP":
            last_v = sensor_metadata.get("last_value", normal_max) or normal_max
            val = last_v + (warning_thresh - normal_max) * 0.35
        elif scenario == "TRENDING_DOWN":
            last_v = sensor_metadata.get("last_value", warning_thresh) or warning_thresh
            val = max(normal_min, last_v - 0.25)
        elif scenario == "RECOVERING":
            val = (normal_min + normal_max) / 2.0
        elif scenario == "NOISY":
            val = random.uniform(normal_min * 0.8, normal_max * 1.2)
        elif scenario == "MULTI_SENSOR_ANOMALY":
            if any(k in code_upper for k in ["CH4", "CO", "VEL", "DUST", "TEMP", "VIB"]):
                val = random.uniform(critical_thresh * 1.05, critical_thresh * 1.35)
            else:
                val = random.uniform(normal_min, normal_max)
        else:
            val = random.uniform(normal_min, normal_max)

        val = round(val, 2)

        return TelemetryReadingDTO(
            sensor_id=sensor_metadata["id"],
            sensor_code=sensor_code,
            value=val,
            unit=sensor_metadata.get("unit", ""),
            quality="GOOD",
            source=self.get_source_name(),
            timestamp=datetime.now(timezone.utc)
        )

# Factory helper for future MQTT/SCADA expansion
def get_telemetry_provider(source_type: str = "SIMULATED") -> TelemetryProvider:
    if source_type == "SIMULATED":
        return SimulatedTelemetryProvider()
    return SimulatedTelemetryProvider()
