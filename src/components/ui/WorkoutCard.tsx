import { Pressable, StyleSheet, View } from 'react-native';

import type { Workout } from '../../domain/types';
import { colors, radii, spacing } from '../../design/tokens';
import { Card } from './Card';
import { Shift6Icon } from './Shift6Icon';
import { Text } from './Text';

export interface WorkoutCardProps {
  workout: Workout;
  onPress?: () => void;
  compact?: boolean;
}

export function WorkoutCard({ workout, onPress, compact = false }: WorkoutCardProps) {
  const content = (
    <Card
      tone="white"
      style={[styles.card, compact && styles.compact]}
      accessibilityLabel={`${workout.title}, ${workout.estimatedDurationMinutes} minutes`}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryMark}>
          <Shift6Icon name="flash" size={22} color={colors.ink} />
        </View>
        <View style={styles.copy}>
          <Text variant={compact ? 'bodyMedium' : 'h2'}>{workout.title}</Text>
          <Text variant="small" tone="muted">
            {workout.exercises.length} movements · {workout.estimatedDurationMinutes} min
          </Text>
        </View>
        {onPress ? <Shift6Icon name="chevronForward" size={22} color={colors.inkMuted} /> : null}
      </View>
      {!compact ? (
        <View style={styles.footer}>
          <Text variant="small" tone="muted">
            {workout.focus === 'strength' ? 'Strength session' : `${workout.focus} session`}
          </Text>
          <Text variant="smallMedium">Start workout</Text>
        </View>
      ) : null}
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityHint="Opens the workout"
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
    padding: spacing.xl,
  },
  compact: {
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryMark: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.82,
  },
});
