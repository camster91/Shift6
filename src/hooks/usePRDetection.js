import { useState, useCallback } from 'react';
import { useShift6Data } from '../context/Shift6DataContext';

/**
 * usePRDetection — Watches for personal-record-breaking lifts during a session.
 * Returns the current celebration (null when none) and a checkPR function.
 *
 * Threshold is 2% over the stored 1RM to avoid flagging rounding noise.
 */
export function usePRDetection() {
  const { estimated1RMs } = useShift6Data();
  const [celebration, setCelebration] = useState(null);

  const checkPR = useCallback((exerciseId, weight, reps) => {
    const current1RM = estimated1RMs[exerciseId] || 0;
    if (current1RM === 0) return false;
    const new1RM = Math.round(weight * (1 + 0.0333 * reps));
    if (new1RM > current1RM * 1.02) {
      setCelebration('pr');
      return true;
    }
    return false;
  }, [estimated1RMs]);

  return { celebration, setCelebration, checkPR };
}
