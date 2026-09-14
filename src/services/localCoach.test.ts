import type { CoachContext } from './contracts';
import { buildLocalCoachMessage } from './localCoach';

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
    completedWorkoutCount: 3,
    plannedWorkoutCount: 6,
    completionRate: 0.5,
    cardioMinutes: 30,
    personalRecordCount: 2,
  },
};

describe('offline Coach explainer', () => {
  it('explains the active workout from structured facts', () => {
    const result = buildLocalCoachMessage(context, 'explain-workout');

    expect(result).toMatchObject({ kind: 'message' });
    expect(result.text).toContain('Week 2');
    expect(result.text).toContain('Strength A');
    expect(result.text).toContain('30 minutes');
    expect(result.factsUsed).toContain('active workout snapshot');
  });

  it('keeps review language grounded in local counts and avoids a punitive streak', () => {
    const result = buildLocalCoachMessage(context, 'weekly-review');

    expect(result.text).toContain('3 of 6 workouts');
    expect(result.text).toContain('50% adherence');
    expect(result.text).toContain('not a reason for automatic punishment');
  });

  it('routes safety-sensitive prompts before offering training advice', () => {
    const result = buildLocalCoachMessage(context, 'freeform', 'I have chest pain');

    expect(result).toMatchObject({
      kind: 'safety-route',
      factsUsed: ['deterministic safety classifier'],
    });
    expect(result.text).toContain('urgent medical care');
  });

  it('does not expose a plan mutation path', () => {
    const result = buildLocalCoachMessage(context, 'substitution');

    expect(result).toMatchObject({ kind: 'message' });
    expect(result.text).toContain('private plan snapshot');
    expect(result.text).not.toContain('accepted');
  });

  it('maps a freeform progress question to a useful offline explanation', () => {
    const result = buildLocalCoachMessage(context, 'freeform', 'How am I progressing this cycle?');

    expect(result.text).toContain('3 of 6 workouts');
    expect(result.factsUsed).toContain('completion rate');
  });
});
