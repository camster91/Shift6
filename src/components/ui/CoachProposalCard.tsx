import { StyleSheet, View } from 'react-native';

import type { CoachProposal } from '../../domain/types';
import { colors, radii, spacing } from '../../design/tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { Text } from './Text';

export interface CoachProposalCardProps {
  proposal: CoachProposal;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}

export function CoachProposalCard({
  proposal,
  onApprove,
  onReject,
  busy = false,
}: CoachProposalCardProps) {
  return (
    <Card
      tone="white"
      accessibilityLabel={`Coach proposal. ${proposal.summary}. ${proposal.changes.length} proposed changes.`}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text variant="h3" style={styles.title}>
          {proposal.summary}
        </Text>
        <Chip
          label={`${proposal.confidence} confidence`}
          selected={proposal.confidence === 'high'}
        />
      </View>

      <Text variant="caption" tone="muted" style={styles.sectionLabel}>
        EVIDENCE
      </Text>
      <View style={styles.list}>
        {proposal.evidence.map((evidence) => (
          <Text key={evidence} variant="small" tone="muted">
            • {evidence}
          </Text>
        ))}
      </View>

      {proposal.changes.length > 0 ? (
        <View style={styles.changes} accessibilityLabel="Proposed plan changes">
          <Text variant="caption" tone="muted">
            PROPOSED CHANGES
          </Text>
          {proposal.changes.map((change) => (
            <View key={change.id} style={styles.changeRow}>
              <Text variant="smallMedium">{change.field}</Text>
              <Text variant="small" tone="muted">
                {change.from} → {change.to}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {proposal.safetyNotes.length > 0 ? (
        <View style={styles.safety} accessibilityLabel="Coach safety notes">
          <Text variant="caption" tone="warning">
            SAFETY NOTES
          </Text>
          {proposal.safetyNotes.map((note) => (
            <Text key={note} variant="small" tone="muted">
              {note}
            </Text>
          ))}
        </View>
      ) : null}

      <Text variant="caption" tone="muted" style={styles.confirmationNote}>
        Approval applies supported changes to a new private plan revision. Nothing changes without
        your explicit decision.
      </Text>
      <View style={styles.actions}>
        <Button label="Keep current" variant="secondary" onPress={onReject} disabled={busy} />
        <Button
          label={proposal.changes.length > 0 ? 'Approve & apply' : 'Approve proposal'}
          onPress={onApprove}
          loading={busy}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: spacing.xl,
  },
  list: {
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  changes: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderBackground,
    gap: spacing.xs,
  },
  changeRow: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(13,16,27,0.10)',
    gap: spacing.xxs,
  },
  safety: {
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  confirmationNote: {
    marginTop: spacing.xl,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
