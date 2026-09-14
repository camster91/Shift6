import { demoProgram, demoWorkout } from './fixtures/home';
import { buildNextSessionTargets } from './nextSession';

describe('deterministic next-session targets', () => {
  it('uses observed local load and the program strategy to calculate the next target', () => {
    const squat = demoWorkout.exercises[0]!;
    const targets = buildNextSessionTargets(
      demoWorkout,
      demoProgram.progressionStrategy,
      squat.sets.map((set) => ({
        id: `completed-${set.id}`,
        sessionId: 'session-1',
        workoutExerciseId: squat.id,
        setNumber: set.setNumber,
        load: 185,
        reps: 5,
        completedAt: '2026-09-14T12:05:00.000Z',
        idempotencyKey: `session-1:${squat.id}:${set.setNumber}`,
      })),
      'imperial',
    );

    expect(targets[0]).toMatchObject({
      exerciseId: 'exercise-back-squat',
      currentTarget: { load: { value: 185, unit: 'imperial' } },
      decision: { action: 'increase-load', nextTarget: { load: { value: 190 } } },
    });
  });

  it('holds untouched exercises instead of inventing performance data', () => {
    const [target] = buildNextSessionTargets(
      demoWorkout,
      demoProgram.progressionStrategy,
      [],
      'metric',
    );

    expect(target?.decision).toMatchObject({
      action: 'hold',
      requiresUserConfirmation: false,
    });
    expect(target?.decision.reason).toContain('not enough completed-set data');
  });
});
