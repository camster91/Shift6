import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Program } from '../../domain/types';
import { colors, radii, spacing } from '../../design/tokens';
import { Card } from './Card';
import { Chip } from './Chip';
import { Text } from './Text';

export interface ProgramCardProps {
  program: Program;
  onPress?: () => void;
  statusLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgramCard({ program, onPress, statusLabel, style }: ProgramCardProps) {
  const content = (
    <Card
      tone="white"
      style={[styles.card, style]}
      accessibilityLabel={`${program.title}. ${program.description}`}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="barbell-outline" size={22} color={colors.ink} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="h3">{program.title}</Text>
          <Text variant="small" tone="muted">
            {program.targetUser}
          </Text>
        </View>
      </View>
      <Text variant="body" style={styles.description}>
        {program.description}
      </Text>
      <View style={styles.chips}>
        <Chip label={`${program.daysPerWeek} days`} />
        <Chip label={`${program.sessionLengthMinutes} min`} />
        <Chip label="6 weeks" selected />
        {statusLabel ? <Chip label={statusLabel} /> : null}
      </View>
      {onPress ? (
        <View style={styles.actionRow}>
          <Text variant="smallMedium">View program</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.ink} />
        </View>
      ) : null}
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityHint="Opens program details"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  description: {
    marginTop: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.82,
  },
});
