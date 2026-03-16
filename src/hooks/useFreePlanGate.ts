import { useState, useCallback } from "react";
import { useSubscription } from "./useSubscription";

export function useFreePlanGate() {
  const { hasActivePlan, isLoading, plan } = useSubscription();
  const [showGate, setShowGate] = useState(false);

  // Only gate users who have NO plan at all (truly free).
  // Co-Founder, Aristotle, and TimeWarp OG users must never see the gate.
  const isFreeUser = !isLoading && !hasActivePlan && !plan;

  const openGate = useCallback(() => {
    if (!isFreeUser) return; // extra safety: never open for paid users
    setShowGate(true);
  }, [isFreeUser]);
  const closeGate = useCallback(() => setShowGate(false), []);

  return { isFreeUser, showGate, openGate, closeGate };
}
