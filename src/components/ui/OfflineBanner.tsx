import { StyleSheet, View } from 'react-native';

import type { Shift6IconName } from '../../design/iconography';
import { colors, radii, spacing } from '../../design/tokens';
import { Shift6Icon } from './Shift6Icon';
import { Text } from './Text';

export type OfflineStatus = 'offline' | 'syncing' | 'sync-failed';

export interface OfflineBannerProps {
  status: OfflineStatus;
}

const copy: Record<OfflineStatus, { title: string; message: string; icon: Shift6IconName }> = {
  offline: {
    title: 'Offline mode',
    message: 'Workout logging is available. We’ll sync when you reconnect.',
    icon: 'cloudOffline',
  },
  syncing: {
    title: 'Syncing',
    message: 'Your local workout data is being backed up.',
    icon: 'sync',
  },
  'sync-failed': {
    title: 'Sync paused',
    message: 'Your workout is safe on this device. We’ll retry later.',
    icon: 'warning',
  },
};

export function OfflineBanner({ status }: OfflineBannerProps) {
  const state = copy[status];

  return (
    <View
      accessibilityLabel={`${state.title}. ${state.message}`}
      accessibilityRole="alert"
      style={styles.banner}
    >
      <Shift6Icon name={state.icon} size={20} color={colors.ink} />
      <View style={styles.copy}>
        <Text variant="smallMedium">{state.title}</Text>
        <Text variant="caption" tone="muted">
          {state.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.md,
    backgroundColor: colors.yellow,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
