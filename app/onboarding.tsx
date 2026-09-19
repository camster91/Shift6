import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  LoadingSkeleton,
  OptionCard,
  ProgramCard,
  ProgressIndicator,
  Screen,
  Text,
} from '../src/components/ui';
import {
  coachInterventionOptions,
  coachToneOptions,
  createOnboardingDraft,
  experienceOptions,
  fromOnboardingProfile,
  goalOptions,
  healthConnectionOptions,
  isOnboardingComplete,
  recommendPrograms,
  preferredTrainingTimeOptions,
  toOnboardingProfile,
  unitOptions,
} from '../src/domain/onboarding';
import {
  accessibilityNeedOptions,
  createEmptyUserConsiderations,
  movementConsiderationOptions,
  type AccessibilityNeed,
  type MovementConsideration,
  type UserConsiderations,
} from '../src/domain/considerations';
import { equipmentCatalog } from '../src/domain/equipment';
import { programLibraryPrograms } from '../src/domain/programLibrary';
import { useLocalDatabase } from '../src/db/context';
import {
  getUserConsiderations,
  saveUserConsiderations,
} from '../src/db/considerationsRepository';
import { getOnboardingProfile, saveOnboardingProfile } from '../src/db/profileRepository';
import { colors, radii, spacing } from '../src/design/tokens';
import { useAppServices } from '../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

const stepCount = 10;

