"""Procedural rule engine: turns a district profile into a gesture sequence."""

import random

from app.data.districts import District
from app.data.gestures import GESTURES, get_gesture
from app.models.task import SequenceStep
from app.services.difficulty import TierProfile


def build_sequence(
    district: District,
    profile: TierProfile,
    rng: random.Random | None = None,
) -> list[SequenceStep]:
    """Pick the gestures for a mission, padding from the global pool if needed.

    The district's own sign pool always comes first so the mission stays
    thematically tied to the arrondissement described in PLAN.md.
    """
    rng = rng or random.Random()
    keys = list(district.signPool[: profile.sequenceLength])
    if len(keys) < profile.sequenceLength:
        filler = [k for k in GESTURES if k not in keys]
        rng.shuffle(filler)
        keys.extend(filler[: profile.sequenceLength - len(keys)])

    steps = []
    for index, key in enumerate(keys, start=1):
        gesture = get_gesture(key)
        steps.append(
            SequenceStep(
                step=index,
                gestureKey=gesture.key,
                displayName=gesture.displayName,
                holdDurationSec=profile.holdDurationSec,
                minConfidence=profile.minConfidence,
                guideInstructions=gesture.guideInstructions,
            )
        )
    return steps
