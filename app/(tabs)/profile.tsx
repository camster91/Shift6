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
import { deleteAuthenticatedAccount } from '../../src/services/accountDeletion';
import { useAppServices } from '../../src/services/AppServicesProvider';
import { useSyncRuntime } from '../../src/services/SyncRuntimeProvider';
import { useUserIdentity } from '../../src/services/UserIdentityProvider';

type PrivacyBusy = 'export' | 'local-delete' | 'account-delete' | 'account-cleanup';
type AccountCleanupState = 'none' | 'local-data' | 'sign-out';

export default function ProfileScreen() {
  const database = useLocalDatabase();
  const { auth, backend } = useAppServices();
  const syncRuntime = useSyncRuntime();
  const identity = useUserIdentity();
  const userId = identity.userId;
  const [user, setUser] = useState(demoUser);
  const [equipmentIds, setEquipmentIds] = useState(demoUser.equipmentIds);
  const [privacyBusy, setPrivacyBusy] = useState<PrivacyBusy | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [accountCleanupState, setAccountCleanupState] = useState<AccountCleanupState>('none');

  useEffect(() => {
    if (!database) return;

    let active = true;
    void getOnboardingProfile(database, userId)
      .then((profile) => {
        if (!active || !profile) return;
        setUser(profile.user);
        setEquipmentIds(profile.user.equipmentIds);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [database, userId]);

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
        : syncRuntime.state === 'conflict'
          ? ('sync-conflict' as const)
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
      const data = await exportLocalUserData(database, userId, new Date().toISOString());
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

  const handleLocalDelete = () => {
    if (!database || Platform.OS === 'web') {
      setPrivacyMessage('Web preview: local deletion is available on native builds.');
      return;
    }

    Alert.alert(
      'Delete local data?',
      'This removes the guest profile, preferences, equipment, body metrics, cycles, workout history, proposals, and pending sync data from this device. It cannot be undone.',
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

    setPrivacyBusy('local-delete');
    setPrivacyMessage(null);
    try {
      await deleteLocalUserData(database, userId);
      resetDisplayedLocalProfile();
      setPrivacyMessage('Local data was deleted from this device.');
    } catch {
      setPrivacyMessage('We could not delete local data.');
    } finally {
      setPrivacyBusy(null);
    }
  };

  const handleAccountDelete = () => {
    if (!database || Platform.OS === 'web') {
      setPrivacyMessage('Account deletion must be completed from a native authenticated build.');
      return;
    }

    Alert.alert(
      'Delete your SHIFT6 account?',
      'SHIFT6 will first require the authenticated server to confirm account deletion. Only after that confirmation will this device clear the local training record and sign out. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => void performAccountDelete(),
        },
      ],
    );
  };

  const performAccountDelete = async () => {
    if (!database || identity.kind !== 'account') return;

    setPrivacyBusy('account-delete');
    setPrivacyMessage(null);
    try {
      const outcome = await deleteAuthenticatedAccount({
        database,
        userId,
        backend,
        auth,
      });

      if (!outcome.localDataDeleted) {
        setAccountCleanupState('local-data');
        setPrivacyMessage(outcome.warnings.join(' '));
        return;
      }

      resetDisplayedLocalProfile();
      if (!outcome.signedOut) {
        setAccountCleanupState('sign-out');
        setPrivacyMessage(outcome.warnings.join(' '));
        return;
      }

      setAccountCleanupState('none');
      setPrivacyMessage('Your SHIFT6 account and local data were deleted.');
      identity.retry();
    } catch {
      setPrivacyMessage(
        'Remote account deletion was not confirmed. Your local data and sign-in state were left unchanged.',
      );
    } finally {
      setPrivacyBusy(null);
    }
  };

  const finishAccountCleanup = async () => {
    if (!database || identity.kind !== 'account' || accountCleanupState === 'none') return;

    setPrivacyBusy('account-cleanup');
    setPrivacyMessage(null);
    try {
      if (accountCleanupState === 'local-data') {
        await deleteLocalUserData(database, userId);
        resetDisplayedLocalProfile();
        setAccountCleanupState('sign-out');
      }

      await auth.signOut();
      setAccountCleanupState('none');
      setPrivacyMessage('Deleted-account cleanup is complete on this device.');
      identity.retry();
    } catch {
      setPrivacyMessage(
        accountCleanupState === 'local-data'
          ? 'The remote account is already deleted, but local cleanup is still incomplete. Try again before signing out.'
          : 'The account and local data are deleted, but this device could not clear the sign-in session. Try again.',
      );
    } finally {
      setPrivacyBusy(null);
    }
  };

  const resetDisplayedLocalProfile = () => {
    setUser({ ...demoUser, displayName: 'Guest', equipmentIds: [] });
    setEquipmentIds([]);
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

      {syncStatus ? (
        <View style={styles.syncStatus}>
          <OfflineBanner status={syncStatus} />
          {syncStatus === 'sync-conflict' ? (
            <Button
              label="Review sync issues"
              variant="ghost"
              onPress={() => router.push('/sync-review')}
              style={styles.syncReviewButton}
            />
          ) : null}
        </View>
      ) : null}

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
      <Button
        label="Manage equipment"
        variant="secondary"
        icon={<Ionicons name="fitness-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/equipment')}
        style={styles.manageEquipmentButton}
      />
      <Button
        label="Movement & accessibility"
        variant="secondary"
        icon={<Ionicons name="accessibility-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/considerations')}
        style={styles.preferenceButton}
      />
      <Button
        label="Manual body metrics"
        variant="secondary"
        icon={<Ionicons name="scale-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/body-metrics')}
        style={styles.preferenceButton}
      />

      <Card tone="blue" style={styles.settingsCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.ink} />
        <Text variant="h3" style={styles.settingsTitle}>
          Local-first by default.
        </Text>
        <Text variant="body" tone="muted">
          Workout data is designed to remain useful on the device before any account or cloud sync
          is connected. Movement/accessibility preferences and manual body metrics also stay local
          until a separate remote privacy policy explicitly opts them in.
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
          {identity.kind === 'account'
            ? 'Export the local record or delete the authenticated account. Remote deletion must be confirmed before SHIFT6 clears this device.'
            : 'Export or remove the local guest data stored on this device.'}
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

        {identity.kind === 'guest' ? (
          <Button
            label="Delete local data"
            variant="ghost"
            loading={privacyBusy === 'local-delete'}
            disabled={privacyBusy !== null && privacyBusy !== 'local-delete'}
            icon={<Ionicons name="trash-outline" size={18} color={colors.error} />}
            onPress={handleLocalDelete}
            style={styles.deleteButton}
          />
        ) : accountCleanupState === 'none' ? (
          <Button
            label="Delete account"
            variant="ghost"
            loading={privacyBusy === 'account-delete'}
            disabled={privacyBusy !== null && privacyBusy !== 'account-delete'}
            icon={<Ionicons name="trash-outline" size={18} color={colors.error} />}
            accessibilityHint="Requests authenticated remote account deletion before clearing this device."
            onPress={handleAccountDelete}
            style={styles.deleteButton}
          />
        ) : (
          <Button
            label="Finish account cleanup"
            variant="secondary"
            loading={privacyBusy === 'account-cleanup'}
            disabled={privacyBusy !== null && privacyBusy !== 'account-cleanup'}
            icon={<Ionicons name="refresh-outline" size={18} color={colors.ink} />}
            accessibilityHint="Retries the remaining local cleanup after the remote account was already deleted."
            onPress={() => void finishAccountCleanup()}
            style={styles.deleteButton}
          />
        )}

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
  syncStatus: {
    marginTop: spacing.xl,
  },
  syncReviewButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
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
  manageEquipmentButton: {
    marginTop: spacing.md,
  },
  preferenceButton: {
    marginTop: spacing.md,
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
