import { confirmOnboardingSetup, setupChoiceSnapshot } from '../src/db/onboardingConfirmation';
import {
  nextCoachSetupQuestion,
  coachSetupPrompts,
  coachSetupReview,
} from '../src/domain/coachOnboarding';
import { onboardingFlows, type OnboardingRecoveryState } from '../src/domain/onboardingRecovery';
import { getOnboardingDraft, saveOnboardingDraft } from '../src/db/onboardingDraftRepository';
import { ShiftArtwork } from '../src/components/artwork/ShiftArtwork';
import { shiftArtwork } from '../src/design/artwork';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getOnboardingMissingFields,
  healthConnectionOptions,
  isOnboardingComplete,
  recommendPrograms,
  preferredTrainingTimeOptions,
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
import { programLibrary, programLibraryPrograms } from '../src/domain/programLibrary';
import { isProgramStartAllowed } from '../src/domain/runtimeContentGates';
import { useLocalDatabase } from '../src/db/context';
import { getUserConsiderations } from '../src/db/considerationsRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { colors, radii, spacing } from '../src/design/tokens';
import { useAppServices } from '../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';
import { runtimeConfig } from '../src/config/env';

const {
  essential: essentialSteps,
  detailed: detailedSteps,
  optional: optionalSteps,
} = onboardingFlows;
const initialDraft = () => ({
  ...createOnboardingDraft('You'),
  healthConnection: 'not-now' as const,
  coachTone: 'supportive' as const,
  coachIntervention: 'conservative' as const,
});

export default function OnboardingScreen() {
  return <SetupScreen />;
}

