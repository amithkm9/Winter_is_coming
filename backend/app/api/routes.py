"""REST + WebSocket surface of the task generation engine."""

import asyncio
import contextlib

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.data.districts import DISTRICTS
from app.models.task import GestureAttempt, MissionPayload, MissionSession
from app.services.mission_store import store
from app.services.task_generator import generate_mission

router = APIRouter(prefix="/api")


@router.get("/districts")
async def list_districts() -> list[dict]:
    return [
        {
            "id": d.id,
            "name": d.name,
            "bossNode": d.bossNode,
            "theme": d.theme,
            "signPool": list(d.signPool),
        }
        for d in DISTRICTS.values()
    ]


@router.get("/districts/{district_id}/task", response_model=MissionPayload)
async def get_district_task(district_id: int) -> MissionPayload:
    if district_id not in DISTRICTS:
        raise HTTPException(status_code=404, detail=f"Unknown district {district_id}")
    return await generate_mission(district_id)


@router.post("/districts/{district_id}/missions", response_model=MissionSession)
async def start_mission(district_id: int) -> MissionSession:
    if district_id not in DISTRICTS:
        raise HTTPException(status_code=404, detail=f"Unknown district {district_id}")
    run = store.start(await generate_mission(district_id))
    return MissionSession(**vars(run))


@router.get("/missions/{session_id}", response_model=MissionSession)
async def get_mission(session_id: str) -> MissionSession:
    try:
        run = store.get(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MissionSession(**vars(run))


@router.post("/missions/{session_id}/attempts")
async def submit_attempt(session_id: str, attempt: GestureAttempt) -> dict:
    try:
        return store.submit(session_id, attempt).model_dump()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.websocket("/ws/missions/{session_id}")
async def mission_socket(websocket: WebSocket, session_id: str) -> None:
    """Streams step advancement events for an active mission.

    The vision pipeline (Phase 2) pushes `GestureAttempt` payloads; the server
    replies with the authoritative step state and a terminal mission event.
    """
    await websocket.accept()
    try:
        run = store.get(session_id)
    except KeyError as exc:
        await websocket.close(code=4404, reason=str(exc))
        return

    await websocket.send_json({"event": "MISSION_STARTED",
                               "mission": run.mission.model_dump()})
    deadline = asyncio.get_event_loop().time() + run.mission.timeLimitSeconds
    try:
        while True:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                store.fail(session_id)
                await websocket.send_json({"event": "MISSION_FAILED",
                                           "reason": "TIME_EXPIRED"})
                return
            try:
                raw = await asyncio.wait_for(websocket.receive_json(), timeout=remaining)
            except asyncio.TimeoutError:
                continue

            result = store.submit(session_id, GestureAttempt(**raw))
            await websocket.send_json({"event": "STEP_RESULT", **result.model_dump()})
            if result.completed:
                await websocket.send_json({"event": "DISTRICT_LIBERATED",
                                           "districtId": run.mission.districtId})
                return
    except WebSocketDisconnect:
        return
    finally:
        with contextlib.suppress(RuntimeError):
            await websocket.close()