export default function OnboardingScreen() {
  const database = useLocalDatabase();
  const { analytics } = useAppServices();
  const userId = useCurrentUserId();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => createOnboardingDraft());
  const [considerations, setConsiderations] = useState<UserConsiderations>(() =>
    createEmptyUserConsiderations(userId, new Date(0).toISOString()),
  );
  const [loadingProfile, setLoadingProfile] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent(analytics, 'onboarding_started');
  }, [analytics]);

  useEffect(() => {
    if (!database) {
      setConsiderations(createEmptyUserConsiderations(userId, new Date(0).toISOString()));
      setLoadingProfile(false);
      return;
    }

    let active = true;
    void Promise.all([
      getOnboardingProfile(database, userId),
      getUserConsiderations(database, userId),
    ])
      .then(([profile, savedConsiderations]) => {
        if (!active) return;
        if (profile) setDraft(fromOnboardingProfile(profile));
        setConsiderations(savedConsiderations);
      })
      .catch(() => {
        if (active)
          setError('We could not load your saved setup. You can continue with a new one.');
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [database, userId]);

  const recommendations = useMemo(() => {
    if (!isOnboardingComplete(draft)) return [];

    return recommendPrograms(programLibraryPrograms, {
      goals: draft.goals,
      experience: draft.experience!,
      equipmentIds: draft.equipmentIds,
      trainingDaysPerWeek: draft.trainingDaysPerWeek!,
      preferredSessionMinutes: draft.preferredSessionMinutes!,
    });
  }, [draft]);

  const updateDraft = <Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const toggleMovementConsideration = (value: MovementConsideration) => {
    setConsiderations((current) => ({
      ...current,
      userId,
      movementConsiderations: current.movementConsiderations.includes(value)
        ? current.movementConsiderations.filter((item) => item !== value)
        : [...current.movementConsiderations, value],
    }));
    setError(null);
  };

  const toggleAccessibilityNeed = (value: AccessibilityNeed) => {
    setConsiderations((current) => ({
      ...current,
      userId,
      accessibilityNeeds: current.accessibilityNeeds.includes(value)
        ? current.accessibilityNeeds.filter((item) => item !== value)
        : [...current.accessibilityNeeds, value],
    }));
    setError(null);
  };

  const canContinue = getCanContinue(step, draft);

  if (loadingProfile) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <Text variant="caption" tone="muted">
          LOADING YOUR SETUP
        </Text>
        <LoadingSkeleton height={52} style={styles.loadingTitle} />
        <LoadingSkeleton height={120} style={styles.loadingCard} />
        <LoadingSkeleton height={52} style={styles.loadingField} />
      </Screen>
    );
  }

  const handleContinue = async () => {
    if (!canContinue) return;
    setError(null);

    if (step < stepCount - 1) {
      setStep((current) => current + 1);
      return;
    }

    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const profile = toOnboardingProfile(draft, updatedAt);
      if (database) {
        await saveOnboardingProfile(database, profile);
        try {
          await saveUserConsiderations(database, {
            ...considerations,
            userId,
            updatedAt,
          });
        } catch {
          throw new Error(
            'Your main setup was saved, but movement and accessibility preferences were not. Retry here or edit them later from Profile.',
          );
        }
      }
      trackAnalyticsEvent(analytics, 'onboarding_completed', {
        goalCount: draft.goals.length,
        equipmentCount: draft.equipmentIds.length,
        trainingDays: draft.trainingDaysPerWeek ?? 0,
        healthConnectionSelected: draft.healthConnection !== 'not-now',
      });
      router.replace('/programs');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'We could not save your setup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      contentContainerStyle={styles.screenContent}
      scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      <View style={styles.header}>
        {step > 0 ? (
          <Button
            label="Back"
            variant="ghost"
            icon={<Ionicons name="arrow-back" size={18} color={colors.ink} />}
            onPress={() => setStep((current) => Math.max(0, current - 1))}
            style={styles.backButton}
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text variant="caption" tone="muted">
          SETUP · {step + 1} OF {stepCount}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ProgressIndicator label="Your setup" value={(step + 1) / stepCount} />
      {renderStep(
        step,
        draft,
        updateDraft,
        considerations,
        toggleMovementConsideration,
        toggleAccessibilityNeed,
        recommendations,
        database !== null,
      )}

      {error ? (
        <Card tone="coral" style={styles.errorCard} accessibilityLabel={`Setup error. ${error}`}>
          <Text variant="smallMedium">Setup could not be saved</Text>
          <Text variant="small" tone="muted" style={styles.errorText}>
            {error}
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? (
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setStep((current) => Math.max(0, current - 1))}
            style={styles.actionButton}
          />
        ) : null}
        <Button
          label={step === stepCount - 1 ? 'Save setup' : 'Continue'}
          onPress={handleContinue}
          disabled={!canContinue}
          loading={saving}
          icon={
            step === stepCount - 1 ? undefined : (
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            )
          }
          style={styles.actionButton}
        />
      </View>
    </Screen>
  );
}

function getCanContinue(step: number, draft: ReturnType<typeof createOnboardingDraft>): boolean {
  switch (step) {
    case 0:
      return draft.displayName.trim().length > 0;
    case 1:
      return draft.goals.length > 0;
    case 2:
      return draft.experience !== null;
    case 3:
      return draft.equipmentIds.length > 0;
    case 4:
      return (
        draft.trainingDaysPerWeek !== null &&
        draft.preferredSessionMinutes !== null &&
        draft.preferredTrainingTime !== null
      );
    case 5:
      return true;
    case 6:
      return draft.unitSystem !== null;
    case 7:
      return draft.healthConnection !== null;
    case 8:
      return draft.coachTone !== null && draft.coachIntervention !== null;
    case 9:
      return isOnboardingComplete(draft);
    default:
      return false;
  }
}

function renderStep(
  step: number,
  draft: ReturnType<typeof createOnboardingDraft>,
  updateDraft: <Key extends keyof ReturnType<typeof createOnboardingDraft>>(
    key: Key,
    value: ReturnType<typeof createOnboardingDraft>[Key],
  ) => void,
  considerations: UserConsiderations,
  toggleMovementConsideration: (value: MovementConsideration) => void,
  toggleAccessibilityNeed: (value: AccessibilityNeed) => void,
  recommendations: ReturnType<typeof recommendPrograms>,
  hasNativeDatabase: boolean,
) {
  switch (step) {
    case 0:
      return (
        <View style={styles.step}>
          <Text variant="caption" tone="muted">
            WELCOME TO SHIFT6
          </Text>
          <Text variant="display" accessibilityRole="header" style={styles.title}>
            Your next six starts here.
          </Text>
          <Text variant="body" tone="muted" style={styles.subtitle}>
            Build a clear training block around your goals, your schedule, and the equipment you
            actually have.
          </Text>
          <Card tone="lavender" style={styles.introCard}>
            <Text variant="h3">Progress, six weeks at a time.</Text>
            <Text variant="body" tone="muted" style={styles.cardText}>
              Core training stays free. Health connections are optional, and your setup can be
              changed later.
            </Text>
          </Card>
          <Text variant="smallMedium" style={styles.fieldLabel}>
            What should we call you?
          </Text>
          <TextInput
            accessibilityLabel="Your name or nickname"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={(value) => updateDraft('displayName', value)}
            placeholder="Name or nickname"
            placeholderTextColor={colors.inkMuted}
            returnKeyType="done"
            style={styles.input}
            value={draft.displayName}
          />
        </View>
      );
    case 1:
      return (
        <OptionStep
          eyebrow="YOUR FOCUS"
          title="What do you want to work toward?"
          subtitle="Choose one primary goal to help us rank programs. You can change it later."
        >
          {goalOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.goals.includes(option.value)}
              onPress={() => updateDraft('goals', [option.value])}
            />
          ))}
        </OptionStep>
      );
    case 2:
      return (
        <OptionStep
          eyebrow="EXPERIENCE"
          title="Where are you starting from?"
          subtitle="This helps SHIFT6 choose an appropriate starting point. It is not a judgement."
        >
          {experienceOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.experience === option.value}
              onPress={() => updateDraft('experience', option.value)}
            />
          ))}
        </OptionStep>
      );
    case 3:
      return (
        <OptionStep
          eyebrow="EQUIPMENT"
          title="What can you train with?"
          subtitle="Select everything you can access. Equipment drives program fit and substitutions."
        >
          {equipmentCatalog.map((equipment) => (
            <OptionCard
              key={equipment.id}
              label={equipment.name}
              description={equipment.description ?? equipment.aliases.join(' · ')}
              selected={draft.equipmentIds.includes(equipment.id)}
              onPress={() =>
                updateDraft(
                  'equipmentIds',
                  draft.equipmentIds.includes(equipment.id)
                    ? draft.equipmentIds.filter((id) => id !== equipment.id)
                    : [...draft.equipmentIds, equipment.id],
                )
              }
            />
          ))}
        </OptionStep>
      );
    case 4:
      return (
        <OptionStep
          eyebrow="YOUR RHYTHM"
          title="What fits your week?"
          subtitle="We will use this to rank plans. You can reschedule sessions when life changes."
        >
          <Text variant="smallMedium" style={styles.fieldLabel}>
            Training days per week
          </Text>
          <View style={styles.optionGrid}>
            {[2, 3, 4, 5, 6].map((days) => (
              <OptionCard
                key={days}
                label={`${days} days`}
                selected={draft.trainingDaysPerWeek === days}
                onPress={() => updateDraft('trainingDaysPerWeek', days)}
                style={styles.gridOption}
              />
            ))}
          </View>
          <Text variant="smallMedium" style={styles.fieldLabel}>
            Typical session length
          </Text>
          <View style={styles.optionGrid}>
            {[20, 30, 45, 60].map((minutes) => (
              <OptionCard
                key={minutes}
                label={`${minutes} min`}
                selected={draft.preferredSessionMinutes === minutes}
                onPress={() => updateDraft('preferredSessionMinutes', minutes)}
                style={styles.gridOption}
              />
            ))}
          </View>
          <Text variant="smallMedium" style={styles.fieldLabel}>
            Usual training time
          </Text>
          {preferredTrainingTimeOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.preferredTrainingTime === option.value}
              onPress={() => updateDraft('preferredTrainingTime', option.value)}
            />
          ))}
        </OptionStep>
      );
    case 5:
      return (
        <OptionStep
          eyebrow="MOVEMENT & ACCESSIBILITY"
          title="Anything you want SHIFT6 to work around?"
          subtitle="Optional, non-diagnostic preferences only. Skip anything you do not want to answer; leaving this blank does not create a hidden health assumption."
        >
          <Text variant="smallMedium" style={styles.fieldLabel}>
            Movement preferences
          </Text>
          {movementConsiderationOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={considerations.movementConsiderations.includes(option.value)}
              accessibilityRole="checkbox"
              onPress={() => toggleMovementConsideration(option.value)}
            />
          ))}
          <Text variant="smallMedium" style={styles.fieldLabel}>
            Accessibility preferences
          </Text>
          {accessibilityNeedOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={considerations.accessibilityNeeds.includes(option.value)}
              accessibilityRole="checkbox"
              onPress={() => toggleAccessibilityNeed(option.value)}
            />
          ))}
          <Card tone="blue" style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.ink} />
            <Text variant="small" tone="muted" style={styles.cardText}>
              These preferences stay local by default. SHIFT6 does not diagnose a condition or
              infer one from anything you select or skip.
            </Text>
          </Card>
        </OptionStep>
      );
    case 6:
      return (
        <OptionStep
          eyebrow="UNITS"
          title="Which units feel natural?"
          subtitle="You can switch this any time. SHIFT6 will keep your workout targets consistent."
        >
          {unitOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.unitSystem === option.value}
              onPress={() => updateDraft('unitSystem', option.value)}
            />
          ))}
        </OptionStep>
      );
    case 7:
      return (
        <OptionStep
          eyebrow="OPTIONAL HEALTH CONTEXT"
          title="Want to connect health data later?"
          subtitle="This is optional. Workout logging and progress do not require health permissions."
        >
          {healthConnectionOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.healthConnection === option.value}
              onPress={() => updateDraft('healthConnection', option.value)}
            />
          ))}
          <Card tone="blue" style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.ink} />
            <Text variant="small" tone="muted" style={styles.cardText}>
              We will ask for permissions separately, explain each data type, and keep the app
              useful if you skip.
            </Text>
          </Card>
        </OptionStep>
      );
    case 8:
      return (
        <OptionStep
          eyebrow="COACH SETUP"
          title="How should Coach show up?"
          subtitle="These are communication preferences, not hidden assumptions about your health."
        >
          <Text variant="smallMedium" style={styles.fieldLabel}>
            Coaching tone
          </Text>
          {coachToneOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.coachTone === option.value}
              onPress={() => updateDraft('coachTone', option.value)}
            />
          ))}
          <Text variant="smallMedium" style={styles.fieldLabel}>
            How early should Coach suggest a review?
          </Text>
          {coachInterventionOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={draft.coachIntervention === option.value}
              onPress={() => updateDraft('coachIntervention', option.value)}
            />
          ))}
        </OptionStep>
      );
    case 9: {
      const recommendation = recommendations[0];
      return (
        <View style={styles.step}>
          <Text variant="caption" tone="muted">
            YOUR STARTING POINT
          </Text>
          <Text variant="display" accessibilityRole="header" style={styles.title}>
            A plan that fits.
          </Text>
          <Text variant="body" tone="muted" style={styles.subtitle}>
            These matches are based only on the choices you made. Nothing starts until you choose
            it.
          </Text>
          {recommendation ? (
            <>
              <ProgramCard program={recommendation.program} />
              <Card tone={recommendation.compatible ? 'mint' : 'yellow'} style={styles.fitCard}>
                <Text variant="smallMedium">
                  {recommendation.compatible
                    ? 'Strong fit for your setup'
                    : 'Review equipment needs'}
                </Text>
                {recommendation.reasons.slice(0, 4).map((reason) => (
                  <Text key={reason} variant="small" tone="muted" style={styles.reason}>
                    • {reason}
                  </Text>
                ))}
              </Card>
            </>
          ) : (
            <Card tone="white">
              <Text variant="body">Complete your setup to see a program match.</Text>
            </Card>
          )}
          <Text variant="caption" tone="muted" style={styles.persistenceNote}>
            {hasNativeDatabase
              ? 'Your guest setup will be stored on this device and can be migrated when you create an account.'
              : Platform.OS === 'web'
                ? 'Web preview: native device persistence is not active in this surface.'
                : 'Your setup will be stored locally before any cloud sync is added.'}
          </Text>
        </View>
      );
    }
    default:
      return null;
  }
}

interface OptionStepProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

function OptionStep({ eyebrow, title, subtitle, children }: OptionStepProps) {
  return (
    <View style={styles.step}>
      <Text variant="caption" tone="muted">
        {eyebrow}
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {subtitle}
      </Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    paddingHorizontal: 0,
    minHeight: 44,
  },
  headerSpacer: {
    width: 64,
  },
  step: {
    marginTop: spacing.xl,
  },
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
  loadingField: {
    marginTop: spacing.xl,
  },
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  introCard: {
    marginTop: spacing.xl,
  },
  infoCard: {
    marginTop: spacing.md,
  },
  cardText: {
    marginTop: spacing.sm,
  },
  fieldLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  options: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridOption: {
    flexGrow: 1,
    flexBasis: '42%',
  },
  fitCard: {
    marginTop: spacing.md,
  },
  reason: {
    marginTop: spacing.xs,
  },
  persistenceNote: {
    marginTop: spacing.xl,
  },
  errorCard: {
    marginTop: spacing.xl,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
  },
  actionButton: {
    flex: 1,
  },
});
