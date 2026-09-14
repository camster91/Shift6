import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button, Card, IconButton, LoadingSkeleton, Screen, Text } from '../src/components/ui';
import {
  createDefaultNotificationPreferences,
  hasEnabledNotificationPreferences,
  notificationPreferenceOptions,
  setNotificationPreference,
} from '../src/domain/notifications';
import type { NotificationPreference, NotificationPreferenceKey } from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../src/db/notificationRepository';
import { colors, spacing } from '../src/design/tokens';
import {
  createExpoNotificationProvider,
  type NotificationPermissionStatus,
} from '../src/services/notifications';

const guestUserId = 'guest-user';
const notificationProvider = createExpoNotificationProvider();

export default function NotificationsSettingsScreen() {
  const database = useLocalDatabase();
  const [preferences, setPreferences] = useState<NotificationPreference>(() =>
    createDefaultNotificationPreferences(guestUserId, new Date().toISOString()),
  );
  const [loading, setLoading] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus | null>(
    null,
  );
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void notificationProvider
      .getPermissionStatus()
      .then((status) => {
        if (active) setPermissionStatus(status);
      })
      .catch(() => {
        if (active) setPermissionStatus('unavailable');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void getNotificationPreferences(database, guestUserId)
      .then((savedPreferences) => {
        if (active) setPreferences(savedPreferences);
      })
      .catch(() => {
        if (active) setMessage('We could not load your saved notification settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database]);

  const updatePreference = (key: NotificationPreferenceKey, value: boolean) => {
    setPreferences((current) =>
      setNotificationPreference(current, key, value, new Date().toISOString()),
    );
    setMessage(null);
  };

  const handleSave = async () => {
    setMessage(null);
    if (!database) {
      setMessage('Changes are preview-only in this web surface.');
      return;
    }

    setSaving(true);
    try {
      await saveNotificationPreferences(database, preferences);
      setMessage('Notification preferences saved on this device.');
    } catch {
      setMessage('We could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionRequest = async () => {
    setPermissionBusy(true);
    setMessage(null);
    try {
      const status = await notificationProvider.requestPermission();
      setPermissionStatus(status);
      setMessage(
        status === 'granted'
          ? 'Device notifications are allowed.'
          : status === 'denied'
            ? 'Device notifications are denied. You can change this in system settings.'
            : status === 'unavailable'
              ? 'Native notification delivery is not available in this preview.'
              : 'Device notification permission has not been granted yet.',
      );
    } catch {
      setPermissionStatus('unavailable');
      setMessage('We could not check device notification permission.');
    } finally {
      setPermissionBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Text variant="caption" tone="muted">
          NOTIFICATIONS
        </Text>
        <LoadingSkeleton height={58} style={styles.loadingTitle} />
        <LoadingSkeleton height={180} style={styles.loadingCard} />
        <LoadingSkeleton height={180} style={styles.loadingCard} />
      </Screen>
    );
  }

  const enabledCount = notificationPreferenceOptions.filter(({ key }) => preferences[key]).length;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Profile"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          NOTIFICATIONS
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Keep training in view.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Choose the moments where a gentle SHIFT6 nudge would be useful. You can change these at any
        time.
      </Text>

      <Card
        tone="blue"
        style={styles.permissionCard}
        accessibilityLabel={`Notification permission: ${formatPermissionStatus(permissionStatus)}`}
      >
        <View style={styles.permissionHeader}>
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
          <Text variant="smallMedium">{formatPermissionStatus(permissionStatus)}</Text>
        </View>
        <Text variant="h3" style={styles.cardTitle}>
          Device permission comes first.
        </Text>
        <Text variant="small" tone="muted" style={styles.cardCopy}>
          SHIFT6 will not send notifications until you approve device access. Core workout logging
          never depends on notifications.
        </Text>
        {permissionStatus === 'not-determined' ? (
          <Button
            label="Allow device notifications"
            variant="secondary"
            loading={permissionBusy}
            disabled={permissionBusy}
            onPress={() => void handlePermissionRequest()}
            style={styles.permissionButton}
          />
        ) : null}
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="h2">Your choices</Text>
          <Text variant="small" tone="muted" style={styles.sectionCopy}>
            {enabledCount === 0
              ? 'All notification categories are currently off.'
              : `${enabledCount} of ${notificationPreferenceOptions.length} categories selected.`}
          </Text>
        </View>
        <Ionicons
          name={
            hasEnabledNotificationPreferences(preferences) ? 'checkmark-circle' : 'moon-outline'
          }
          size={24}
          color={hasEnabledNotificationPreferences(preferences) ? colors.success : colors.inkMuted}
        />
      </View>

      <Card tone="white" style={styles.preferencesCard}>
        {notificationPreferenceOptions.map((option, index) => {
          const enabled = preferences[option.key];
          return (
            <View
              key={option.key}
              style={[styles.preferenceRow, index > 0 ? styles.preferenceRowBorder : undefined]}
            >
              <View style={styles.preferenceCopy}>
                <Text variant="smallMedium">{option.label}</Text>
                <Text variant="caption" tone="muted" style={styles.preferenceDescription}>
                  {option.description}
                </Text>
              </View>
              <Switch
                accessibilityLabel={`${option.label}: ${enabled ? 'On' : 'Off'}`}
                accessibilityState={{ checked: enabled }}
                onValueChange={(value) => updatePreference(option.key, value)}
                thumbColor={enabled ? colors.white : colors.inkMuted}
                trackColor={{ false: colors.rest, true: colors.ink }}
                value={enabled}
              />
            </View>
          );
        })}
      </Card>

      <Button
        label="Save notification choices"
        loading={saving}
        disabled={saving}
        onPress={() => void handleSave()}
        style={styles.saveButton}
      />
      {message ? (
        <Text variant="caption" tone="muted" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <Text variant="caption" tone="muted" style={styles.previewNote}>
        {database
          ? 'Saved locally and queued for authenticated sync when an account service is connected.'
          : 'Web preview: controls are interactive, but native settings are not persisted.'}
      </Text>
    </Screen>
  );
}

function formatPermissionStatus(status: NotificationPermissionStatus | null): string {
  switch (status) {
    case 'granted':
      return 'Allowed';
    case 'denied':
      return 'Denied';
    case 'not-determined':
      return 'Not requested';
    case 'unavailable':
      return 'Unavailable in this preview';
    default:
      return 'Checking permission';
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    marginTop: spacing.xxxl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  permissionCard: {
    marginTop: spacing.xl,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    marginTop: spacing.md,
  },
  cardCopy: {
    marginTop: spacing.xs,
  },
  permissionButton: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCopy: {
    marginTop: spacing.xs,
  },
  preferencesCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  preferenceRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  preferenceRowBorder: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceDescription: {
    marginTop: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
  },
  previewNote: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.lg,
  },
});
