"""In-memory mission session store driving real-time step advancement.

Phase 4 owns the persistent game state; this store only tracks the progress of
an active mission so the client and the vision pipeline agree on which step of
the cipher is currently expected.
"""

import uuid
from dataclasses import dataclass

from app.models.task import GestureAttempt, MissionPayload, StepResult


@dataclass
class MissionRun:
    sessionId: str
    mission: MissionPayload
    currentStep: int = 1
    completed: bool = False
    failed: bool = False


class MissionStore:
    def __init__(self) -> None:
        self._runs: dict[str, MissionRun] = {}

    def start(self, mission: MissionPayload) -> MissionRun:
        run = MissionRun(sessionId=str(uuid.uuid4()), mission=mission)
        self._runs[run.sessionId] = run
        return run

    def get(self, session_id: str) -> MissionRun:
        try:
            return self._runs[session_id]
        except KeyError as exc:
            raise KeyError(f"Unknown mission session: {session_id}") from exc

    def submit(self, session_id: str, attempt: GestureAttempt) -> StepResult:
        run = self.get(session_id)
        total = len(run.mission.requiredSequence)
        if run.completed or run.failed:
            return StepResult(
                accepted=False,
                reason="Mission already resolved.",
                currentStep=run.currentStep,
                totalSteps=total,
                completed=run.completed,
                districtLiberated=run.completed,
            )

        expected = run.mission.requiredSequence[run.currentStep - 1]
        if attempt.gestureKey != expected.gestureKey:
            reason = f"Expected {expected.displayName}, detected {attempt.gestureKey}."
        elif attempt.confidence < expected.minConfidence:
            reason = (
                f"Confidence {attempt.confidence:.2f} below "
                f"{expected.minConfidence:.2f}."
            )
        elif attempt.holdDurationSec < expected.holdDurationSec:
            reason = (
                f"Hold {attempt.holdDurationSec:.1f}s below required "
                f"{expected.holdDurationSec:.1f}s."
            )
        else:
            run.currentStep += 1
            if run.currentStep > total:
                run.currentStep = total
                run.completed = True
            return StepResult(
                accepted=True,
                reason="Sign accepted.",
                currentStep=run.currentStep,
                totalSteps=total,
                completed=run.completed,
                districtLiberated=run.completed,
            )

        return StepResult(
            accepted=False,
            reason=reason,
            currentStep=run.currentStep,
            totalSteps=total,
            completed=False,
            districtLiberated=False,
        )

    def fail(self, session_id: str) -> MissionRun:
        run = self.get(session_id)
        if not run.completed:
            run.failed = True
        return run


store = MissionStore()
