import httpx
import pytest
from fastapi.testclient import TestClient

from demo_gateway import create_gateway


@pytest.fixture
def client():
    with TestClient(create_gateway()) as client:
        yield client


def test_itch_preflight_accepts_json_and_tunnel_header(client):
    result = client.options(
        "/api/recognize",
        headers={
            "Origin": "https://html-classic.itch.zone",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,ngrok-skip-browser-warning",
        },
    )
    assert result.status_code == 200
    assert result.headers["access-control-allow-origin"] == "https://html-classic.itch.zone"
    rejected = client.options(
        "/api/recognize",
        headers={"Origin": "https://unrelated.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in rejected.headers


def test_only_recognition_routes_are_exposed(client):
    for path in [
        "/api/hint",
        "/api/voice",
        "/.env",
        "/docs",
        "/openapi.json",
        "/sign_language_numbers_letters.h5",
    ]:
        assert client.get(path).status_code == 404
        assert client.post(path).status_code == 404


def test_gateway_forwards_landmarks_and_preserves_unverified_result(client):
    def handler(request):
        assert str(request.url) == "http://127.0.0.1:8100/api/recognize"
        assert request.content == b'{"frames":[1]}'
        return httpx.Response(200, json={"sign": "A", "confidence": 0.91, "verified": False})

    client.app.state.http = httpx.AsyncClient(
        base_url="http://127.0.0.1:8100", transport=httpx.MockTransport(handler)
    )
    result = client.post(
        "/api/recognize",
        content=b'{"frames":[1]}',
        headers={"Origin": "https://html-classic.itch.zone"},
    )
    assert result.json() == {"sign": "A", "confidence": 0.91, "verified": False}
    assert result.headers["cache-control"] == "no-store"
    assert result.headers["access-control-allow-origin"] == "https://html-classic.itch.zone"


def test_gateway_limits_payload_and_preserves_rate_limit(client):
    assert client.post("/api/recognize", content=b"x" * 150001).status_code == 413
    client.app.state.http = httpx.AsyncClient(
        base_url="http://127.0.0.1:8100",
        transport=httpx.MockTransport(
            lambda _: httpx.Response(429, json={"detail": "Wait"}, headers={"Retry-After": "60"})
        ),
    )
    result = client.post("/api/recognition/warmup")
    assert result.status_code == 429 and result.headers["retry-after"] == "60"


def test_unavailable_model_has_clear_failure(client):
    def handler(request):
        raise httpx.ConnectError("private network details", request=request)

    client.app.state.http = httpx.AsyncClient(
        base_url="http://127.0.0.1:8100", transport=httpx.MockTransport(handler)
    )
    result = client.post("/api/recognition/warmup")
    assert result.status_code == 503 and result.json()["ready"] is False
    assert "private" not in result.text
