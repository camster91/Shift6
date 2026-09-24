import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii } from '../../design/tokens';

export interface LoadingSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  radius = radii.sm,
  style,
}: LoadingSkeletonProps) {
  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.base, { width, height, borderRadius: radius }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.rest,
  },
});
