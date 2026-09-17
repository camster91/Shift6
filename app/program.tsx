import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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
import { saveTrainingCycle } from '../src/db/cycleRepository';
import { createTrainingCycle } from '../src/domain/cycle';
import { equipmentCatalog } from '../src/domain/equipment';
import { createProgramCopy } from '../src/domain/programBuilder';
import {
  canStartProgramCatalogueEntry,
  getProgramCatalogueStatusLabel,
  programLibrary,
} from '../src/domain/programLibrary';
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
  const catalogueEntry =
    programLibrary.find((entry) => entry.program.id === programId) ?? programLibrary[0]!;
  const selectedProgram = catalogueEntry.program;
  const selectedVersion = catalogueEntry.version;
  const isPublished = canStartProgramCatalogueEntry(catalogueEntry);
  const isDevelopmentPreview =
    !isPublished && canStartProgramCatalogueEntry(catalogueEntry, __DEV__);
  const isStartable = isPublished || isDevelopmentPreview;
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartCycle = async () => {
    if (starting) return;
    if (!isStartable) {
      setError('This program is still in content review and cannot start a public cycle yet.');
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const startedAt = new Date().toISOString();
      const programId = `program-${selectedProgram.slug}-${userId}-${Date.now()}`;
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
        id: `cycle-${userId}-${program.id}-${Date.now()}`,
        userId,
        programVersion: copy.version,
        startedAt,
      });
      if (database) {
        await saveProgramVersion(database, userId, program, copy.version);
        await saveTrainingCycle(database, cycle);
      }
      trackAnalyticsEvent(analytics, 'program_started', {
        programId: selectedProgram.id,
        daysPerWeek: selectedProgram.daysPerWeek,
        sessionLengthMinutes: selectedProgram.sessionLengthMinutes,
        developmentPreview: isDevelopmentPreview,
      });
      router.replace('/');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'We could not start this cycle.');
    } finally {
      setStarting(false);
    }
  };

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
        statusLabel={
          isDevelopmentPreview
            ? 'Draft preview'
            : getProgramCatalogueStatusLabel(catalogueEntry.status)
        }
      />

      {isStartable ? (
        <Card tone={isDevelopmentPreview ? 'yellow' : 'lavender'} style={styles.cycleCard}>
          {isDevelopmentPreview ? (
            <>
              <Text variant="caption" tone="muted">
                DEVELOPMENT PREVIEW · DRAFT CONTENT
              </Text>
              <Text variant="small" tone="muted" style={styles.previewWarning}>
                This internal preview is available only in development builds. Exercise technique
                content is not yet approved for public release.
              </Text>
            </>
          ) : null}
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
        <Card tone="yellow" style={styles.cycleCard} accessibilityLabel="Program content in review">
          <Text variant="caption" tone="muted">
            CONTENT IN REVIEW
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
          label={isDevelopmentPreview ? 'Start draft preview' : 'Start six-week cycle'}
          onPress={handleStartCycle}
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
          ? isDevelopmentPreview
            ? 'Development preview only. The draft program will be snapshotted locally for QA.'
            : isStartable
              ? 'Your selected program version will be snapshotted on this device.'
              : 'This catalogue entry is not startable until its content review passes.'
          : Platform.OS === 'web'
            ? 'Web preview: cycle persistence is not active in this surface.'
            : isDevelopmentPreview
              ? 'Development preview only. Draft content is not approved for public release.'
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
  previewWarning: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
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
