import random

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.data.districts import get_district
from app.main import app
from app.models.task import CounterMeasure, MissionType
from app.services.difficulty import profile_for_district, tier_for_district
from app.services.narrative import generate_narrative
from app.services.procedural import build_sequence
from app.services.task_generator import generate_mission

client = TestClient(app)


@pytest.mark.parametrize(
    "district_id,tier", [(1, 1), (4, 1), (5, 2), (8, 2), (9, 3), (12, 3), (13, 4), (16, 4)]
)
def test_tier_progression(district_id: int, tier: int) -> None:
    assert tier_for_district(district_id) == tier


def test_tier_boundaries_are_validated() -> None:
    with pytest.raises(ValueError):
        tier_for_district(17)


@pytest.mark.parametrize("district_id", range(1, 17))
def test_sequence_length_matches_tier(district_id: int) -> None:
    profile = profile_for_district(district_id)
    sequence = build_sequence(get_district(district_id), profile, random.Random(0))
    assert len(sequence) == profile.sequenceLength
    assert [s.step for s in sequence] == list(range(1, profile.sequenceLength + 1))
    assert all(s.minConfidence >= 0.85 for s in sequence)


@pytest.mark.asyncio
@pytest.mark.parametrize("district_id", range(1, 17))
async def test_mission_payload_is_offline_deterministic(district_id: int) -> None:
    config = Settings(None, "gemini-2.0-flash", 3.0, ())
    mission = await generate_mission(district_id, random.Random(1), config=config)
    assert mission.districtId == district_id
    assert mission.narrative.source == "fallback"
    assert mission.timeLimitSeconds > 0
    assert mission.taskId.startswith(f"task-arr-{district_id:02d}-")


@pytest.mark.asyncio
async def test_jamming_counter_measures_scale_with_tier() -> None:
    config = Settings(None, "gemini-2.0-flash", 3.0, ())
    tier1 = await generate_mission(1, config=config)
    tier3 = await generate_mission(9, config=config)
    tier4 = await generate_mission(16, config=config)
    assert tier1.missionType is MissionType.SINGLE_SIGN
    assert tier1.counterMeasure is CounterMeasure.NONE
    assert tier3.counterMeasure is CounterMeasure.VISUAL_STATIC
    assert tier4.counterMeasure is CounterMeasure.CORE_OVERCLOCK


@pytest.mark.asyncio
async def test_gemini_narrative_is_used_when_available() -> None:
    body = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"handlerBriefing": "Go dark, sign fast.",'
                            '"aiTaunt": "You are noise.",'
                            '"cipherRiddle": "Speak without sound."}'
                        }
                    ]
                }
            }
        ]
    }
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=body))
    config = Settings("test-key", "gemini-2.0-flash", 3.0, ())
    district = get_district(7)
    sequence = build_sequence(district, profile_for_district(7), random.Random(0))
    async with httpx.AsyncClient(transport=transport) as mock_client:
        narrative = await generate_narrative(
            district, 2, sequence, config=config, client=mock_client
        )
    assert narrative.source == "gemini"
    assert narrative.aiTaunt == "You are noise."


@pytest.mark.asyncio
async def test_gemini_failure_falls_back() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(500))
    config = Settings("test-key", "gemini-2.0-flash", 3.0, ())
    district = get_district(3)
    sequence = build_sequence(district, profile_for_district(3), random.Random(0))
    async with httpx.AsyncClient(transport=transport) as mock_client:
        narrative = await generate_narrative(
            district, 1, sequence, config=config, client=mock_client
        )
    assert narrative.source == "fallback"
    assert district.bossNode in narrative.aiTaunt


def test_task_endpoint_and_unknown_district() -> None:
    response = client.get("/api/districts/7/task")
    assert response.status_code == 200
    assert response.json()["bossNode"] == "NEXUS-Transmitter"
    assert client.get("/api/districts/99/task").status_code == 404


def test_mission_step_advancement_and_liberation() -> None:
    session = client.post("/api/districts/7/missions").json()
    session_id = session["sessionId"]
    steps = session["mission"]["requiredSequence"]

    rejected = client.post(
        f"/api/missions/{session_id}/attempts",
        json={"gestureKey": steps[0]["gestureKey"], "confidence": 0.5,
              "holdDurationSec": 5.0},
    ).json()
    assert rejected["accepted"] is False
    assert rejected["currentStep"] == 1

    for index, step in enumerate(steps, start=1):
        result = client.post(
            f"/api/missions/{session_id}/attempts",
            json={
                "gestureKey": step["gestureKey"],
                "confidence": step["minConfidence"],
                "holdDurationSec": step["holdDurationSec"],
            },
        ).json()
        assert result["accepted"] is True
        assert result["completed"] is (index == len(steps))

    assert client.get(f"/api/missions/{session_id}").json()["completed"] is True


def test_mission_websocket_streams_step_events() -> None:
    session = client.post("/api/districts/1/missions").json()
    session_id = session["sessionId"]
    step = session["mission"]["requiredSequence"][0]

    with client.websocket_connect(f"/api/ws/missions/{session_id}") as socket:
        assert socket.receive_json()["event"] == "MISSION_STARTED"
        socket.send_json(
            {
                "gestureKey": step["gestureKey"],
                "confidence": 0.99,
                "holdDurationSec": step["holdDurationSec"],
            }
        )
        assert socket.receive_json()["event"] == "STEP_RESULT"
        assert socket.receive_json()["event"] == "DISTRICT_LIBERATED"


def test_unknown_mission_session_returns_404() -> None:
    assert client.get("/api/missions/nope").status_code == 404
