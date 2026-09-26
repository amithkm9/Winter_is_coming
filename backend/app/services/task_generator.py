"""Task Generation Controller: district profile -> validated mission payload."""

import random
import re

import httpx

from app.core.config import Settings
from app.data.districts import get_district
from app.models.task import MissionPayload
from app.services.difficulty import profile_for_district
from app.services.narrative import generate_narrative
from app.services.procedural import build_sequence


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


async def generate_mission(
    district_id: int,
    rng: random.Random | None = None,
    config: Settings | None = None,
    client: httpx.AsyncClient | None = None,
) -> MissionPayload:
    district = get_district(district_id)
    profile = profile_for_district(district_id)
    sequence = build_sequence(district, profile, rng)
    narrative = await generate_narrative(
        district, profile.tier, sequence, config=config, client=client
    )

    return MissionPayload(
        taskId=f"task-arr-{district_id:02d}-{_slug(district.name)}",
        districtId=district.id,
        districtName=district.name,
        bossNode=district.bossNode,
        difficultyTier=profile.tier,
        missionType=profile.missionType,
        narrative=narrative,
        requiredSequence=sequence,
        timeLimitSeconds=profile.timeLimitSeconds,
        counterMeasure=profile.counterMeasure,
    )
