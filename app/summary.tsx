import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  Shift6Icon,
  Text,
} from '../src/components/ui';
import { getWorkoutCheckIn, saveWorkoutCheckIn } from '../src/db/checkInRepository';
import { useLocalDatabase } from '../src/db/context';
import { getUserProgramVersion } from '../src/db/programRepository';
import { getCompletedSets, getWorkoutSession } from '../src/db/workoutRepository';
import { demoProgramVersion, demoWorkout } from '../src/domain/fixtures/home';
import type {
  CheckInRating,
  CompletedSet,
  Workout,
  WorkoutCheckIn,
  WorkoutSession,
} from '../src/domain/types';
import { colors, radii, spacing } from '../src/design/tokens';

export default function WorkoutSummaryScreen() {
  const database = useLocalDatabase();
  const { sessionId, workoutId } = useLocalSearchParams<{
    sessionId?: string;
    workoutId?: string;
  }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<CompletedSet[]>([]);
  const [existingCheckIn, setExistingCheckIn] = useState<WorkoutCheckIn | null>(null);
  const [loading, setLoading] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [energy, setEnergy] = useState<CheckInRating | null>(null);
  const [soreness, setSoreness] = useState<CheckInRating | null>(null);
  const [effort, setEffort] = useState<CheckInRating | null>(null);
  const [discomfortReported, setDiscomfortReported] = useState(false);
  const [note, setNote] = useState('');

  const previewWorkout = useMemo<Workout>(
    () =>
      demoProgramVersion.workouts.find((candidate) => candidate.id === workoutId) ?? demoWorkout,
    [workoutId],
  );
  const [workout, setWorkout] = useState<Workout>(previewWorkout);

  useEffect(() => {
    if (!database || !sessionId) {
      setWorkout(previewWorkout);
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const [localSession, localSets, checkIn] = await Promise.all([
          getWorkoutSession(database, sessionId),
          getCompletedSets(database, sessionId),
          getWorkoutCheckIn(database, sessionId),
        ]);
        const snapshot = localSession
          ? await getUserProgramVersion(database, 'guest-user', localSession.programVersionId)
          : null;
        const localWorkout =
          snapshot?.version.workouts.find(
            (candidate) => candidate.id === localSession?.workoutId,
          ) ?? previewWorkout;
        if (!active) return;
        setSession(localSession);
        setSets(localSets);
        setExistingCheckIn(checkIn);
        setWorkout(localWorkout);
        if (checkIn) {
          setEnergy(checkIn.energy ?? null);
          setSoreness(checkIn.soreness ?? null);
          setEffort(checkIn.perceivedExertion ?? null);
          setDiscomfortReported(checkIn.discomfortReported);
          setNote(checkIn.note ?? '');
        }
      } catch {
        if (active) setError('We could not load the completed workout from local storage.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [database, previewWorkout, sessionId]);

  const facts = useMemo(() => buildSummaryFacts(session, sets, workout), [session, sets, workout]);

  const saveCheckIn = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);
    const checkIn: WorkoutCheckIn = {
      sessionId: sessionId ?? 'preview-session',
      energy: energy ?? undefined,
      soreness: soreness ?? undefined,
      perceivedExertion: effort ?? undefined,
      discomfortReported,
      note: note.trim() || undefined,
      createdAt: existingCheckIn?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (database) await saveWorkoutCheckIn(database, checkIn);
      setExistingCheckIn(checkIn);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'We could not save this check-in.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton width={44} height={44} />
        <LoadingSkeleton width="72%" height={52} style={styles.loadingTitle} />
        <LoadingSkeleton height={150} style={styles.loadingCard} />
        <LoadingSkeleton height={260} style={styles.loadingCard} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Shift6Icon name="arrowBack" size={22} color={colors.ink} />}
          label="Back to Home"
          onPress={() => router.replace('/')}
        />
        <Text variant="caption" tone="muted">
          WORKOUT SUMMARY
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Workout complete.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {workout.title} is recorded locally. Take a moment to capture how the session felt before
        you move on.
      </Text>

      <Card tone="mint" style={styles.completeCard} accessibilityLabel="Workout complete">
        <View style={styles.completeHeader}>
          <View style={styles.completeIcon}>
            <Shift6Icon name="checkmark" size={24} color={colors.ink} />
          </View>
          <View style={styles.completeCopy}>
            <Text variant="h2">{workout.title}</Text>
            <Text variant="small" tone="muted">
              {facts.setCount} sets logged · {facts.durationLabel}
            </Text>
          </View>
        </View>
        <View style={styles.factsRow}>
          <SummaryFact label="Volume" value={facts.volumeLabel} />
          <SummaryFact label="Cardio" value={facts.cardioLabel} />
          <SummaryFact label="Status" value={database ? 'Saved' : 'Preview'} />
        </View>
      </Card>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      <Text variant="h2" style={styles.sectionTitle}>
        How did it feel?
      </Text>
      <Text variant="small" tone="muted" style={styles.sectionCopy}>
        These structured check-ins help explain your progression. They are optional and are not a
        medical assessment.
      </Text>

      <RatingScale
        label="Energy"
        value={energy}
        onChange={setEnergy}
        lowLabel="Low"
        highLabel="High"
      />
      <RatingScale
        label="Soreness"
        value={soreness}
        onChange={setSoreness}
        lowLabel="None"
        highLabel="High"
      />
      <RatingScale
        label="Effort"
        value={effort}
        onChange={setEffort}
        lowLabel="Easy"
        highLabel="Max"
      />

      <Button
        label={discomfortReported ? 'Discomfort noted' : 'No unusual discomfort'}
        variant={discomfortReported ? 'secondary' : 'ghost'}
        onPress={() => setDiscomfortReported((current) => !current)}
        accessibilityHint="Optional structured safety check-in"
        style={styles.discomfortButton}
      />

      <TextInput
        accessibilityLabel="Optional workout note"
        multiline
        onChangeText={setNote}
        placeholder="Optional note for your future self"
        placeholderTextColor={colors.inkMuted}
        style={styles.noteInput}
        value={note}
      />

      <Button
        label={saved ? 'Check-in saved' : 'Save check-in'}
        onPress={() => void saveCheckIn()}
        loading={saving}
        disabled={saved}
        icon={saved ? <Shift6Icon name="checkmark" size={18} color={colors.white} /> : undefined}
        style={styles.actionButton}
      />
      <Button
        label="Continue to Home"
        variant="secondary"
        onPress={() => router.replace('/')}
        style={styles.actionButton}
      />
      <Text variant="caption" tone="muted" style={styles.persistenceNote}>
        {database
          ? 'Your check-in is saved on this device and queued for sync when an account backend is connected.'
          : Platform.OS === 'web'
            ? 'Web preview: workout and check-in persistence is not active in this browser.'
            : 'The check-in is saved locally before sync.'}
      </Text>
    </Screen>
  );
}

function RatingScale({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: CheckInRating | null;
  onChange: (value: CheckInRating) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <View
      accessibilityLabel={`${label}. ${value ? `Selected ${value} of 5.` : 'Not selected.'}`}
      style={styles.rating}
    >
      <View style={styles.ratingHeader}>
        <Text variant="smallMedium">{label}</Text>
        <Text variant="caption" tone="muted">
          {lowLabel} · {highLabel}
        </Text>
      </View>
      <View style={styles.ratingOptions}>
        {([1, 2, 3, 4, 5] as CheckInRating[]).map((rating) => (
          <Chip
            key={rating}
            label={String(rating)}
            selected={rating === value}
            onPress={() => onChange(rating)}
          />
        ))}
      </View>
    </View>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryFact}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="smallMedium">{value}</Text>
    </View>
  );
}

function buildSummaryFacts(
  session: WorkoutSession | null,
  sets: readonly CompletedSet[],
  workout: Workout,
) {
  const durationMinutes = session?.completedAt
    ? Math.max(0, (Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60_000)
    : undefined;
  const volume = sets.reduce((total, set) => total + (set.load ?? 0) * (set.reps ?? 0), 0);
  const cardioMinutes =
    workout.focus === 'cardio'
      ? sets.reduce((total, set) => total + (set.durationSeconds ?? 0), 0) / 60
      : 0;

  return {
    setCount: sets.length,
    durationLabel:
      durationMinutes === undefined
        ? `${workout.estimatedDurationMinutes} min target`
        : `${Math.round(durationMinutes)} min`,
    volumeLabel: volume > 0 ? `${Math.round(volume).toLocaleString()} lb-reps` : 'Not measured',
    cardioLabel: cardioMinutes > 0 ? `${Math.round(cardioMinutes)} min` : '—',
  };
}

const styles = StyleSheet.create({
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
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
  completeCard: {
    marginTop: spacing.xl,
  },
  completeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  completeIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  factsRow: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(13,16,27,0.12)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryFact: {
    flexGrow: 1,
    minWidth: 86,
    gap: spacing.xxs,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
  },
  sectionCopy: {
    marginTop: spacing.sm,
  },
  rating: {
    marginTop: spacing.xl,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingOptions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  discomfortButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xl,
  },
  noteInput: {
    minHeight: 96,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.ink,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  actionButton: {
    marginTop: spacing.md,
  },
  persistenceNote: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
