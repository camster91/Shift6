import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, IconButton, OptionCard, Screen, Text } from '../src/components/ui';
import {
  accessibilityNeedOptions,
  createEmptyUserConsiderations,
  movementConsiderationOptions,
  type AccessibilityNeed,
  type MovementConsideration,
  type UserConsiderations,
} from '../src/domain/considerations';
import { useLocalDatabase } from '../src/db/context';
import {
  getUserConsiderations,
  saveUserConsiderations,
} from '../src/db/considerationsRepository';
import { colors, spacing } from '../src/design/tokens';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function ConsiderationsScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [value, setValue] = useState<UserConsiderations>(() =>
    createEmptyUserConsiderations(userId, new Date(0).toISOString()),
  );
  const [loading, setLoading] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setValue(createEmptyUserConsiderations(userId, new Date(0).toISOString()));
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void getUserConsiderations(database, userId)
      .then((stored) => {
        if (active) setValue(stored);
      })
      .catch(() => {
        if (active) setMessage('We could not load these local preferences.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database, userId]);

  const toggleMovement = (item: MovementConsideration) => {
    setValue((current) => ({
      ...current,
      movementConsiderations: current.movementConsiderations.includes(item)
        ? current.movementConsiderations.filter((candidate) => candidate !== item)
        : [...current.movementConsiderations, item],
    }));
    setMessage(null);
  };

  const toggleAccessibility = (item: AccessibilityNeed) => {
    setValue((current) => ({
      ...current,
      accessibilityNeeds: current.accessibilityNeeds.includes(item)
        ? current.accessibilityNeeds.filter((candidate) => candidate !== item)
        : [...current.accessibilityNeeds, item],
    }));
    setMessage(null);
  };

  const save = async () => {
    if (!database) {
      setMessage('Web preview: these preferences are stored on native builds.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveUserConsiderations(database, {
        ...value,
        userId,
        updatedAt: new Date().toISOString(),
      });
      setValue(saved);
      setMessage('Movement and accessibility preferences were saved on this device.');
    } catch {
      setMessage('We could not save these preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Profile"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          MOVEMENT & ACCESSIBILITY
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Make the plan easier to use.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        These selections are optional and non-diagnostic. SHIFT6 stores them locally and does not
        use skipped answers to infer a health condition.
      </Text>

      <Card tone="blue" style={styles.infoCard}>
        <Text variant="smallMedium">Preference, not diagnosis</Text>
        <Text variant="small" tone="muted" style={styles.infoCopy}>
          These settings do not automatically prescribe rehabilitation, exclude programs, or change
          your plan. They are explicit preferences to review when choosing movements and interfaces.
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Movement considerations
      </Text>
      <Text variant="small" tone="muted" style={styles.sectionCopy}>
        Select only movements or situations you want flagged for review.
      </Text>
      {movementConsiderationOptions.map((option) => (
        <OptionCard
          key={option.value}
          label={option.label}
          description={option.description}
          selected={value.movementConsiderations.includes(option.value)}
          onPress={() => toggleMovement(option.value)}
        />
      ))}

      <Text variant="h2" style={styles.sectionTitle}>
        Accessibility preferences
      </Text>
      <Text variant="small" tone="muted" style={styles.sectionCopy}>
        These help document how you prefer to use SHIFT6; system accessibility settings remain in
        control.
      </Text>
      {accessibilityNeedOptions.map((option) => (
        <OptionCard
          key={option.value}
          label={option.label}
          description={option.description}
          selected={value.accessibilityNeeds.includes(option.value)}
          onPress={() => toggleAccessibility(option.value)}
        />
      ))}

      {message ? (
        <Card tone="white" style={styles.messageCard} accessibilityLabel={message}>
          <Text variant="small" tone="muted">
            {message}
          </Text>
        </Card>
      ) : null}

      <Button
        label={loading ? 'Loading…' : 'Save preferences'}
        disabled={loading}
        loading={saving}
        onPress={() => void save()}
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
  infoCard: {
    marginTop: spacing.xl,
  },
  infoCopy: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xs,
  },
  sectionCopy: {
    marginBottom: spacing.md,
  },
  messageCard: {
    marginTop: spacing.xl,
  },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
