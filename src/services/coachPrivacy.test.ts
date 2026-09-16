import type { CoachContext, CoachGateway } from './contracts';
import { generatePrivacyAwareCoachMessage } from './coachPrivacy';

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

function gateway(generateMessage: CoachGateway['generateMessage']): CoachGateway {
  return {
    generateMessage,
    generateProposal: async () => Promise.reject(new Error('not used')),
  };
}

describe('privacy-aware Coach generation', () => {
  it('never calls the provider gateway while provider processing is disabled', async () => {
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

  it('uses the provider only after explicit opt-in', async () => {
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

  it('falls back locally when an enabled provider is unavailable', async () => {
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
});
