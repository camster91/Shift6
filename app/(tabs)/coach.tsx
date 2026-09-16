import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  CoachProposalCard,
  Chip,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Screen,
  Text,
} from '../../src/components/ui';
import {
  acceptCoachProposalWithRevision,
  getPendingCoachProposals,
  updateCoachProposalStatus,
} from '../../src/db/coachRepository';
import { getCoachPrivacyPreference } from '../../src/db/coachPrivacyRepository';
import { getActiveTrainingCycle } from '../../src/db/cycleRepository';
import { useLocalDatabase } from '../../src/db/context';
import { getCycleProgressSummary } from '../../src/db/progressRepository';
import { getUserProgramVersion } from '../../src/db/programRepository';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { demoCycle, demoProgramVersion, demoUser } from '../../src/domain/fixtures/home';
import { buildCycleProgressSummary, type CycleProgressSummary } from '../../src/domain/progression';
import type { CoachContext, CoachMessageResult, CoachTask } from '../../src/services/contracts';
import type {
  CoachProposal,
  Program,
  ProgramVersion,
  TrainingCycle,
  User,
} from '../../src/domain/types';
import { colors, radii, spacing } from '../../src/design/tokens';
import { useAppServices } from '../../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../../src/services/analytics';
import { generatePrivacyAwareCoachMessage } from '../../src/services/coachPrivacy';
import { buildLocalCoachMessage } from '../../src/services/localCoach';
import { useCurrentUserId } from '../../src/services/UserIdentityProvider';

