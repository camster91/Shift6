export const colors = {
  ink: '#0D101B',
  canvas: '#F8F8F8',
  white: '#FFFFFF',
  lavenderBackground: '#E9E4FF',
  lavender: '#B3A0FF',
  blue: '#A0C6FF',
  mint: '#B9EFC5',
  cyan: '#A8E6EF',
  yellow: '#FFC768',
  coral: '#FFB5A8',
  pink: '#F2A6E8',
  rest: '#E9EAEE',
  inkMuted: '#646775',
  border: '#E3E3E9',
  success: '#18794E',
  warning: '#8B5E00',
  error: '#B42318',
  info: '#175CD3',
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '600' as const },
  h1: { fontSize: 32, lineHeight: 36, fontWeight: '600' as const },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  smallMedium: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const elevation = {
  card: {
    boxShadow: '0px 8px 16px rgba(13, 16, 27, 0.06)',
    elevation: 3,
  },
  floating: {
    boxShadow: '0px 4px 12px rgba(13, 16, 27, 0.14)',
    elevation: 6,
  },
} as const;

export const motion = {
  fast: 150,
  standard: 200,
  slow: 250,
} as const;

export const iconSizes = {
  small: 18,
  medium: 24,
  large: 32,
} as const;

export const touchTargets = {
  compact: 44,
  standard: 48,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  elevation,
  motion,
  iconSizes,
  touchTargets,
} as const;

export type Shift6Theme = typeof theme;
