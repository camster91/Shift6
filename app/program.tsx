import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  IconButton,
  ProgramCard,
  Screen,
  SixWeekIndicator,
  Text,
} from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { saveTrainingCycleWithSchedule } from '../src/db/cycleRepository';
import { lifecycleDate } from '../src/domain/cycleLifecycle';
import { stableSnapshotJSON } from '../src/domain/programPersistence';
import { createTrainingCycle } from '../src/domain/cycle';
import { equipmentCatalog } from '../src/domain/equipment';
import { createProgramCopy } from '../src/domain/programBuilder';
import { programLibrary } from '../src/domain/programLibrary';
import {
  getProgramRuntimeStatusLabel,
  isProgramStartAllowed,
} from '../src/domain/runtimeContentGates';
import { saveProgramVersion } from '../src/db/programRepository';
import { colors, spacing } from '../src/design/tokens';
import { useAppServices } from '../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function ProgramDetailScreen() {
  const database = useLocalDatabase();
  const { analytics } = useAppServices();
  const userId = useCurrentUserId();
  const { programId } = useLocalSearchParams<{ programId?: string }>();
  const selectedEntry = programLibrary.find((entry) => entry.program.id === programId);
  const catalogueEntry = selectedEntry ?? programLibrary[0]!;
  const selectedProgram = catalogueEntry.program;
  const selectedVersion = catalogueEntry.version;
  const publicationReady = isProgramStartAllowed(catalogueEntry, false);
  const isStartable = isProgramStartAllowed(catalogueEntry, __DEV__);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startContext = useRef({
    database,
    userId,
    programId,
    snapshot: stableSnapshotJSON({ program: selectedProgram, version: selectedVersion }),
  });
  startContext.current = {
    database,
    userId,
    programId,
    snapshot: stableSnapshotJSON({ program: selectedProgram, version: selectedVersion }),
  };
  const startFocus = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const generation = ++startFocus.current;
      return () => {
        if (startFocus.current === generation) startFocus.current++;
      };
    }, [database, userId, programId]),
  );
  const mounted = useRef(true),
    pending = useRef<number | null>(null),
    operationSequence = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const handleStartCycle = async (preview?: {
    startedAt: string;
    timeZone: string;
    startDate: string;
    token: number;
    snapshot: string;
    focusGeneration: number;
  }) => {
    if (starting || pending.current) return;

    // Recheck at the mutation boundary; hiding the button is not a publication gate.
    if (!isProgramStartAllowed(catalogueEntry, __DEV__)) {
      setError('This program is not available to start.');
      return;
    }
    if (!database && !__DEV__) {
      setError('Training storage is unavailable. Please try again when it is ready.');
      return;
    }

    if (!selectedVersion) {
      setError('This program does not have an executable version yet.');
      return;
    }
    if (!preview) {
      const startedAt = new Date().toISOString(),
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const next = {
        startedAt,
        timeZone,
        startDate: lifecycleDate(startedAt, timeZone),
        token: Date.now(),
        snapshot: startContext.current.snapshot,
        focusGeneration: startFocus.current,
      };
      Alert.alert(
        'Start a new six-week cycle?',
        `Start date ${next.startDate} · ${timeZone}. Any active cycle will be paused. Your saved history stays unchanged.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start cycle', onPress: () => void handleStartCycle(next) },
        ],
      );
      return;
    }
    const isCurrent = () =>
      mounted.current &&
      startFocus.current === preview.focusGeneration &&
      isProgramStartAllowed(catalogueEntry, __DEV__) &&
      startContext.current.database === database &&
      startContext.current.userId === userId &&
      startContext.current.programId === programId &&
      startContext.current.snapshot === preview.snapshot;
    if (
      !isCurrent() ||
      lifecycleDate(new Date().toISOString(), preview.timeZone) !== preview.startDate
    ) {
      setError('The plan or date changed. Review Start again.');
      return;
    }
    const operationToken = ++operationSequence.current;
    pending.current = operationToken;
    setStarting(true);
    setError(null);
    try {
      const startedAt = preview.startedAt;
      const programId = `program-${selectedProgram.slug}-${userId}-${preview.token}`;
      if (!selectedVersion)
        throw new Error('This program does not have an executable version yet.');
      const copy = createProgramCopy({
        sourceProgram: selectedProgram,
        sourceVersion: selectedVersion,
        userId,
        newProgramId: programId,
        newVersionId: `${programId}-version-1`,
        createdAt: startedAt,
      });
      const program = {
        ...copy.program,
        title: selectedProgram.title,
        slug: selectedProgram.slug,
        description: selectedProgram.description,
      };
      const cycle = createTrainingCycle({
        id: `cycle-${userId}-${program.id}-${preview.token}`,
        userId,
        programVersion: copy.version,
        startedAt,
      });
      if (database) {
        if (!isCurrent()) return;
        await saveProgramVersion(database, userId, program, copy.version);
        if (!isCurrent()) return;
        await saveTrainingCycleWithSchedule(
          database,
          cycle,
          copy.version,
          preview.timeZone,
          preview.startDate,
          isCurrent,
        );
      }
      if (!isCurrent()) return;
      trackAnalyticsEvent(analytics, 'program_started', {
        programId: selectedProgram.id,
        daysPerWeek: selectedProgram.daysPerWeek,
        sessionLengthMinutes: selectedProgram.sessionLengthMinutes,
      });
      router.replace('/');
    } catch (startError) {
      if (isCurrent())
        setError(
          startError instanceof Error ? startError.message : 'We could not start this cycle.',
        );
    } finally {
      if (pending.current === operationToken) {
        pending.current = null;
        if (mounted.current) setStarting(false);
      }
    }
  };

  if (!selectedEntry || (!__DEV__ && !isStartable)) {
    return (
      <Screen>
        <ErrorState
          title="Program unavailable"
          message="This program is not available in the current release. Choose an available goal from Home."
        />
        <Button label="Return Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Programs"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          PROGRAM DETAIL
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {selectedProgram.title}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {selectedProgram.description}
      </Text>

      <ProgramCard
        program={selectedProgram}
        statusLabel={getProgramRuntimeStatusLabel(catalogueEntry, __DEV__)}
      />

      {isStartable && !publicationReady ? (
        <Card
          tone="yellow"
          style={styles.cycleCard}
          accessibilityLabel="Development preview. Program content review is not complete."
        >
          <Text variant="caption" tone="muted">
            DEVELOPMENT PREVIEW
          </Text>
          <Text variant="small" tone="muted" style={styles.cardText}>
            This executable draft is available only for internal QA. It is not publication-ready
            fitness content.
          </Text>
        </Card>
      ) : null}

      {isStartable ? (
        <Card tone="lavender" style={styles.cycleCard}>
          <View style={styles.cardHeader}>
            <Text variant="h3">Six-week shape</Text>
            <Text variant="smallMedium">{selectedProgram.sessionLengthMinutes} min</Text>
          </View>
          <SixWeekIndicator
            weeks={selectedVersion?.cycleModel.lengthWeeks === 6 ? buildWeeks(selectedVersion) : []}
          />
          <Text variant="small" tone="muted" style={styles.cardText}>
            Establish → repeat → build → challenge → consolidate and review. Week 6 is not a forced
            deload.
          </Text>
        </Card>
      ) : (
        <Card tone="yellow" style={styles.cycleCard} accessibilityLabel="Program content in build">
          <Text variant="caption" tone="muted">
            CONTENT IN BUILD
          </Text>
          <Text variant="h3" style={styles.buildTitle}>
            This program is being reviewed.
          </Text>
          <Text variant="small" tone="muted" style={styles.cardText}>
            The six-week version, exercise substitutions, progression rules, and safety content must
            pass review before it can start a cycle.
          </Text>
        </Card>
      )}

      <Card tone="white" style={styles.equipmentCard}>
        <Text variant="caption" tone="muted">
          EQUIPMENT
        </Text>
        <Text variant="smallMedium" style={styles.equipmentTitle}>
          Required
        </Text>
        <Text variant="small" tone="muted">
          {formatEquipment(selectedProgram.requiredEquipmentIds)}
        </Text>
        <Text variant="smallMedium" style={styles.equipmentTitle}>
          Optional
        </Text>
        <Text variant="small" tone="muted">
          {formatEquipment(selectedProgram.optionalEquipmentIds)}
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Weekly structure
      </Text>
      {isStartable ? (
        selectedVersion?.workouts.map((workout) => (
          <Card key={workout.id} tone="white" style={styles.workoutCard}>
            <View style={styles.workoutHeader}>
              <Text variant="smallMedium">Day {workout.dayOfWeek}</Text>
              <Text variant="small" tone="muted">
                {workout.estimatedDurationMinutes} min
              </Text>
            </View>
            <Text variant="h3" style={styles.workoutTitle}>
              {workout.title}
            </Text>
            <Text variant="small" tone="muted">
              {workout.exercises.length} movements · {workout.equipmentIds.length} equipment types
              {workout.isOptional ? ' · optional' : ''}
            </Text>
            <Button
              label={`Open ${workout.title}`}
              variant="ghost"
              icon={<Ionicons name="arrow-forward" size={18} color={colors.ink} />}
              onPress={() =>
                router.push({ pathname: '/workout', params: { workoutId: workout.id } })
              }
              style={styles.openWorkoutButton}
            />
          </Card>
        ))
      ) : (
        <Card tone="white" style={styles.workoutCard}>
          <Text variant="smallMedium">
            {selectedProgram.daysPerWeek} sessions · {selectedProgram.sessionLengthMinutes} min
          </Text>
          <Text variant="small" tone="muted" style={styles.cardText}>
            Session details will appear here after the executable version is reviewed and published.
          </Text>
        </Card>
      )}

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      {isStartable ? (
        <Button
          label={publicationReady ? 'Start six-week cycle' : 'Start draft preview'}
          onPress={() => void handleStartCycle()}
          loading={starting}
          icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
          style={styles.startButton}
        />
      ) : (
        <Button
          label="Back to program library"
          variant="secondary"
          onPress={() => router.replace('/programs')}
          icon={<Ionicons name="library-outline" size={18} color={colors.ink} />}
          style={styles.startButton}
        />
      )}
      <Text variant="caption" tone="muted" style={styles.persistenceNote}>
        {database
          ? publicationReady
            ? 'Your selected program version will be snapshotted on this device.'
            : isStartable
              ? 'Development preview: this draft can be tested locally but is not release-ready.'
              : 'This catalogue entry is not startable until its content review gates pass.'
          : Platform.OS === 'web'
            ? 'Web preview: cycle persistence is not active in this surface.'
            : 'This program version will be snapshotted locally before future sync.'}
      </Text>
    </Screen>
  );
}

function formatEquipment(ids: readonly string[]): string {
  const names = ids
    .map((id) => equipmentCatalog.find((equipment) => equipment.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(' · ') : 'None listed';
}

function buildWeeks(version: NonNullable<(typeof programLibrary)[number]['version']>) {
  return Array.from({ length: 6 }, (_, index) => ({
    weekNumber: index + 1,
    label: `Week ${index + 1}`,
    phase: version.cycleModel.phases[index + 1] ?? 'Training',
    status: index === 0 ? ('current' as const) : ('upcoming' as const),
    completedWorkoutCount: 0,
    plannedWorkoutCount: version.workouts.filter((workout) => !workout.isOptional).length,
  }));
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
  cycleCard: {
    marginTop: spacing.xl,
  },
  buildTitle: {
    marginTop: spacing.sm,
  },
  equipmentCard: {
    marginTop: spacing.md,
  },
  equipmentTitle: {
    marginTop: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cardText: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  workoutCard: {
    marginBottom: spacing.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  openWorkoutButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 0,
  },
  startButton: {
    marginTop: spacing.xl,
  },
  persistenceNote: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
