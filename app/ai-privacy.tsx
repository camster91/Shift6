import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, IconButton, OptionCard, Screen, Text } from '../src/components/ui';
import {
  COACH_PRIVACY_NOTICE_VERSION,
  createDefaultCoachPrivacyPreference,
  type CoachPrivacyPreference,
} from '../src/domain/coachPrivacy';
import { useLocalDatabase } from '../src/db/context';
import {
  getCoachPrivacyPreference,
  saveCoachPrivacyPreference,
} from '../src/db/coachPrivacyRepository';
import { colors, spacing } from '../src/design/tokens';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function AiPrivacyScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [preference, setPreference] = useState<CoachPrivacyPreference>(() =>
    createDefaultCoachPrivacyPreference(userId),
  );
  const [loading, setLoading] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPreference(createDefaultCoachPrivacyPreference(userId));
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void getCoachPrivacyPreference(database, userId)
      .then((stored) => {
        if (active) setPreference(stored);
      })
      .catch(() => {
        if (active) {
          setPreference(createDefaultCoachPrivacyPreference(userId));
          setMessage(
            'We could not load the saved Coach privacy preference. Provider processing is off.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database, userId]);

  const save = async () => {
    if (!database) {
      setMessage(
        'Web preview: provider Coach processing remains off because this preference is stored on native builds.',
      );
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveCoachPrivacyPreference(database, {
        ...preference,
        userId,
        noticeVersion: COACH_PRIVACY_NOTICE_VERSION,
        updatedAt: new Date().toISOString(),
      });
      setPreference(saved);
      setMessage(
        saved.providerCoachEnabled
          ? 'Provider-backed Coach processing is enabled on this device.'
          : 'Provider-backed Coach processing is off. Coach questions stay with the local explainer.',
      );
    } catch {
      setMessage(
        'We could not save the preference. Provider processing remains off until a saved opt-in can be read.',
      );
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
          AI & COACH PRIVACY
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Choose where Coach questions are processed.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        SHIFT6 has a local deterministic Coach that works without sending your question to an AI
        provider. Provider-backed Coach processing is optional and off by default.
      </Text>

      <Card tone="blue" style={styles.disclosureCard}>
        <Text variant="h3">What enabling provider Coach means</Text>
        <Text variant="small" tone="muted" style={styles.disclosureCopy}>
          When enabled, a Coach question and a limited structured training context may be sent to
          the configured SHIFT6 Coach service and its AI provider so it can generate a response.
        </Text>
        <Text variant="small" tone="muted" style={styles.disclosureCopy}>
          The current mobile boundary allows facts such as units, goals, experience, cycle week,
          workout title/focus/duration, completed/planned workout counts, cardio minutes and
          personal record count. Free-text questions are bounded before transmission.
        </Text>
        <Text variant="small" tone="muted" style={styles.disclosureCopy}>
          Raw Apple Health or Health Connect samples, private workout notes, manual body metrics,
          movement/accessibility preferences and analytics payloads are not part of the Coach
          context sent by the current mobile architecture.
        </Text>
        <Text variant="small" tone="muted" style={styles.disclosureCopy}>
          The production AI provider, retention period and provider-training policy are not
          finalized yet. They must be disclosed accurately before public release.
        </Text>
      </Card>

      <OptionCard
        label="Allow provider-backed Coach"
        description="Permit SHIFT6 to send bounded Coach questions and approved structured context to the configured Coach service."
        selected={preference.providerCoachEnabled}
        accessibilityRole="checkbox"
        accessibilityHint="Toggle optional off-device Coach processing. The local Coach remains available when disabled."
        onPress={() => {
          setPreference((current) => ({
            ...current,
            providerCoachEnabled: !current.providerCoachEnabled,
          }));
          setMessage(null);
        }}
        style={styles.option}
      />

      <Card tone="lavender" style={styles.localCard}>
        <Text variant="smallMedium">Local Coach stays available</Text>
        <Text variant="small" tone="muted" style={styles.localCopy}>
          Turning provider processing off does not disable Coach. SHIFT6 continues to explain the
          current workout, summarize local progress and apply deterministic safety routing without a
          provider request.
        </Text>
      </Card>

      {message ? (
        <Card tone="white" style={styles.messageCard} accessibilityLabel={message}>
          <Text variant="small" tone="muted">
            {message}
          </Text>
        </Card>
      ) : null}

      <Button
        label={loading ? 'Loading…' : 'Save Coach privacy preference'}
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
  disclosureCard: {
    marginTop: spacing.xl,
  },
  disclosureCopy: {
    marginTop: spacing.sm,
  },
  option: {
    marginTop: spacing.xl,
  },
  localCard: {
    marginTop: spacing.md,
  },
  localCopy: {
    marginTop: spacing.xs,
  },
  messageCard: {
    marginTop: spacing.md,
  },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
