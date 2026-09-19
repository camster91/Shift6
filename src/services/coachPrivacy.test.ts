import type { CoachProposal } from '../domain/types';
import type { CoachContext, CoachGateway } from './contracts';
import { CoachGatewayUnavailableError } from './coach';
import {
  generatePrivacyAwareCoachMessage,
  generatePrivacyAwareCoachProposal,
} from './coachPrivacy';

const context: CoachContext = {
  user: {
    id: 'guest-user',
    unitSystem: 'imperial',
    goals: ['strength'],
    experience: 'beginner',
  },
  cycle: {
    id: 'cycle-1',
    programVersionId: 'version-1',
    currentWeek: 2,
    status: 'active',
  },
  structuredFacts: {
    workoutTitle: 'Strength A',
    workoutFocus: 'strength',
    estimatedDurationMinutes: 30,
    currentWeek: 2,
    completedWorkoutCount: 2,
    plannedWorkoutCount: 3,
    completionRate: 2 / 3,
  },
};

const proposal: CoachProposal = {
  id: 'proposal-1',
  summary: 'Add one rep to the next target.',
  confidence: 'medium',
  evidence: ['The same target was completed twice.'],
  changes: [
    {
      id: 'change-1',
      type: 'target-change',
      field: 'reps',
      from: '6',
      to: '7',
      requiresUserConfirmation: true,
    },
  ],
  safetyNotes: [],
  status: 'pending',
  createdAt: '2026-09-16T12:00:00.000Z',
};

function gateway(
  generateMessage: CoachGateway['generateMessage'],
  generateProposal: CoachGateway['generateProposal'] = async () =>
    Promise.reject(new Error('not used')),
): CoachGateway {
  return {
    generateMessage,
    generateProposal,
  };
}

describe('privacy-aware Coach generation', () => {
  it('never calls the provider gateway while provider message processing is disabled', async () => {
    const generateMessage = jest.fn(async () => ({
      kind: 'message' as const,
      text: 'remote result',
      factsUsed: [],
    }));

    await expect(
      generatePrivacyAwareCoachMessage({
        providerCoachEnabled: false,
        gateway: gateway(generateMessage),
        context,
        task: 'weekly-review',
      }),
    ).resolves.toMatchObject({
      source: 'local',
      result: { kind: 'message' },
    });

    expect(generateMessage).not.toHaveBeenCalled();
  });

  it('uses the provider for messages only after explicit opt-in', async () => {
    const generateMessage = jest.fn(async () => ({
      kind: 'message' as const,
      text: 'remote result',
      factsUsed: ['current cycle week'],
    }));

    await expect(
      generatePrivacyAwareCoachMessage({
        providerCoachEnabled: true,
        gateway: gateway(generateMessage),
        context,
        task: 'weekly-review',
      }),
    ).resolves.toEqual({
      source: 'remote',
      result: {
        kind: 'message',
        text: 'remote result',
        factsUsed: ['current cycle week'],
      },
    });

    expect(generateMessage).toHaveBeenCalledTimes(1);
  });

  it('falls back locally when an enabled message provider is unavailable', async () => {
    const generateMessage = jest.fn(async () => ({
      kind: 'unavailable' as const,
      text: 'not configured',
      factsUsed: [],
    }));

    await expect(
      generatePrivacyAwareCoachMessage({
        providerCoachEnabled: true,
        gateway: gateway(generateMessage),
        context,
        task: 'explain-workout',
      }),
    ).resolves.toMatchObject({
      source: 'local',
      result: { kind: 'message' },
    });
  });

  it('preserves deterministic safety routing without labelling it remote', async () => {
    const generateMessage = jest.fn(async () => ({
      kind: 'safety-route' as const,
      text: 'Pause training and seek appropriate care.',
      factsUsed: ['deterministic safety classifier'],
    }));

    await expect(
      generatePrivacyAwareCoachMessage({
        providerCoachEnabled: true,
        gateway: gateway(generateMessage),
        context,
        task: 'freeform',
        prompt: 'I have a concerning symptom',
      }),
    ).resolves.toEqual({
      source: 'local',
      result: {
        kind: 'safety-route',
        text: 'Pause training and seek appropriate care.',
        factsUsed: ['deterministic safety classifier'],
      },
    });
  });

  it('never calls provider proposal generation while provider processing is disabled', async () => {
    const generateProposal = jest.fn(async () => proposal);

    await expect(
      generatePrivacyAwareCoachProposal({
        providerCoachEnabled: false,
        gateway: gateway(
          async () => ({ kind: 'unavailable', text: 'not used', factsUsed: [] }),
          generateProposal,
        ),
        context,
        task: 'weekly-review',
      }),
    ).rejects.toBeInstanceOf(CoachGatewayUnavailableError);

    expect(generateProposal).not.toHaveBeenCalled();
  });

  it('allows a validated provider proposal request only after explicit opt-in', async () => {
    const generateProposal = jest.fn(async () => proposal);

    await expect(
      generatePrivacyAwareCoachProposal({
        providerCoachEnabled: true,
        gateway: gateway(
          async () => ({ kind: 'unavailable', text: 'not used', factsUsed: [] }),
          generateProposal,
        ),
        context,
        task: 'weekly-review',
      }),
    ).resolves.toEqual(proposal);

    expect(generateProposal).toHaveBeenCalledTimes(1);
  });

  it('does not invent a local proposal when the enabled provider fails', async () => {
    const providerError = new Error('provider unavailable');
    const generateProposal = jest.fn(async () => Promise.reject(providerError));

    await expect(
      generatePrivacyAwareCoachProposal({
        providerCoachEnabled: true,
        gateway: gateway(
          async () => ({ kind: 'unavailable', text: 'not used', factsUsed: [] }),
          generateProposal,
        ),
        context,
        task: 'weekly-review',
      }),
    ).rejects.toBe(providerError);

    expect(generateProposal).toHaveBeenCalledTimes(1);
  });
});
