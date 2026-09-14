import { demoProgram, demoProgramVersion } from './fixtures/home';
import { buildCycleProgressionCopy } from './cycleProgression';

describe('deterministic cycle progression copies', () => {
  it('applies an ordinary next-load decision to a private copy', () => {
    const result = buildCycleProgressionCopy(
      demoProgram,
      demoProgramVersion,
      [
        {
          sessionId: 'session-1',
          workoutId: 'workout-barbell-30-strength-a',
          exerciseId: 'exercise-back-squat',
          completedAt: '2026-09-01T10:00:00.000Z',
          load: 185,
          reps: 5,
        },
        {
          sessionId: 'session-1',
          workoutId: 'workout-barbell-30-strength-a',
          exerciseId: 'exercise-back-squat',
          completedAt: '2026-09-01T10:01:00.000Z',
          load: 185,
          reps: 5,
        },
        {
          sessionId: 'session-1',
          workoutId: 'workout-barbell-30-strength-a',
          exerciseId: 'exercise-back-squat',
          completedAt: '2026-09-01T10:02:00.000Z',
          load: 185,
          reps: 5,
        },
      ],
      'imperial',
    );

    const squat = result.version.workouts[0]?.exercises[0];
    expect(squat?.sets.every((set) => set.target.load?.value === 190)).toBe(true);
    expect(result.changes).toMatchObject([
      {
        exerciseId: 'exercise-back-squat',
        action: 'increase-load',
        from: { load: { value: 185, unit: 'imperial' } },
        to: { load: { value: 190, unit: 'imperial' } },
      },
    ]);
    expect(demoProgramVersion.workouts[0]?.exercises[0]?.sets[0]?.target.load).toBeUndefined();
  });

  it('holds when comparable performance is missing or has a safety signal', () => {
    const noData = buildCycleProgressionCopy(demoProgram, demoProgramVersion, [], 'imperial');
    expect(noData.changes).toEqual([]);

    const discomfort = buildCycleProgressionCopy(
      demoProgram,
      demoProgramVersion,
      [
        {
          sessionId: 'session-flagged',
          exerciseId: 'exercise-back-squat',
          completedAt: '2026-09-01T10:00:00.000Z',
          load: 185,
          reps: 5,
          discomfortFlag: true,
        },
      ],
      'imperial',
    );
    expect(discomfort.changes).toEqual([]);
  });

  it('does not auto-apply changes whose strategy requires confirmation', () => {
    const volumeProgram = { ...demoProgram, progressionStrategy: 'volume' as const };
    const result = buildCycleProgressionCopy(
      volumeProgram,
      demoProgramVersion,
      [
        {
          sessionId: 'session-volume',
          exerciseId: 'exercise-back-squat',
          completedAt: '2026-09-01T10:00:00.000Z',
          load: 185,
          reps: 5,
        },
      ],
      'imperial',
    );

    expect(result.changes).toEqual([]);
    expect(result.version.workouts[0]?.exercises[0]?.sets).toHaveLength(3);
  });
});
