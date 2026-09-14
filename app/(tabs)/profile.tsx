import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, OfflineBanner, Screen, Text } from '../../src/components/ui';
import { equipmentCatalog } from '../../src/domain/equipment';
import { demoUser } from '../../src/domain/fixtures/home';
import { preferredTrainingTimeOptions } from '../../src/domain/onboarding';
import { useLocalDatabase } from '../../src/db/context';
import { deleteLocalUserData, exportLocalUserData } from '../../src/db/privacyRepository';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { colors, radii, spacing } from '../../src/design/tokens';
import { useSyncRuntime } from '../../src/services/SyncRuntimeProvider';

export default function ProfileScreen() {
  const database = useLocalDatabase();
  const syncRuntime = useSyncRuntime();
  const [user, setUser] = useState(demoUser);
  const [equipmentIds, setEquipmentIds] = useState(demoUser.equipmentIds);
  const [privacyBusy, setPrivacyBusy] = useState<'export' | 'delete' | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!database) return;

    let active = true;
    void getOnboardingProfile(database, 'guest-user')
      .then((profile) => {
        if (!active || !profile) return;
        setUser(profile.user);
        setEquipmentIds(profile.user.equipmentIds);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [database]);

  const selectedEquipment = equipmentCatalog.filter((equipment) =>
    equipmentIds.includes(equipment.id),
  );
  const preferredTimeLabel =
    preferredTrainingTimeOptions.find((option) => option.value === user.preferredTrainingTime)
      ?.label ?? 'Training time not set';
  const syncStatus =
    syncRuntime.connectivity === 'offline'
      ? ('offline' as const)
      : syncRuntime.state === 'syncing'
        ? ('syncing' as const)
        : syncRuntime.state === 'failed' || syncRuntime.state === 'partial'
          ? ('sync-failed' as const)
          : null;

  const handleExport = async () => {
    if (!database) {
      setPrivacyMessage('Web preview: local data export is available on native builds.');
      return;
    }

    setPrivacyBusy('export');
    setPrivacyMessage(null);
    try {
      const data = await exportLocalUserData(database, 'guest-user', new Date().toISOString());
      await Share.share({
        title: 'SHIFT6 data export',
        message: JSON.stringify(data, null, 2),
      });
      setPrivacyMessage('Your local export is ready to share.');
    } catch {
      setPrivacyMessage('We could not prepare the local export.');
    } finally {
      setPrivacyBusy(null);
    }
  };

  const handleDelete = () => {
    if (!database) {
      setPrivacyMessage('Web preview: local deletion is available on native builds.');
      return;
    }

    if (Platform.OS === 'web') {
      setPrivacyMessage('Web preview: local deletion is available on native builds.');
      return;
    }

    Alert.alert(
      'Delete local data?',
      'This removes the guest profile, equipment, cycles, workout history, proposals, and pending sync data from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete local data',
          style: 'destructive',
          onPress: () => void performLocalDelete(),
        },
      ],
    );
  };

  const performLocalDelete = async () => {
    if (!database) return;

    setPrivacyBusy('delete');
    setPrivacyMessage(null);
    try {
      await deleteLocalUserData(database, 'guest-user');
      setUser({ ...demoUser, displayName: 'Guest', equipmentIds: [] });
      setEquipmentIds([]);
      setPrivacyMessage('Local data was deleted from this device.');
    } catch {
      setPrivacyMessage('We could not delete local data.');
    } finally {
      setPrivacyBusy(null);
    }
  };

  return (
    <Screen>
      <Text variant="caption" tone="muted">
        PROFILE
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Make training fit.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Your goals, equipment, schedule, and preferences shape the plan.
      </Text>

      {syncStatus ? <OfflineBanner status={syncStatus} /> : null}

      <Card tone="ink" style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text variant="h2">{getInitials(user.displayName)}</Text>
        </View>
        <Text variant="h2" tone="inverse" style={styles.profileName}>
          {user.displayName}
        </Text>
        <Text variant="small" style={styles.profileMeta}>
          {user.experience} · {user.preferredSessionMinutes}-minute sessions · {preferredTimeLabel}{' '}
          · {user.unitSystem}
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Equipment on hand
      </Text>
      <Card tone="white" style={styles.equipmentCard}>
        <View style={styles.chips}>
          {selectedEquipment.slice(0, 6).map((equipment) => (
            <Chip key={equipment.id} label={equipment.name} selected />
          ))}
          {selectedEquipment.length > 6 ? (
            <Chip label={`+${selectedEquipment.length - 6} more`} selected />
          ) : null}
        </View>
        <Text variant="small" tone="muted" style={styles.equipmentHint}>
          Equipment availability will filter programs and rank substitutions.
        </Text>
      </Card>

      <Button
        label="Edit setup"
        variant="secondary"
        icon={<Ionicons name="options-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/onboarding')}
        style={styles.editSetupButton}
      />

      <Card tone="blue" style={styles.settingsCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.ink} />
        <Text variant="h3" style={styles.settingsTitle}>
          Local-first by default.
        </Text>
        <Text variant="body" tone="muted">
          Workout data is designed to remain useful on the device before any account or cloud sync
          is connected.
        </Text>
      </Card>

      <Button
        label="Manage health connections"
        variant="secondary"
        icon={<Ionicons name="heart-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/health')}
        style={styles.healthButton}
      />

      <Button
        label="Manage notifications"
        variant="secondary"
        icon={<Ionicons name="notifications-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/notifications')}
        style={styles.notificationsButton}
      />

      <Text variant="h2" style={styles.sectionTitle}>
        Data & privacy
      </Text>
      <Card tone="white" style={styles.privacyCard}>
        <Text variant="smallMedium">Your training record stays yours.</Text>
        <Text variant="small" tone="muted" style={styles.privacyCopy}>
          Export or remove the local guest data stored on this device. Remote account deletion will
          be added when account services are connected.
        </Text>
        <Button
          label="Export local data"
          variant="secondary"
          loading={privacyBusy === 'export'}
          disabled={privacyBusy !== null && privacyBusy !== 'export'}
          icon={<Ionicons name="share-outline" size={18} color={colors.ink} />}
          onPress={() => void handleExport()}
          style={styles.privacyButton}
        />
        <Button
          label="Delete local data"
          variant="ghost"
          loading={privacyBusy === 'delete'}
          disabled={privacyBusy !== null && privacyBusy !== 'delete'}
          icon={<Ionicons name="trash-outline" size={18} color={colors.error} />}
          onPress={handleDelete}
          style={styles.deleteButton}
        />
        {privacyMessage ? (
          <Text variant="caption" tone="muted" style={styles.privacyMessage}>
            {privacyMessage}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return initials.toUpperCase() || 'G';
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  profileCard: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    marginTop: spacing.md,
  },
  profileMeta: {
    color: colors.rest,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  equipmentCard: {
    padding: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  equipmentHint: {
    marginTop: spacing.md,
  },
  settingsCard: {
    marginTop: spacing.xl,
  },
  editSetupButton: {
    marginTop: spacing.xl,
  },
  healthButton: {
    marginTop: spacing.md,
  },
  notificationsButton: {
    marginTop: spacing.md,
  },
  settingsTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  privacyCard: {
    marginBottom: spacing.xl,
  },
  privacyCopy: {
    marginTop: spacing.xs,
  },
  privacyButton: {
    marginTop: spacing.lg,
  },
  deleteButton: {
    marginTop: spacing.xs,
  },
  privacyMessage: {
    marginTop: spacing.md,
  },
});