export default function CoachScreen() {
  const { analytics, coach } = useAppServices();
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [proposals, setProposals] = useState<CoachProposal[]>([]);
  const [activeCycle, setActiveCycle] = useState<TrainingCycle | null>(null);
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [activeProgramVersion, setActiveProgramVersion] = useState<ProgramVersion | null>(null);
  const [coachContext, setCoachContext] = useState<CoachContext>(() =>
    createCoachContext(
      demoUser,
      demoCycle,
      demoProgramVersion,
      buildCycleProgressSummary(getPlannedWorkoutCount(demoCycle), []),
    ),
  );
  const [coachMessage, setCoachMessage] = useState<CoachMessageResult | null>(null);
  const [loading, setLoading] = useState(database !== null);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachSource, setCoachSource] = useState<'local' | 'remote'>('local');
  const [providerCoachEnabled, setProviderCoachEnabled] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const trackedProposalIds = useRef(new Set<string>());

  useEffect(() => {
    for (const proposal of proposals) {
      if (trackedProposalIds.current.has(proposal.id)) continue;
      trackedProposalIds.current.add(proposal.id);
      trackAnalyticsEvent(analytics, 'coach_proposal_shown', {
        proposalId: proposal.id,
        changeCount: proposal.changes.length,
        confidence: proposal.confidence,
      });
    }
  }, [analytics, proposals]);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const cycle = await getActiveTrainingCycle(database, userId);
        const snapshot = cycle
          ? await getUserProgramVersion(database, userId, cycle.programVersionId)
          : null;
        const pending = cycle ? await getPendingCoachProposals(database, userId, cycle.id) : [];
        const profile = await getOnboardingProfile(database, userId);
        const summary = cycle
          ? await getCycleProgressSummary(database, cycle.id, getPlannedWorkoutCount(cycle))
          : buildCycleProgressSummary(getPlannedWorkoutCount(demoCycle), []);
        if (active) {
          setActiveCycle(cycle);
          setActiveProgram(snapshot?.program ?? null);
          setActiveProgramVersion(snapshot?.version ?? null);
          setProposals(pending);
          setCoachContext(
            createCoachContext(
              profile?.user ?? demoUser,
              cycle ?? demoCycle,
              snapshot?.version ?? demoProgramVersion,
              summary,
            ),
          );
        }
      } catch {
        if (active) setError('We could not load Coach proposals from this device.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [database, userId]);

  useEffect(() => {
    setProviderCoachEnabled(false);
    if (!database) return;

    let active = true;
    void getCoachPrivacyPreference(database, userId)
      .then((preference) => {
        if (active) setProviderCoachEnabled(preference.providerCoachEnabled);
      })
      .catch(() => {
        if (active) setProviderCoachEnabled(false);
      });

    return () => {
      active = false;
    };
  }, [database, userId]);

  const decide = async (proposalId: string, status: 'accepted' | 'rejected') => {
    if (!database || busyProposalId) return;

    setBusyProposalId(proposalId);
    setError(null);
    try {
      const proposal = proposals.find((candidate) => candidate.id === proposalId);
      if (!proposal) throw new Error('This Coach proposal is no longer available.');
      const now = new Date().toISOString();
      if (status === 'accepted') {
        if (!activeCycle || !activeProgram || !activeProgramVersion) {
          throw new Error('The active plan is not available for a safe Coach approval.');
        }
        const result = await acceptCoachProposalWithRevision(
          database,
          userId,
          proposal,
          activeProgram,
          activeProgramVersion,
          activeCycle,
          now,
        );
        if (result.status === 'updated') {
          setActiveProgram(result.program);
          setActiveProgramVersion(result.version);
          setActiveCycle(result.cycle);
        }
      } else {
        await updateCoachProposalStatus(database, proposalId, status, now);
      }
      if (status === 'accepted') {
        trackAnalyticsEvent(analytics, 'coach_proposal_accepted', {
          proposalId: proposal.id,
          changeCount: proposal.changes.length,
        });
      }
      setProposals((current) => current.filter((proposal) => proposal.id !== proposalId));
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : 'We could not save that Coach decision locally.',
      );
    } finally {
      setBusyProposalId(null);
    }
  };

  const coachNote = buildLocalCoachMessage(coachContext, 'explain-workout');
  const askCoach = async (task: CoachTask, prompt = '') => {
    if (coachLoading) return;
    setCoachLoading(true);
    try {
      const response = await generatePrivacyAwareCoachMessage({
        providerCoachEnabled,
        gateway: coach,
        context: coachContext,
        task,
        prompt,
      });
      setCoachSource(response.source);
      setCoachMessage(response.result);
    } finally {
      setCoachLoading(false);
    }
  };

  const submitQuestion = () => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || coachLoading) return;
    setQuestion('');
    void askCoach('freeform', normalizedQuestion);
  };

  return (
    <Screen scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <Text variant="caption" tone="muted">
        SHIFT6 COACH
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        A thoughtful next step.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Coach guidance will stay grounded in your approved plan and logged training.
      </Text>

      <Card tone="lavender" style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <View style={styles.icon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.ink} />
          </View>
          <View style={styles.noteHeading}>
            <Text variant="caption" tone="muted">
              TODAY'S NOTE
            </Text>
            <Text variant="h3">Week {coachContext.cycle.currentWeek}: stay repeatable.</Text>
          </View>
        </View>
        <Text variant="body" style={styles.noteBody}>
          {coachNote.text}
        </Text>
        <Text variant="small" tone="muted">
          Facts first. Suggestions require your approval.
        </Text>
      </Card>

      <Card tone="white" style={styles.privacyCard}>
        <View style={styles.privacyHeader}>
          <Ionicons
            name={providerCoachEnabled ? 'cloud-outline' : 'phone-portrait-outline'}
            size={22}
            color={colors.ink}
          />
          <View style={styles.privacyCopy}>
            <Text variant="smallMedium">
              {providerCoachEnabled ? 'Provider-backed Coach enabled' : 'Local Coach only'}
            </Text>
            <Text variant="caption" tone="muted">
              {providerCoachEnabled
                ? 'Questions may use the configured Coach service with bounded training context.'
                : 'Questions stay with the deterministic local explainer; no provider request is made.'}
            </Text>
          </View>
        </View>
        <Button
          label="Review AI & Coach privacy"
          variant="ghost"
          icon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.ink} />}
          onPress={() => router.push('/ai-privacy')}
          style={styles.privacyButton}
        />
      </Card>

      <Card tone="white" style={styles.askCard} accessibilityLabel="Ask Coach">
        <Text variant="caption" tone="muted">
          ASK COACH
        </Text>
        <Text variant="h3" style={styles.askTitle}>
          Make the next step clear.
        </Text>
        <TextInput
          accessibilityHint={
            providerCoachEnabled
              ? 'May use the configured provider-backed Coach with bounded context.'
              : 'Uses the local Coach because provider-backed processing is off.'
          }
          accessibilityLabel="Ask Coach a question"
          autoCapitalize="sentences"
          autoCorrect
          maxLength={500}
          multiline
          onChangeText={setQuestion}
          onSubmitEditing={submitQuestion}
          placeholder="What should I focus on today?"
          placeholderTextColor={colors.inkMuted}
          returnKeyType="send"
          style={styles.questionInput}
          value={question}
        />
        <View style={styles.questionFooter}>
          <Text
            variant="caption"
            tone="muted"
            accessibilityLabel={`${question.length} of 500 characters`}
          >
            {question.length}/500
          </Text>
          <Button
            accessibilityHint={
              providerCoachEnabled
                ? 'Uses provider-backed Coach when available, with local fallback.'
                : 'Uses the local Coach only.'
            }
            disabled={!question.trim()}
            icon={<Ionicons name="arrow-up" size={18} color={colors.white} />}
            label="Ask Coach"
            loading={coachLoading}
            onPress={submitQuestion}
            style={styles.askButton}
          />
        </View>
        <View style={styles.askChips}>
          <Chip
            disabled={coachLoading}
            label={coachLoading ? 'Coach is thinking…' : "Explain today's workout"}
            onPress={() => void askCoach('explain-workout')}
          />
          <Chip
            disabled={coachLoading}
            label="Review my progress"
            onPress={() => void askCoach('weekly-review')}
          />
          <Chip
            disabled={coachLoading}
            label="Shorten this session"
            onPress={() => void askCoach('shorten-workout')}
          />
          <Chip
            disabled={coachLoading}
            label="Find a substitution"
            onPress={() => void askCoach('substitution')}
          />
        </View>
      </Card>

      {coachMessage ? (
        <Card
          tone={coachMessage.kind === 'safety-route' ? 'coral' : 'blue'}
          style={styles.messageCard}
          accessibilityLabel={`Coach response: ${coachMessage.text}`}
        >
          <View style={styles.messageHeader}>
            <Ionicons
              name={coachMessage.kind === 'safety-route' ? 'warning-outline' : 'sparkles-outline'}
              size={22}
              color={colors.ink}
            />
            <Text variant="caption" tone="muted">
              {coachMessage.kind === 'safety-route'
                ? 'SAFETY ROUTE'
                : coachSource === 'remote'
                  ? 'COACH RESPONSE'
                  : 'LOCAL COACH NOTE'}
            </Text>
          </View>
          <Text variant="body" style={styles.messageBody}>
            {coachMessage.text}
          </Text>
          <Text variant="caption" tone="muted">
            Facts used: {coachMessage.factsUsed.join(' · ')}
          </Text>
        </Card>
      ) : null}

      <Text variant="h2" style={styles.sectionTitle}>
        Proposals
      </Text>
      {loading ? <LoadingSkeleton height={220} /> : null}
      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {!loading && proposals.length > 0
        ? proposals.map((proposal) => (
            <CoachProposalCard
              key={proposal.id}
              proposal={proposal}
              busy={busyProposalId === proposal.id}
              onApprove={() => void decide(proposal.id, 'accepted')}
              onReject={() => void decide(proposal.id, 'rejected')}
            />
          ))
        : null}
      {!loading && proposals.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />}
          title="No plan changes yet"
          message="When the data supports a meaningful adjustment, you’ll see the current plan, proposed change, and reason here."
        />
      ) : null}
    </Screen>
  );
}

