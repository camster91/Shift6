import { PrivacySafeAnalyticsClient, sanitizeAnalyticsEvent } from './analytics';

describe('privacy-safe analytics', () => {
  it('keeps allowlisted aggregate properties and drops free-text or unknown fields', () => {
    const event = sanitizeAnalyticsEvent({
      name: 'workout_completed',
      occurredAt: '2026-09-14T12:00:00.000Z',
      properties: {
        workoutId: 'workout-1',
        cycleWeek: 2,
        notes: 'My knee hurts after the last set.',
        healthNote: 'slept badly',
      },
    });

    expect(event).toEqual({
      name: 'workout_completed',
      occurredAt: '2026-09-14T12:00:00.000Z',
      properties: { workoutId: 'workout-1', cycleWeek: 2 },
    });
  });

  it('does not emit an empty properties object', () => {
    expect(
      sanitizeAnalyticsEvent({
        name: 'onboarding_started',
        occurredAt: '2026-09-14T12:00:00.000Z',
        properties: { note: 'private context' },
      }),
    ).toEqual({ name: 'onboarding_started', occurredAt: '2026-09-14T12:00:00.000Z' });
  });

  it('sanitizes at the transport boundary', () => {
    const received: unknown[] = [];
    const client = new PrivacySafeAnalyticsClient((event) => received.push(event));

    client.track({
      name: 'coach_proposal_shown',
      occurredAt: '2026-09-14T12:00:00.000Z',
      properties: { proposalId: 'proposal-1', summary: 'private coach text', changeCount: 1 },
    });

    expect(received).toEqual([
      {
        name: 'coach_proposal_shown',
        occurredAt: '2026-09-14T12:00:00.000Z',
        properties: { proposalId: 'proposal-1', changeCount: 1 },
      },
    ]);
  });
});
