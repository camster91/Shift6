import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Prefer stillness until the platform preference has been read successfully. */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      if (active) setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active && !preferenceChanged) setReducedMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
