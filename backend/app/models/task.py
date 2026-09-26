"""Pydantic schemas for the mission payloads produced by the task engine."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class MissionType(str, Enum):
    SINGLE_SIGN = "SINGLE_SIGN"
    SEQUENCE_CIPHER = "SEQUENCE_CIPHER"
    JAMMED_SEQUENCE = "JAMMED_SEQUENCE"
    APEX_DECRYPTION = "APEX_DECRYPTION"


class CounterMeasure(str, Enum):
    NONE = "NONE"
    VISUAL_STATIC = "VISUAL_STATIC"
    CUE_SCRAMBLE = "CUE_SCRAMBLE"
    CORE_OVERCLOCK = "CORE_OVERCLOCK"


class Narrative(BaseModel):
    handlerBriefing: str
    aiTaunt: str
    cipherRiddle: str
    source: Literal["gemini", "fallback"] = "fallback"


class SequenceStep(BaseModel):
    step: int = Field(ge=1)
    gestureKey: str
    displayName: str
    holdDurationSec: float
    minConfidence: float = Field(ge=0.0, le=1.0)
    guideInstructions: str


class MissionPayload(BaseModel):
    taskId: str
    districtId: int
    districtName: str
    bossNode: str
    difficultyTier: int = Field(ge=1, le=4)
    missionType: MissionType
    narrative: Narrative
    requiredSequence: list[SequenceStep]
    timeLimitSeconds: int
    counterMeasure: CounterMeasure


class MissionSession(BaseModel):
    sessionId: str
    mission: MissionPayload
    currentStep: int
    completed: bool
    failed: bool


class GestureAttempt(BaseModel):
    """A gesture classification result reported by the vision pipeline."""

    gestureKey: str
    confidence: float = Field(ge=0.0, le=1.0)
    holdDurationSec: float = Field(ge=0.0)


class StepResult(BaseModel):
    accepted: bool
    reason: str
    currentStep: int
    totalSteps: int
    completed: bool
    districtLiberated: bool