export function SetupScreen({ guided = false }: { guided?: boolean }) {
  const database = useLocalDatabase();
  const { analytics } = useAppServices();
  const userId = useCurrentUserId();
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState(essentialSteps);
  const stepCount = steps.length;
  const currentStep = steps[step]!;
  const [draft, setDraft] = useState<ReturnType<typeof createOnboardingDraft>>(initialDraft);
  const [considerations, setConsiderations] = useState<UserConsiderations>(() =>
    createEmptyUserConsiderations(userId, new Date(0).toISOString()),
  );
  const [loadingProfile, setLoadingProfile] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const currentOwner = useRef(userId);
  currentOwner.current = userId;
  const draftWrites = useRef<Promise<void>>(Promise.resolve());
  const saved = useRef(false);
  const actionBusy = useRef(false);
  const screenScope = useRef({ generation: 0, focused: true, mounted: true });
  const latestContext = useRef({ database, userId, choices: '' });
  latestContext.current = {
    database,
    userId,
    choices: setupChoiceSnapshot({
      version: 1,
      flow: 'detailed',
      step: 0,
      draft,
      movementConsiderations: considerations.movementConsiderations,
      accessibilityNeeds: considerations.accessibilityNeeds,
    }),
  };
  useFocusEffect(
    useCallback(() => {
      screenScope.current.generation++;
      screenScope.current.focused = true;
      screenScope.current.mounted = true;
      actionBusy.current = false;
      setSaving(false);
      return () => {
        screenScope.current.focused = false;
        screenScope.current.generation++;
      };
    }, [database, userId]),
  );
  useEffect(
    () => () => {
      screenScope.current.mounted = false;
      screenScope.current.generation++;
    },
    [],
  );

  const persistDraft = useCallback(
    (nextStep = step) => {
      if (!database) return Promise.resolve();
      const snapshot: OnboardingRecoveryState = {
        version: 1,
        flow:
          steps === essentialSteps
            ? 'essential'
            : steps === optionalSteps
              ? 'optional'
              : 'detailed',
        step: nextStep,
        draft,
        movementConsiderations: considerations.movementConsiderations,
        accessibilityNeeds: considerations.accessibilityNeeds,
      };
      const write = draftWrites.current.then(async () => {
        if (currentOwner.current === userId && !saved.current)
          await saveOnboardingDraft(database, userId, snapshot);
      });
      draftWrites.current = write.catch(() => undefined);
      return write;
    },
    [database, userId, steps, step, draft, considerations],
  );

  useEffect(() => {
    if (loadingProfile || loadedOwner !== userId || saving || saved.current || !hasDraftChanges)
      return;
    void persistDraft().catch(() => {
      if (currentOwner.current === userId && !saved.current)
        setError(
          'Your latest setup choices could not be saved for recovery. Try again before leaving.',
        );
    });
  }, [persistDraft, loadingProfile, loadedOwner, userId, saving, hasDraftChanges]);

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
    setLoadingProfile(true);
    setLoadedOwner(null);
    saved.current = false;
    void Promise.all([
      getOnboardingProfile(database, userId),
      getUserConsiderations(database, userId),
      getOnboardingDraft(database, userId),
    ])
      .then(([profile, savedConsiderations, recovery]) => {
        if (!active) return;
        setDraft(recovery?.draft ?? (profile ? fromOnboardingProfile(profile) : initialDraft()));
        setSteps(
          guided
            ? detailedSteps
            : recovery
              ? onboardingFlows[recovery.flow]
              : profile
                ? detailedSteps
                : essentialSteps,
        );
        setStep(
          guided
            ? nextCoachSetupQuestion(
                recovery?.draft ?? (profile ? fromOnboardingProfile(profile) : initialDraft()),
              )
            : (recovery?.step ?? 0),
        );
        setConsiderations(
          recovery
            ? {
                ...savedConsiderations,
                movementConsiderations: recovery.movementConsiderations,
                accessibilityNeeds: recovery.accessibilityNeeds,
              }
            : savedConsiderations,
        );
        setHasDraftChanges(Boolean(recovery));
        setLoadedOwner(userId);
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
  }, [database, userId, guided]);

  const recommendations = useMemo(() => {
    if (!isOnboardingComplete(draft)) return [];

    return recommendPrograms(
      programLibraryPrograms.filter((program) => {
        const entry = programLibrary.find((candidate) => candidate.program.id === program.id);
        return entry && isProgramStartAllowed(entry, guided ? false : __DEV__);
      }),
      {
        goals: draft.goals,
        experience: draft.experience!,
        equipmentIds: draft.equipmentIds,
        trainingDaysPerWeek: draft.trainingDaysPerWeek!,
        preferredSessionMinutes: draft.preferredSessionMinutes!,
      },
    );
  }, [draft, guided]);

  const updateDraft = <Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) => {
    if (actionBusy.current || !screenScope.current.focused) return;
    setHasDraftChanges(true);
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const toggleMovementConsideration = (value: MovementConsideration) => {
    if (actionBusy.current || !screenScope.current.focused) return;
    setHasDraftChanges(true);
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
    if (actionBusy.current || !screenScope.current.focused) return;
    setHasDraftChanges(true);
    setConsiderations((current) => ({
      ...current,
      userId,
      accessibilityNeeds: current.accessibilityNeeds.includes(value)
        ? current.accessibilityNeeds.filter((item) => item !== value)
        : [...current.accessibilityNeeds, value],
    }));
    setError(null);
  };

  const missingFields = [
    ...getOnboardingMissingFields(currentStep, draft),
    ...(currentStep === 9 ? getOnboardingMissingFields(3, draft) : []),
  ];
  const canContinue = missingFields.length === 0;

  if (loadingProfile) {
    return (
      <Screen key={currentStep} contentContainerStyle={styles.screenContent}>
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
    if (!canContinue || actionBusy.current || loadedOwner !== userId || !database) return;
    if (!screenScope.current.focused) return;
    const generation = screenScope.current.generation;
    const confirmed: OnboardingRecoveryState = JSON.parse(
      JSON.stringify({
        version: 1,
        flow:
          steps === essentialSteps
            ? 'essential'
            : steps === optionalSteps
              ? 'optional'
              : 'detailed',
        step,
        draft,
        movementConsiderations: considerations.movementConsiderations,
        accessibilityNeeds: considerations.accessibilityNeeds,
      }),
    );
    const choices = setupChoiceSnapshot(confirmed);
    const isCurrent = () =>
      screenScope.current.mounted &&
      screenScope.current.focused &&
      screenScope.current.generation === generation &&
      latestContext.current.database === database &&
      latestContext.current.userId === userId &&
      latestContext.current.choices === choices;
    actionBusy.current = true;
    setError(null);

    if (step < stepCount - 1) {
      setSaving(true);
      try {
        const next = guided ? nextCoachSetupQuestion(draft) : step + 1;
        await persistDraft(next);
        if (isCurrent()) setStep(next);
      } catch {
        if (isCurrent()) setError('We could not save your setup progress. Try Continue again.');
      } finally {
        if (isCurrent()) {
          actionBusy.current = false;
          setSaving(false);
        }
      }
      return;
    }

    setSaving(true);
    try {
      await draftWrites.current;
      if (!isCurrent()) return;
      const expectedRecovery = await getOnboardingDraft(database, userId);
      if (!isCurrent()) return;
      await confirmOnboardingSetup(
        database,
        userId,
        confirmed,
        expectedRecovery,
        new Date().toISOString(),
        isCurrent,
      );
      if (!isCurrent()) return;
      saved.current = true;
      trackAnalyticsEvent(analytics, 'onboarding_completed', {
        goalCount: draft.goals.length,
        equipmentCount: draft.equipmentIds.length,
        trainingDays: draft.trainingDaysPerWeek ?? 0,
        healthConnectionSelected: draft.healthConnection !== 'not-now',
      });
      router.replace('/programs');
    } catch (saveError) {
      if (isCurrent())
        setError(saveError instanceof Error ? saveError.message : 'We could not save your setup.');
    } finally {
      if (isCurrent()) {
        actionBusy.current = false;
        setSaving(false);
      }
    }
  };

  return (
    <Screen
      key={currentStep}
      contentContainerStyle={styles.screenContent}
      scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}
      footer={
        <>
          {missingFields.length > 0 ? (
            <Text
              variant="small"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Required to continue: ${missingFields.join('; ')}. Scroll to find these choices.`}
              style={styles.requiredHint}
            >
              {currentStep === 9 ? 'Go back to choose: ' : 'To continue, choose: '}
              {missingFields.join('; ')}. Scroll to find these choices.
            </Text>
          ) : null}
          {error ? (
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Setup error. ${error}`}
            >
              <Card tone="coral" style={styles.errorCard}>
                <Text variant="smallMedium">Setup could not be saved</Text>
                <Text variant="small" tone="muted" style={styles.errorText}>
                  {error}
                </Text>
              </Card>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={
                step === stepCount - 1
                  ? guided
                    ? 'Confirm and save reviewed setup'
                    : 'Save setup'
                  : 'Continue'
              }
              onPress={() => void handleContinue()}
              disabled={!canContinue || !database || loadedOwner !== userId}
              loading={saving}
              icon={
                step === stepCount - 1 ? undefined : (
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                )
              }
              style={styles.actionButton}
            />
          </View>
        </>
      }
    >
      <View style={styles.header}>
        {step > 0 ? (
          <Button
            label="Back"
            variant="ghost"
            icon={<Ionicons name="arrow-back" size={18} color={colors.ink} />}
            disabled={saving}
            onPress={() => {
              if (!actionBusy.current) setStep((current) => Math.max(0, current - 1));
            }}
            style={styles.backButton}
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text variant="caption" tone="muted">
          {guided ? 'LOCAL COACH SETUP' : `SETUP · ${step + 1} OF ${stepCount}`}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ProgressIndicator label="Your setup" value={(step + 1) / stepCount} />
      <Button
        label={guided ? 'Use standard setup' : 'Let local Coach guide setup'}
        variant="ghost"
        disabled={saving || loadedOwner !== userId || !database}
        onPress={() => {
          if (actionBusy.current) return;
          const generation = screenScope.current.generation;
          const isCurrent = () =>
            screenScope.current.mounted &&
            screenScope.current.focused &&
            screenScope.current.generation === generation &&
            latestContext.current.database === database &&
            latestContext.current.userId === userId;
          actionBusy.current = true;
          setSaving(true);
          void (hasDraftChanges ? persistDraft() : Promise.resolve())
            .then(() => {
              if (isCurrent()) router.replace(guided ? '/onboarding' : '/coach-onboarding');
            })
            .catch(() => {
              if (isCurrent())
                setError('Your choices could not be saved. Stay here and try again.');
            })
            .finally(() => {
              if (isCurrent()) {
                actionBusy.current = false;
                setSaving(false);
              }
            });
        }}
      />
      {guided ? (
        <Card tone="lavender">
          <Text variant="h3">{coachSetupPrompts[currentStep]}</Text>
          <Text variant="small">
            Local choices only. Existing answers are reused; nothing is inferred. No model,
            microphone or health permission is used.
          </Text>
        </Card>
      ) : null}
      {guided && currentStep === 9 ? (
        <Card>
          {coachSetupReview(draft).map((row) => (
            <View key={row.question}>
              <Text variant="smallMedium">
                {row.name}: {row.value}
              </Text>
              <Button
                label={`Edit ${row.name}`}
                variant="ghost"
                disabled={saving}
                onPress={() => {
                  if (!actionBusy.current) setStep(row.question);
                }}
              />
            </View>
          ))}
          <Text variant="small">
            Movement preferences:{' '}
            {considerations.movementConsiderations
              .map(
                (value) =>
                  movementConsiderationOptions.find((option) => option.value === value)?.label,
              )
              .join(', ') || 'None shared'}
            . Accessibility preferences:{' '}
            {considerations.accessibilityNeeds
              .map(
                (value) => accessibilityNeedOptions.find((option) => option.value === value)?.label,
              )
              .join(', ') || 'None shared'}
            .
          </Text>
          <Button
            label="Edit movement and accessibility preferences"
            variant="ghost"
            disabled={saving}
            onPress={() => {
              if (!actionBusy.current) setStep(5);
            }}
          />
          <Text variant="small">
            Saving setup creates no measured baseline, plan or cycle. Personal goals still require
            an explicit baseline. Reviewed public content remains gated; you can build a private
            plan after saving.
          </Text>
        </Card>
      ) : null}
      {step === 0 && runtimeConfig.releaseMode === 'guest-only' ? (
        <Button
          label="Restore a local export instead"
          variant="secondary"
          disabled={saving}
          onPress={() => {
            if (!actionBusy.current) router.push('/restore');
          }}
        />
      ) : null}
      {step === 0 && database ? (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          Choices save on this device as you go.
        </Text>
      ) : null}
      {renderStep(
        currentStep,
        draft,
        updateDraft,
        considerations,
        toggleMovementConsideration,
        toggleAccessibilityNeed,
        recommendations,
        database !== null,
        saving,
      )}

      {currentStep === 9 ? <ShiftArtwork {...shiftArtwork.journey} /> : null}
      {currentStep === 9 && steps === essentialSteps ? (
        <>
          <Text variant="small" tone="muted">
            Health connections are off. Coach uses a supportive tone and conservative suggestions.
            You can change these preferences anytime.
          </Text>
          <Button
            label="Customize name, movement, accessibility and Coach"
            variant="secondary"
            disabled={saving}
            onPress={() => {
              if (actionBusy.current) return;
              setSteps(optionalSteps);
              setStep(5);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
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
  locked: boolean,
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
            maxLength={200}
            onChangeText={(value) => updateDraft('displayName', value)}
            placeholder="Name or nickname"
            placeholderTextColor={colors.inkMuted}
            returnKeyType="done"
            style={styles.input}
            editable={!locked}
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
              disabled={locked}
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
              disabled={locked}
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
              disabled={locked}
              key={equipment.id}
              label={equipment.name}
              description={equipment.description ?? equipment.aliases.join(' · ')}
              selected={draft.equipmentIds.includes(equipment.id)}
              accessibilityRole="checkbox"
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
                disabled={locked}
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
                disabled={locked}
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
              disabled={locked}
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
              disabled={locked}
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
              disabled={locked}
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
              These preferences stay local by default. SHIFT6 does not diagnose a condition or infer
              one from anything you select or skip.
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
              disabled={locked}
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
              disabled={locked}
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
              disabled={locked}
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
              disabled={locked}
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
              <Text variant="body">
                No reviewed program matches your setup yet. Save your preferences, then explore the
                library or build your own plan.
              </Text>
            </Card>
          )}
          <Text variant="caption" tone="muted" style={styles.persistenceNote}>
            {hasNativeDatabase
              ? runtimeConfig.releaseMode === 'guest-only'
                ? 'Your setup will be saved on this device. No account or cloud backup is available in this release. You can export your records from Profile.'
                : 'Your guest setup will be stored on this device and can be migrated when you create an account.'
              : Platform.OS === 'web'
                ? 'Web preview: native device persistence is not active in this surface.'
                : 'Local storage is unavailable. Your setup has not been saved.'}
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
      <Text variant="h1" accessibilityRole="header" style={styles.title}>
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
    minHeight: 48,
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
    marginBottom: spacing.sm,
  },
  requiredHint: {
    marginBottom: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
