import { View } from 'react-native';
import { useState } from 'react';
import { Button, Card, Text } from './ui';
import {
  availableCoachCapabilities,
  type CoachCapabilityState,
  type CoachNavigationCapability,
} from '../domain/coachCapabilities';
import { spacing } from '../design/tokens';

export function CoachWorkflowActions({
  state,
  busy,
  onOpen,
}: {
  state: CoachCapabilityState;
  busy: boolean;
  onOpen: (id: CoachNavigationCapability) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const primary = state.hasCycle
    ? ['open-workout-controls', 'open-calendar', 'open-goal', 'open-local-review']
    : state.hasProfile
      ? ['build-private-plan', 'open-setup', 'open-history']
      : ['open-setup', 'open-data-controls', 'open-health-controls'];
  const capabilities = availableCoachCapabilities(state).sort((a, b) => {
    const rank = (id: string) => (primary.includes(id) ? primary.indexOf(id) : primary.length);
    return rank(a.id) - rank(b.id);
  });
  return (
    <Card tone="white">
      <Text variant="h2">Choose your next step</Text>
      <Text variant="small">
        These local controls open existing app workflows. They do not save a set, change your plan
        or request permission. Start or resume from the workout controls.
      </Text>
      {capabilities
        .filter((capability) => expanded || primary.includes(capability.id))
        .map((capability) => (
          <View key={capability.id} style={{ marginTop: spacing.sm }}>
            <Button
              label={capability.label}
              variant="secondary"
              disabled={busy || !capability.available}
              onPress={() => onOpen(capability.id)}
            />
            {capability.reason ? (
              <Text variant="caption" tone="muted">
                {capability.reason}
              </Text>
            ) : null}
          </View>
        ))}
      <Button
        label={expanded ? 'Show fewer controls' : 'More local controls'}
        variant="ghost"
        onPress={() => setExpanded((value) => !value)}
      />
    </Card>
  );
}
