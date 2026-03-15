import { useState, useCallback } from "react";
import { useSubscription } from "./useSubscription";

export function useFreePlanGate() {
  const { hasActivePlan } = useSubscription();
  const [showGate, setShowGate] = useState(false);

  const isFreeUser = !hasActivePlan;

  const openGate = useCallback(() => setShowGate(true), []);
  const closeGate = useCallback(() => setShowGate(false), []);

  return { isFreeUser, showGate, openGate, closeGate };
}
