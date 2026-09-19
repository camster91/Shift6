import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, EmptyState, ProgramCard, Screen, Text } from '../../src/components/ui';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { useLocalDatabase } from '../../src/db/context';
import { demoUser } from '../../src/domain/fixtures/home';
import { recommendPrograms } from '../../src/domain/onboarding';
import { programLibrary, programLibraryPrograms } from '../../src/domain/programLibrary';
import { getProgramRuntimeStatusLabel } from '../../src/domain/runtimeContentGates';
import { colors, spacing } from '../../src/design/tokens';
import { useCurrentUserId } from '../../src/services/UserIdentityProvider';

export default function ProgramsScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [profilePreferences, setProfilePreferences] = useState({
    goals: demoUser.goals,
    experience: demoUser.experience,
    equipmentIds: demoUser.equipmentIds,
    trainingDaysPerWeek: demoUser.trainingDaysPerWeek,
    preferredSessionMinutes: demoUser.preferredSessionMinutes,
  });
  const [recommendedOnly, setRecommendedOnly] = useState(true);
  const [daysOnly, setDaysOnly] = useState(false);
  const [minutesOnly, setMinutesOnly] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!database) {
        setProfileDisplayName(null);
        setProfilePreferences({
          goals: demoUser.goals,
          experience: demoUser.experience,
          equipmentIds: demoUser.equipmentIds,
          trainingDaysPerWeek: demoUser.trainingDaysPerWeek,
          preferredSessionMinutes: demoUser.preferredSessionMinutes,
        });
        return undefined;
      }

      let active = true;
      void getOnboardingProfile(database, userId)
        .then((profile) => {
          if (!active) return;
          if (!profile) {
            setProfileDisplayName(null);
            setProfilePreferences({
              goals: demoUser.goals,
              experience: demoUser.experience,
              equipmentIds: demoUser.equipmentIds,
              trainingDaysPerWeek: demoUser.trainingDaysPerWeek,
              preferredSessionMinutes: demoUser.preferredSessionMinutes,
            });
            return;
          }

          setProfileDisplayName(profile.user.displayName);
          setProfilePreferences({
            goals: profile.user.goals,
            experience: profile.user.experience,
            equipmentIds: profile.user.equipmentIds,
            trainingDaysPerWeek: profile.user.trainingDaysPerWeek,
            preferredSessionMinutes: profile.user.preferredSessionMinutes,
          });
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [database, userId]),
  );

  const recommendations = useMemo(
    () => recommendPrograms(programLibraryPrograms, profilePreferences),
    [profilePreferences],
  );

  const filteredRecommendations = useMemo(() => {
    const filtered = recommendations.filter(({ program }) => {
      if (daysOnly && program.daysPerWeek !== profilePreferences.trainingDaysPerWeek) {
        return false;
      }
      if (
        minutesOnly &&
        program.sessionLengthMinutes !== profilePreferences.preferredSessionMinutes
      ) {
        return false;
      }
      return true;
    });

    if (!recommendedOnly) {
      return [...filtered].sort((left, right) =>
        left.program.title.localeCompare(right.program.title),
      );
    }

    return filtered;
  }, [daysOnly, minutesOnly, profilePreferences, recommendedOnly, recommendations]);

  const featuredRecommendations = useMemo(() => {
    if (!recommendedOnly) return filteredRecommendations.slice(0, 3);

    const compatible = filteredRecommendations.filter(
      (recommendation) => recommendation.compatible,
    );
    return (compatible.length > 0 ? compatible : filteredRecommendations).slice(0, 3);
  }, [filteredRecommendations, recommendedOnly]);

  const featuredIds = new Set(featuredRecommendations.map(({ program }) => program.id));
  const additionalRecommendations = filteredRecommendations.filter(
    ({ program }) => !featuredIds.has(program.id),
  );

  const catalogueEntryByProgramId = useMemo(
    () => new Map(programLibrary.map((entry) => [entry.program.id, entry])),
    [],
  );

  return (
    <Screen>
      <Text variant="caption" tone="muted">
        PROGRAM LIBRARY
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Build the next six weeks.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Start with a clear framework, then make it yours as your training evolves.
      </Text>

      <View style={styles.filterRow}>
        <Chip
          label="Recommended"
          selected={recommendedOnly}
          onPress={() => setRecommendedOnly((value) => !value)}
        />
        <Chip
          label={`${profilePreferences.trainingDaysPerWeek} days`}
          selected={daysOnly}
          onPress={() => setDaysOnly((value) => !value)}
        />
        <Chip
          label={`${profilePreferences.preferredSessionMinutes} min`}
          selected={minutesOnly}
          onPress={() => setMinutesOnly((value) => !value)}
        />
      </View>

      <Text variant="small" tone="muted" style={styles.recommendationNote}>
        {profileDisplayName
          ? `Recommendations use ${profileDisplayName}'s goals, experience, schedule, and equipment.`
          : 'Recommendations use the local demo profile until onboarding is completed.'}
      </Text>

      <Text variant="h2" style={styles.sectionTitle}>
        For your equipment
      </Text>
      {featuredRecommendations.length === 0 ? (
        <EmptyState
          title="No programs match these filters"
          message="Clear a filter to see the full launch catalogue and its equipment requirements."
          actionLabel="Show all programs"
          onAction={() => {
            setRecommendedOnly(false);
            setDaysOnly(false);
            setMinutesOnly(false);
          }}
          icon={<Ionicons name="options-outline" size={28} color={colors.ink} />}
        />
      ) : (
        featuredRecommendations.map((recommendation) => {
          const catalogueEntry = catalogueEntryByProgramId.get(recommendation.program.id);
          return (
            <View key={recommendation.program.id} style={styles.recommendationItem}>
              <ProgramCard
                program={recommendation.program}
                statusLabel={catalogueEntry ? getProgramRuntimeStatusLabel(catalogueEntry, __DEV__) : undefined}
                onPress={() =>
                  router.push({
                    pathname: '/program',
                    params: { programId: recommendation.program.id },
                  })
                }
              />
              <Text
                variant="small"
                tone={recommendation.compatible ? 'success' : 'warning'}
                style={styles.recommendationReason}
              >
                {recommendation.compatible
                  ? recommendation.reasons[0]
                  : recommendation.reasons[recommendation.reasons.length - 1]}
              </Text>
            </View>
          );
        })
      )}

      <Button
        label="Personalize recommendations"
        variant="secondary"
        icon={<Ionicons name="options-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/onboarding')}
        style={styles.personalizeButton}
      />

      <Button
        label="Browse exercise library"
        variant="ghost"
        icon={<Ionicons name="search-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/exercises')}
        style={styles.exerciseLibraryButton}
      />

      <Button
        label="Create a custom copy"
        variant="ghost"
        icon={<Ionicons name="create-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/builder')}
        style={styles.builderButton}
      />

      <Button
        label="Build from blank"
        variant="ghost"
        icon={<Ionicons name="add-circle-outline" size={18} color={colors.ink} />}
        onPress={() => router.push({ pathname: '/builder', params: { mode: 'blank' } })}
        style={styles.builderButton}
      />

      <Text variant="h2" style={styles.moreProgramsTitle}>
        More ways to train
      </Text>
      <Text variant="small" tone="muted" style={styles.libraryNote}>
        {`${additionalRecommendations.length} more matching launch program${additionalRecommendations.length === 1 ? '' : 's'}. Additional versions are being built and reviewed before they can start a cycle.`}
      </Text>
      {additionalRecommendations.map((recommendation) => {
        const catalogueEntry = catalogueEntryByProgramId.get(recommendation.program.id);
        return (
          <ProgramCard
            key={recommendation.program.id}
            program={recommendation.program}
            statusLabel={catalogueEntry ? getProgramRuntimeStatusLabel(catalogueEntry, __DEV__) : undefined}
            onPress={() =>
              router.push({
                pathname: '/program',
                params: { programId: recommendation.program.id },
              })
            }
            style={styles.catalogueCard}
          />
        );
      })}

      <Card tone="mint" style={styles.foundationCard}>
        <Ionicons name="construct-outline" size={24} color={colors.ink} />
        <Text variant="h3" style={styles.cardTitle}>
          Your library is taking shape.
        </Text>
        <Text variant="body" tone="muted">
          The curated catalogue and custom builder will share the same versioned program model.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  recommendationNote: {
    marginTop: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  recommendationItem: {
    marginBottom: spacing.md,
  },
  recommendationReason: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  foundationCard: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  personalizeButton: {
    marginTop: spacing.md,
  },
  exerciseLibraryButton: {
    marginTop: spacing.xs,
  },
  builderButton: {
    marginTop: spacing.xs,
  },
  moreProgramsTitle: {
    marginTop: spacing.xxxl,
  },
  libraryNote: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  catalogueCard: {
    marginBottom: spacing.sm,
  },
  cardTitle: {
    marginTop: spacing.xs,
  },
});
