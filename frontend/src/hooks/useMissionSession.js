import { useCallback, useEffect, useState } from 'react';
import { startMission, submitAttempt } from '../services/missionApi';
import { localSignFor } from '../data/signBridge';

/**
 * Runs a district mission against the backend task engine when it is reachable.
 *
 * `online` stays false when the engine cannot be reached, in which case the
 * caller falls back to the district profile baked into data/arrondissements.js.
 */
export function useMissionSession(districtId, enabled) {
  const [session, setSession] = useState(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !districtId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    startMission(districtId).then((run) => {
      if (cancelled) return;
      setSession(run);
      setOnline(Boolean(run));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [districtId, enabled]);

  const currentStep = session
    ? session.mission.requiredSequence[session.currentStep - 1]
    : null;

  /** Reports a held gesture; resolves to the server's step decision. */
  const reportHold = useCallback(
    async (confidencePercent) => {
      if (!session || !currentStep) return null;
      const result = await submitAttempt(session.sessionId, {
        gestureKey: currentStep.gestureKey,
        confidence: Math.min(1, Math.max(0, confidencePercent / 100)),
        holdDurationSec: currentStep.holdDurationSec
      });
      if (!result) {
        setOnline(false);
        return null;
      }
      setSession((prev) =>
        prev ? { ...prev, currentStep: result.currentStep, completed: result.completed } : prev
      );
      return result;
    },
    [session, currentStep]
  );

  return {
    online,
    loading,
    mission: session?.mission ?? null,
    currentStep,
    stepIndex: session ? session.currentStep - 1 : 0,
    totalSteps: session ? session.mission.requiredSequence.length : 0,
    targetSignId: currentStep ? localSignFor(currentStep.gestureKey) : null,
    reportHold
  };
}
