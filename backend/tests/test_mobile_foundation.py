import json
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import User

client = TestClient(app)

def test_pwa_manifest_validity():
    """Verify that PWA Web App Manifest exists, is valid JSON, and adheres to standalone specifications."""
    manifest_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "manifest.webmanifest")
    assert os.path.exists(manifest_path), f"Manifest file missing at {manifest_path}"
    
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    assert data["name"] == "TRINETRA FIELD — Field Intelligence"
    assert data["short_name"] == "TRINETRA FIELD"
    assert data["start_url"] == "/mobile"
    assert data["display"] == "standalone"
    assert data["theme_color"] == "#0B0F19"
    assert "icons" in data and len(data["icons"]) > 0
    assert data["icons"][0]["src"] == "/favicon.svg"

def test_unauthenticated_mobile_access_rejected():
    """Verify that mobile field inspections cannot be accessed without valid JWT."""
    response = client.get("/api/v1/mobile/inspections")
    assert response.status_code == 401

def test_authenticated_mobile_inspections_endpoint():
    """Verify that an authenticated user can retrieve assigned inspections for authorized mines."""
    token = create_access_token(subject="1")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/v1/mobile/inspections?mine_id=1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_mobile_sync_batch_endpoint():
    """Verify that batch sync endpoint processes valid batch requests."""
    token = create_access_token(subject="1")
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "client_batch_id": "test-batch-001",
        "mine_id": 1,
        "operations": []
    }
    response = client.post("/api/v1/mobile/sync", json=payload, headers=headers)
    assert response.status_code == 200
    result = response.json()
    assert "processed_count" in result
    assert result["processed_count"] == 0
    assert result["accepted_count"] == 0
