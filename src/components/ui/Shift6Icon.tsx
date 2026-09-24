import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

import { shift6IconGlyphs, type Shift6IconName } from '../../design/iconography';
import { colors, iconSizes } from '../../design/tokens';

export interface Shift6IconProps {
  name: Shift6IconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * The single icon rendering boundary. Keeping the semantic name separate from
 * the fallback glyph lets the Figma-approved vector family replace the current
 * temporary icon set without touching domain screens.
 */
export function Shift6Icon({
  name,
  size = iconSizes.medium,
  color = colors.ink,
  accessibilityLabel,
  style,
}: Shift6IconProps) {
  return (
    <Ionicons
      name={shift6IconGlyphs[name]}
      size={size}
      color={color}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      style={style}
    />
  );
}
