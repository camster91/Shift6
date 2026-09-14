import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  CoachProposalCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Screen,
  Text,
} from '../../src/components/ui';
import { useLocalDatabase } from '../../src/db/context';
import { getActiveTrainingCycle } from '../../src/db/cycleRepository';
import { getPendingCoachProposals, updateCoachProposalStatus } from '../../src/db/coachRepository';
import { demoCoachProposal } from '../../src/domain/fixtures/home';
import type { CoachProposal } from '../../src/domain/types';
import { colors, radii, spacing } from '../../src/design/tokens';

export default function CoachScreen() {
  const database = useLocalDatabase();
  const [proposals, setProposals] = useState<CoachProposal[]>([]);
  const [loading, setLoading] = useState(database !== null);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const cycle = await getActiveTrainingCycle(database, 'guest-user');
        const pending = cycle
          ? await getPendingCoachProposals(database, 'guest-user', cycle.id)
          : [];
        if (active) setProposals(pending);
      } catch {
        if (active) setError('We could not load Coach proposals from this device.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [database]);

  const decide = async (proposalId: string, status: 'accepted' | 'rejected') => {
    if (!database || busyProposalId) return;

    setBusyProposalId(proposalId);
    setError(null);
    try {
      await updateCoachProposalStatus(database, proposalId, status, new Date().toISOString());
      setProposals((current) => current.filter((proposal) => proposal.id !== proposalId));
    } catch {
      setError('We could not save that Coach decision locally.');
    } finally {
      setBusyProposalId(null);
    }
  };

  return (
    <Screen>
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
            <Text variant="h3">Week 1: establish.</Text>
          </View>
        </View>
        <Text variant="body" style={styles.noteBody}>
          {demoCoachProposal.summary}
        </Text>
        <Text variant="small" tone="muted">
          Facts first. Suggestions require your approval.
        </Text>
      </Card>

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
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
});
