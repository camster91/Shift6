import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, radii, spacing, touchTargets } from '../../design/tokens';
import { Text } from './Text';

export type NavigationIcon = keyof typeof Ionicons.glyphMap;

export interface BottomNavigationItem {
  key: string;
  label: string;
  icon: NavigationIcon;
}

export interface BottomNavigationProps {
  items: readonly BottomNavigationItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function BottomNavigation({ items, activeKey, onSelect }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.item,
                selected && styles.selectedItem,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={item.icon} size={22} color={selected ? colors.ink : colors.white} />
              {selected ? (
                <Text variant="caption" style={styles.selectedText}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  bar: {
    minHeight: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...elevation.floating,
  },
  item: {
    minWidth: touchTargets.standard,
    minHeight: touchTargets.standard,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  selectedItem: {
    backgroundColor: colors.lavender,
  },
  selectedText: {
    color: colors.ink,
  },
  pressed: {
    opacity: 0.78,
  },
});
