export const movementConsiderationOptions = [
  {
    value: 'avoid-impact',
    label: 'Avoid impact',
    description: 'Prefer plans and substitutions without jumping or repeated impact.',
  },
  {
    value: 'avoid-overhead',
    label: 'Avoid overhead work',
    description: 'Flag overhead pressing or reaching for review before training.',
  },
  {
    value: 'avoid-floor-transitions',
    label: 'Avoid floor transitions',
    description: 'Prefer movements that do not require frequent getting down to the floor.',
  },
  {
    value: 'avoid-deep-knee-bend',
    label: 'Limit deep knee bend',
    description: 'Flag deep squat and lunge ranges for review or substitution.',
  },
  {
    value: 'avoid-single-leg-balance',
    label: 'Avoid unsupported balance work',
    description: 'Prefer stable bilateral or supported movements when possible.',
  },
] as const;

export type MovementConsideration = (typeof movementConsiderationOptions)[number]['value'];

export const accessibilityNeedOptions = [
  {
    value: 'larger-text',
    label: 'Larger text',
    description: 'I rely on larger text or display scaling.',
  },
  {
    value: 'screen-reader',
    label: 'Screen reader',
    description: 'I use VoiceOver, TalkBack, or another screen reader.',
  },
  {
    value: 'reduced-motion',
    label: 'Reduced motion',
    description: 'I prefer interfaces that minimize non-essential motion.',
  },
  {
    value: 'high-contrast',
    label: 'Higher contrast',
    description: 'I benefit from strong visual contrast and non-colour status cues.',
  },
  {
    value: 'audio-cues',
    label: 'Audio cues',
    description: 'Audio cues can make timers and workout state easier to follow.',
  },
  {
    value: 'haptic-cues',
    label: 'Haptic cues',
    description: 'Haptic cues can make timers and workout state easier to follow.',
  },
] as const;

export type AccessibilityNeed = (typeof accessibilityNeedOptions)[number]['value'];

export interface UserConsiderations {
  userId: string;
  movementConsiderations: MovementConsideration[];
  accessibilityNeeds: AccessibilityNeed[];
  updatedAt: string;
}

const movementValues = new Set<string>(movementConsiderationOptions.map((option) => option.value));
const accessibilityValues = new Set<string>(
  accessibilityNeedOptions.map((option) => option.value),
);

export function createEmptyUserConsiderations(
  userId: string,
  updatedAt: string,
): UserConsiderations {
  return { userId, movementConsiderations: [], accessibilityNeeds: [], updatedAt };
}

export function normalizeMovementConsiderations(
  values: readonly unknown[],
): MovementConsideration[] {
  return uniqueKnown(values, movementValues) as MovementConsideration[];
}

export function normalizeAccessibilityNeeds(values: readonly unknown[]): AccessibilityNeed[] {
  return uniqueKnown(values, accessibilityValues) as AccessibilityNeed[];
}

function uniqueKnown(values: readonly unknown[], allowed: ReadonlySet<string>): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string => typeof value === 'string' && allowed.has(value),
      ),
    ),
  ];
}
