from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app


client = TestClient(app)


def test_analyze_reports_not_implemented():
    response = client.post(
        "/analyze",
        json={"media_type": "video", "tasks": ["ocr"]},
    )
    assert response.status_code == 501
    assert "not implemented" in response.json()["detail"].lower()
