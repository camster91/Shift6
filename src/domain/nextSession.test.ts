import { demoProgram, demoWorkout } from './fixtures/home';
import { buildNextSessionTargets, readinessInputForWorkout } from './nextSession';

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

  it('does not carry old exercise performance into a replacement movement', () => {
    const squat = demoWorkout.exercises[0]!;
    const [target] = buildNextSessionTargets(
      demoWorkout,
      demoProgram.progressionStrategy,
      [
        {
          id: 'completed-old-squat',
          sessionId: 'session-1',
          workoutExerciseId: squat.id,
          exerciseId: 'exercise-old-squat',
          setNumber: 1,
          load: 185,
          reps: 5,
          completedAt: '2026-09-14T12:05:00.000Z',
          idempotencyKey: 'session-1:old-squat:1',
        },
      ],
      'imperial',
    );

    expect(target?.currentTarget.load).toBeUndefined();
    expect(target?.decision.action).toBe('hold');
  });

  it('holds progression when the user marks the session limited or a rest day', () => {
    const squat = demoWorkout.exercises[0]!;
    const completedSets = squat.sets.map((set) => ({
      id: `completed-${set.id}`,
      sessionId: 'session-1',
      workoutExerciseId: squat.id,
      setNumber: set.setNumber,
      load: 185,
      reps: 5,
      completedAt: '2026-09-14T12:05:00.000Z',
      idempotencyKey: `session-1:${squat.id}:${set.setNumber}`,
    }));

    expect(
      buildNextSessionTargets(
        demoWorkout,
        demoProgram.progressionStrategy,
        completedSets,
        'imperial',
        readinessInputForWorkout('limited'),
      )[0]?.decision,
    ).toMatchObject({ action: 'hold' });
    expect(readinessInputForWorkout('rest')).toMatchObject({ energy: 1, soreness: 5 });
  });
});
