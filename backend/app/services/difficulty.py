"""Four-tier difficulty progression curve (PLAN.md section 3.2)."""

from dataclasses import dataclass

from app.models.task import CounterMeasure, MissionType


@dataclass(frozen=True)
class TierProfile:
    tier: int
    missionType: MissionType
    sequenceLength: int
    holdDurationSec: float
    minConfidence: float
    timeLimitSeconds: int
    counterMeasure: CounterMeasure


TIER_PROFILES: dict[int, TierProfile] = {
    1: TierProfile(1, MissionType.SINGLE_SIGN, 1, 1.0, 0.85, 30, CounterMeasure.NONE),
    2: TierProfile(2, MissionType.SEQUENCE_CIPHER, 2, 1.5, 0.85, 20,
                   CounterMeasure.NONE),
    3: TierProfile(3, MissionType.JAMMED_SEQUENCE, 3, 1.5, 0.87, 18,
                   CounterMeasure.VISUAL_STATIC),
    4: TierProfile(4, MissionType.APEX_DECRYPTION, 3, 1.0, 0.9, 15,
                   CounterMeasure.CORE_OVERCLOCK),
}


def tier_for_district(district_id: int) -> int:
    """Districts 1-4 are tier 1, 5-8 tier 2, 9-12 tier 3, 13-16 tier 4."""
    if not 1 <= district_id <= 16:
        raise ValueError(f"District id out of range: {district_id}")
    return (district_id - 1) // 4 + 1


def profile_for_district(district_id: int) -> TierProfile:
    return TIER_PROFILES[tier_for_district(district_id)]