function getPlannedWorkoutCount(cycle: TrainingCycle): number {
  return cycle.weeks.reduce((total, week) => total + week.plannedWorkoutCount, 0);
}

function createCoachContext(
  user: User,
  cycle: TrainingCycle,
  programVersion: ProgramVersion,
  summary: CycleProgressSummary,
): CoachContext {
  const workout = programVersion.workouts[0];
  return {
    user: {
      id: user.id,
      unitSystem: user.unitSystem,
      goals: user.goals,
      experience: user.experience,
    },
    cycle: {
      id: cycle.id,
      programVersionId: cycle.programVersionId,
      currentWeek: cycle.currentWeek,
      status: cycle.status,
    },
    structuredFacts: {
      workoutTitle: workout?.title ?? 'your next workout',
      workoutFocus: workout?.focus ?? 'training',
      estimatedDurationMinutes: workout?.estimatedDurationMinutes,
      currentWeek: cycle.currentWeek,
      completedWorkoutCount: summary.facts.completedWorkoutCount,
      plannedWorkoutCount: summary.facts.plannedWorkoutCount,
      completionRate: summary.facts.completionRate,
      cardioMinutes: summary.facts.cardioMinutes,
      personalRecordCount: summary.facts.personalRecordIds.length,
    },
  };
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  noteCard: {
    marginTop: spacing.xl,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteHeading: {
    gap: spacing.xs,
  },
  noteBody: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  privacyCard: {
    marginTop: spacing.xl,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  privacyCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  privacyButton: {
    marginTop: spacing.md,
  },
  askCard: {
    marginTop: spacing.md,
  },
  askTitle: {
    marginTop: spacing.sm,
  },
  questionInput: {
    minHeight: 96,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  askButton: {
    flex: 1,
  },
  askChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  messageCard: {
    marginTop: spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  messageBody: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
});
