import { useState, useCallback } from "react";
import { useSubscription } from "./useSubscription";

export function useFreePlanGate() {
  const { hasActivePlan, isLoading, plan } = useSubscription();
  const [showGate, setShowGate] = useState(false);

  // Only gate users who have NO plan at all (truly free).
  // Co-Founder, Aristotle, and TimeWarp OG users must never see the gate.
  // While loading, treat as potentially free to prevent bypassing the gate.
  const isFreeUser = isLoading ? null : (!hasActivePlan && !plan);

  /** Returns true if the user should be blocked (free or still loading). */
  const shouldBlock = useCallback((): boolean => {
    // Block if still loading (fail-safe) or confirmed free
    return isFreeUser === null || isFreeUser === true;
  }, [isFreeUser]);

  const openGate = useCallback(() => {
    if (isFreeUser === false) return; // extra safety: never open for paid users
    setShowGate(true);
  }, [isFreeUser]);
  const closeGate = useCallback(() => setShowGate(false), []);

  return { isFreeUser, shouldBlock, showGate, openGate, closeGate };
}
