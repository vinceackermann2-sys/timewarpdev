import { useState, useCallback } from "react";
import { useSubscription } from "./useSubscription";

export function useFreePlanGate() {
  const { hasActivePlan, isLoading } = useSubscription();
  const [showGate, setShowGate] = useState(false);

  // Don't gate while loading — prevents flash for paid users
  const isFreeUser = !isLoading && !hasActivePlan;

  const openGate = useCallback(() => setShowGate(true), []);
  const closeGate = useCallback(() => setShowGate(false), []);

  return { isFreeUser, showGate, openGate, closeGate };
}
