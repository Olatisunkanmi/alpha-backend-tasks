from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.briefing import Briefing  # noqa: F401


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

def test_create_briefing(client: TestClient):
    payload = {
        "companyName": "Acme Holdings",
        "ticker": "acme",  # Should be normalized to ACME
        "sector": "Industrial Technology",
        "analystName": "Jane Doe",
        "summary": "Acme is benefiting from strong enterprise demand.",
        "recommendation": "Monitor for margin expansion.",
        "keyPoints": [
            "Revenue grew 18% year-over-year.",
            "Management raised full-year guidance."
        ],
        "risks": [
            "Top two customers account for 41% of total revenue."
        ],
        "metrics": [
            { "name": "Revenue Growth", "value": "18%" },
            { "name": "Operating Margin", "value": "22.4%" }
        ]
    }
    response = client.post("/briefings", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Acme Holdings"
    assert data["ticker"] == "ACME"  # Normalized
    assert len(data["key_points"]) == 2
    assert len(data["risks"]) == 1
    assert len(data["metrics"]) == 2
    return data["id"]

def test_get_briefing(client: TestClient):
    # First create one
    payload = {
        "companyName": "Test Co",
        "ticker": "TEST",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Rec",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"]
    }
    create_resp = client.post("/briefings", json=payload)
    briefing_id = create_resp.json()["id"]

    response = client.get(f"/briefings/{briefing_id}")
    assert response.status_code == 200
    assert response.json()["company_name"] == "Test Co"

def test_generate_report(client: TestClient):
    payload = {
        "companyName": "Generate Co",
        "ticker": "GEN",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Rec",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"]
    }
    create_resp = client.post("/briefings", json=payload)
    briefing_id = create_resp.json()["id"]

    # Before generation
    assert create_resp.json()["is_generated"] is False

    # Generate
    gen_resp = client.post(f"/briefings/{briefing_id}/generate")
    assert gen_resp.status_code == 200
    assert gen_resp.json()["is_generated"] is True
    assert gen_resp.json()["html_content"] is not None

def test_get_html(client: TestClient):
    payload = {
        "companyName": "HTML Co",
        "ticker": "HTML",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Rec",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"]
    }
    create_resp = client.post("/briefings", json=payload)
    briefing_id = create_resp.json()["id"]

    # Should fail if not generated
    html_fail = client.get(f"/briefings/{briefing_id}/html")
    assert html_fail.status_code == 400

    # Generate
    client.post(f"/briefings/{briefing_id}/generate")

    # Should succeed now
    html_resp = client.get(f"/briefings/{briefing_id}/html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers["content-type"]
    assert "HTML Co" in html_resp.text

def test_validation_errors(client: TestClient):
    # Missing required field
    payload = {"ticker": "MISSING"}
    response = client.post("/briefings", json=payload)
    assert response.status_code == 422

    # Too few key points (min 2)
    payload = {
        "companyName": "Fail",
        "ticker": "FAIL",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Rec",
        "keyPoints": ["Only one"],
        "risks": ["Risk 1"]
    }
    response = client.post("/briefings", json=payload)
    assert response.status_code == 422

    # Duplicate metric names
    payload = {
        "companyName": "Fail",
        "ticker": "FAIL",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary",
        "recommendation": "Rec",
        "keyPoints": ["Point 1", "Point 2"],
        "risks": ["Risk 1"],
        "metrics": [
            {"name": "Same", "value": "1"},
            {"name": "Same", "value": "2"}
        ]
    }
    response = client.post("/briefings", json=payload)
    assert response.status_code == 422
