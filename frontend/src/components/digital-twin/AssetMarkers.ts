import * as THREE from 'three';
import { Sensor, Camera, Equipment, Incident, AnomalyEvent } from '../../types';

export interface NearbyAssetLink {
  from: THREE.Vector3;
  to: THREE.Vector3;
  distance: number;
  label: string;
  type: 'camera' | 'equipment';
}

export class AssetMarkersBuilder {
  /**
   * Color lookup based on status and viewMode
   */
  static getSensorColor(sensor: Sensor, isHeatmap: boolean = false): number {
    const status = (sensor.status || 'ACTIVE').toUpperCase();
    if (status === 'CRITICAL') return 0xef4444; // Red
    if (status === 'WARNING') return 0xf59e0b;  // Amber
    if (status === 'OFFLINE') return 0x64748b;  // Grey
    if (status === 'RECOVERING') return 0x06b6d4; // Cyan
    return 0x10b981; // Normal/Active Emerald
  }

  /**
   * Builds 3D Sensor Marker with status color, dynamic pulsing ring, and label anchor.
   */
  static createSensorMesh(sensor: Sensor, isHeatmap: boolean = false): THREE.Group {
    const group = new THREE.Group();
    group.name = `sensor_${sensor.id}`;
    group.userData = { type: 'sensor', data: sensor, id: sensor.id };

    const color = this.getSensorColor(sensor, isHeatmap);

    // Main Sphere Node
    const geometry = new THREE.SphereGeometry(2.0, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: sensor.status === 'CRITICAL' ? 0.8 : 0.3,
      metalness: 0.2,
      roughness: 0.3
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'sensor_core';
    group.add(sphere);

    // Outer Glow / Status Ring
    const ringGeo = new THREE.RingGeometry(2.6, 3.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'sensor_ring';
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Vertical Anchor Line to tunnel floor
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -6, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4
    });
    const stem = new THREE.Line(lineGeo, lineMat);
    group.add(stem);

    return group;
  }

  /**
   * Builds 3D Camera Frustum Marker showing field of view direction.
   */
  static createCameraMesh(camera: Camera): THREE.Group {
    const group = new THREE.Group();
    group.name = `camera_${camera.id}`;
    group.userData = { type: 'camera', data: camera, id: camera.id };

    const color = camera.status === 'ONLINE' ? 0x06b6d4 : 0x64748b;

    // Camera Body Housing Box
    const bodyGeo = new THREE.BoxGeometry(2.5, 1.8, 3.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Lens Cylinder
    const lensGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.4 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 2.2;
    group.add(lens);

    // 3D Visual Frustum Pyramid (FOV Cone)
    const fovGeo = new THREE.ConeGeometry(8, 20, 4, 1, true);
    const fovMat = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const fov = new THREE.Mesh(fovGeo, fovMat);
    fov.rotation.x = -Math.PI / 2;
    fov.position.z = 12;
    group.add(fov);

    return group;
  }

  /**
   * Builds 3D Machinery / Equipment Mesh with status bounding indicator.
   */
  static createEquipmentMesh(eq: Equipment): THREE.Group {
    const group = new THREE.Group();
    group.name = `equipment_${eq.id}`;
    group.userData = { type: 'equipment', data: eq, id: eq.id };

    const isOp = eq.status === 'OPERATIONAL';
    const isMaint = eq.status === 'MAINTENANCE';
    const color = isOp ? 0xf59e0b : isMaint ? 0xef4444 : 0x64748b;

    // Main Heavy Equipment Base Block
    const baseGeo = new THREE.BoxGeometry(6, 3.5, 10);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.6,
      roughness: 0.4
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    // Operator Cabin / Upper Structure
    const cabGeo = new THREE.BoxGeometry(4, 2.8, 4);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.4,
      roughness: 0.6
    });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 3, -1);
    group.add(cab);

    // Status Beacon on top
    const beaconGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.9
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 5, -1);
    beacon.name = 'equipment_beacon';
    group.add(beacon);

    return group;
  }

  /**
   * Builds Glowing 3D Anomaly / Incident Hazard Marker.
   */
  static createAnomalyMesh(anomaly: AnomalyEvent): THREE.Group {
    const group = new THREE.Group();
    group.name = `anomaly_${anomaly.id}`;
    group.userData = { type: 'anomaly', data: anomaly, id: anomaly.id };

    const color = anomaly.severity === 'CRITICAL' ? 0xef4444 : 0xf59e0b;

    // Octahedron Hazard Core
    const geo = new THREE.OctahedronGeometry(3.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      wireframe: false,
      transparent: true,
      opacity: 0.85
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'anomaly_core';
    group.add(mesh);

    // Outer Pulsing Hazard Wireframe
    const wireGeo = new THREE.OctahedronGeometry(5.0, 0);
    const wireMat = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.name = 'anomaly_pulse_wire';
    group.add(wire);

    return group;
  }

  /**
   * Builds Glowing 3D Incident Hazard Marker.
   */
  static createIncidentMesh(incident: Incident): THREE.Group {
    const group = new THREE.Group();
    group.name = `incident_${incident.id}`;
    group.userData = { type: 'incident', data: incident, id: incident.id };

    // Floating Hazard Diamond
    const geo = new THREE.ConeGeometry(3, 6, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const diamond = new THREE.Mesh(geo, mat);
    diamond.name = 'incident_diamond';
    group.add(diamond);

    // Glowing Vertical Beacon Beam Pillar
    const beamGeo = new THREE.CylinderGeometry(0.2, 2.5, 30, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -15;
    group.add(beam);

    return group;
  }

  static createIncidentBeacon(incident: Incident): THREE.Group {
    return this.createIncidentMesh(incident);
  }

  /**
   * Builds Dashed 3D Proximity Link Lines connecting a selected sensor to nearby cameras/equipment.
   */
  static createProximityLine(link: NearbyAssetLink): THREE.Group {
    const group = new THREE.Group();
    group.name = 'proximity_link';

    const points = [link.from, link.to];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const color = link.type === 'camera' ? 0x38bdf8 : 0x10b981;
    const material = new THREE.LineDashedMaterial({
      color: color,
      dashSize: 2.5,
      gapSize: 1.5,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    group.add(line);

    // Midpoint distance marker beacon
    const mid = new THREE.Vector3().addVectors(link.from, link.to).multiplyScalar(0.5);
    const markerGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: color });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(mid);
    group.add(marker);

    return group;
  }
}
