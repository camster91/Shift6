import type { Ionicons } from '@expo/vector-icons';

/**
 * Semantic SHIFT6 icon names are the app-facing contract. The current glyphs
 * are temporary platform-safe fallbacks until the reviewed Figma icon family
 * is exported into assets/icons. Screens should depend on these names rather
 * than on a third-party glyph name.
 */
export const shift6IconGlyphs = {
  add: 'add-outline',
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',
  barbell: 'barbell-outline',
  cardio: 'bicycle-outline',
  checkmark: 'checkmark',
  checkmarkCircle: 'checkmark-circle-outline',
  chevronForward: 'chevron-forward',
  cloudOffline: 'cloud-offline-outline',
  coach: 'sparkles-outline',
  construct: 'construct-outline',
  create: 'create-outline',
  document: 'document-text-outline',
  flash: 'flash-outline',
  health: 'heart-outline',
  home: 'home-outline',
  mobility: 'body-outline',
  options: 'options-outline',
  profile: 'person-outline',
  programs: 'grid-outline',
  progress: 'analytics-outline',
  refresh: 'refresh-outline',
  reorder: 'reorder-three-outline',
  ribbon: 'ribbon-outline',
  search: 'search-outline',
  share: 'share-outline',
  shieldCheck: 'shield-checkmark-outline',
  sync: 'sync-outline',
  timer: 'timer-outline',
  trash: 'trash-outline',
  trendingUp: 'trending-up-outline',
  warning: 'warning-outline',
} as const satisfies Record<string, keyof typeof Ionicons.glyphMap>;

export type Shift6IconName = keyof typeof shift6IconGlyphs;

export const iconography = Object.freeze({
  source: 'assets/icons',
  fallback: 'Ionicons',
  names: Object.keys(shift6IconGlyphs) as Shift6IconName[],
});
