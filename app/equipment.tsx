import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  OptionCard,
  Screen,
  Text,
} from '../src/components/ui';
import { equipmentCatalog } from '../src/domain/equipment';
import { demoUser } from '../src/domain/fixtures/home';
import type { OnboardingProfile } from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { getOnboardingProfile, saveOnboardingProfile } from '../src/db/profileRepository';
import { colors, radii, spacing } from '../src/design/tokens';

export default function EquipmentScreen() {
  const database = useLocalDatabase();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(demoUser.equipmentIds);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    void getOnboardingProfile(database, 'guest-user')
      .then((savedProfile) => {
        if (!active || !savedProfile) return;
        setProfile(savedProfile);
        setSelectedIds(savedProfile.user.equipmentIds);
      })
      .catch(() => {
        if (active) setError('We could not load your equipment profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database]);

  const filteredEquipment = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return equipmentCatalog;
    return equipmentCatalog.filter((equipment) =>
      [equipment.name, ...equipment.aliases].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query]);

  const toggleEquipment = (equipmentId: string) => {
    setMessage(null);
    setSelectedIds((current) =>
      current.includes(equipmentId)
        ? current.filter((id) => id !== equipmentId)
        : [...current, equipmentId],
    );
  };

  const saveEquipment = async () => {
    if (!database) {
      setMessage('Web preview: equipment changes are available on native builds.');
      return;
    }
    if (!profile) {
      setError('Complete setup before changing your equipment.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const now = new Date().toISOString();
      const nextProfile: OnboardingProfile = {
        ...profile,
        user: {
          ...profile.user,
          equipmentIds: selectedIds,
          updatedAt: now,
        },
      };
      await saveOnboardingProfile(database, nextProfile);
      setProfile(nextProfile);
      setMessage('Equipment updated. Programs and substitutions will use this list.');
    } catch {
      setError('We could not save your equipment locally.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton width="38%" height={14} />
        <LoadingSkeleton height={52} style={styles.loadingTitle} />
        <LoadingSkeleton height={84} style={styles.loadingCard} />
        <LoadingSkeleton height={84} style={styles.loadingCard} />
      </Screen>
    );
  }

  return (
    <Screen scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Profile"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          EQUIPMENT
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Train with what you have.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Keep this list current. It helps SHIFT6 rank plans and choose practical substitutions.
      </Text>

      <Card
        tone="lavender"
        style={styles.summaryCard}
        accessibilityLabel={`${selectedIds.length} equipment items selected`}
      >
        <Text variant="caption" tone="muted">
          SELECTED
        </Text>
        <Text variant="h2">{selectedIds.length} equipment items</Text>
        <Text variant="small" tone="muted" style={styles.cardCopy}>
          Bodyweight movements remain available even when no equipment is selected.
        </Text>
      </Card>

      <TextInput
        accessibilityLabel="Search equipment"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder="Search equipment"
        placeholderTextColor={colors.inkMuted}
        style={styles.searchInput}
        value={query}
      />

      <View style={styles.list} accessibilityLabel="Equipment choices">
        {filteredEquipment.map((equipment) => (
          <OptionCard
            key={equipment.id}
            label={equipment.name}
            description={equipment.description ?? equipment.aliases.join(' · ')}
            selected={selectedIds.includes(equipment.id)}
            onPress={() => toggleEquipment(equipment.id)}
            icon={<Ionicons name="fitness-outline" size={20} color={colors.ink} />}
          />
        ))}
      </View>

      {filteredEquipment.length === 0 ? (
        <Card tone="white" style={styles.emptyCard}>
          <Text variant="smallMedium">No matching equipment</Text>
          <Text variant="small" tone="muted" style={styles.cardCopy}>
            Try a different search term.
          </Text>
        </Card>
      ) : null}

      {message ? (
        <Card tone="mint" style={styles.messageCard} accessibilityLabel={message}>
          <Text variant="small" tone="muted">
            {message}
          </Text>
        </Card>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      <Button
        label="Save equipment"
        loading={saving}
        disabled={saving}
        onPress={() => void saveEquipment()}
        icon={<Ionicons name="checkmark" size={18} color={colors.white} />}
        style={styles.saveButton}
      />
    </Screen>
  );
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
  loadingTitle: {
    marginTop: spacing.md,
  },
  loadingCard: {
    marginTop: spacing.md,
  },
  summaryCard: {
    marginTop: spacing.xl,
  },
  cardCopy: {
    marginTop: spacing.xs,
  },
  searchInput: {
    minHeight: 52,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyCard: {
    marginTop: spacing.md,
  },
  messageCard: {
    marginTop: spacing.xl,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
});
