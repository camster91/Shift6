import { demoProgramVersion } from './fixtures/home';
import { applyCoachProposalToProgramVersion } from './coachProposal';
import { foundationalExercises } from './fixtures/exercises';
import type { CoachProposal } from './types';

function proposal(changes: CoachProposal['changes']): CoachProposal {
  return {
    id: 'coach-proposal-apply-test',
    summary: 'A tested private plan adjustment.',
    confidence: 'high',
    evidence: ['The test supplies explicit current-session evidence.'],
    changes,
    safetyNotes: [],
    status: 'pending',
    createdAt: '2026-09-14T12:00:00.000Z',
  };
}

describe('applyCoachProposalToProgramVersion', () => {
  it('applies a precisely scoped target change copy-on-write', () => {
    const sourceExercise = demoProgramVersion.workouts[0]!.exercises[0]!;
    const next = applyCoachProposalToProgramVersion(
      demoProgramVersion,
      proposal([
        {
          id: 'change-load',
          type: 'target-change',
          workoutId: demoProgramVersion.workouts[0]!.id,
          workoutExerciseId: sourceExercise.id,
          exerciseId: sourceExercise.exerciseId,
          field: 'load',
          from: '185 lb',
          to: '190 lb',
          requiresUserConfirmation: true,
        },
      ]),
    );

    expect(next).not.toBe(demoProgramVersion);
    expect(next.workouts[0]!.exercises[0]!.sets[0]!.target.load?.value).toBe(190);
    expect(demoProgramVersion.workouts[0]!.exercises[0]!.sets[0]!.target.load).toBeUndefined();
    expect(next.workouts[0]!.exercises[0]!.id).toBe(sourceExercise.id);
  });

  it('applies substitution and set-count changes without rewriting the source', () => {
    const sourceWorkout = demoProgramVersion.workouts[0]!;
    const sourceExercise = sourceWorkout.exercises[0]!;
    const next = applyCoachProposalToProgramVersion(
      demoProgramVersion,
      proposal([
        {
          id: 'change-substitution',
          type: 'exercise-substitution',
          workoutId: sourceWorkout.id,
          workoutExerciseId: sourceExercise.id,
          exerciseId: sourceExercise.exerciseId,
          field: 'exerciseId',
          from: sourceExercise.exerciseId,
          to: 'private-test-movement',
          requiresUserConfirmation: true,
        },
        {
          id: 'change-sets',
          type: 'set-count-change',
          workoutId: sourceWorkout.id,
          workoutExerciseId: sourceWorkout.exercises[1]!.id,
          exerciseId: sourceWorkout.exercises[1]!.exerciseId,
          field: 'setCount',
          from: '3',
          to: '4',
          requiresUserConfirmation: true,
        },
      ]),
      [{ ...foundationalExercises[0]!, id: 'private-test-movement', isCustom: true }],
    );

    expect(next.workouts[0]!.exercises[0]!.exerciseId).toBe('private-test-movement');
    expect(next.workouts[0]!.exercises[1]!.sets).toHaveLength(4);
    expect(demoProgramVersion.workouts[0]!.exercises[0]!.exerciseId).toBe(
      sourceExercise.exerciseId,
    );
    expect(demoProgramVersion.workouts[0]!.exercises[1]!.sets).toHaveLength(3);
  });

  it('fails closed for ambiguous or unsupported changes', () => {
    expect(() =>
      applyCoachProposalToProgramVersion(
        demoProgramVersion,
        proposal([
          {
            id: 'ambiguous',
            type: 'target-change',
            exerciseId: 'exercise-back-squat',
            field: 'reps',
            from: '8',
            to: '9',
            requiresUserConfirmation: true,
          },
        ]),
      ),
    ).toThrow('unambiguous');

    expect(() =>
      applyCoachProposalToProgramVersion(
        demoProgramVersion,
        proposal([
          {
            id: 'schedule',
            type: 'schedule-change',
            field: 'dayOfWeek',
            from: '1',
            to: '2',
            requiresUserConfirmation: true,
          },
        ]),
      ),
    ).toThrow('separate schedule or program workflow');
  });
});

describe('Coach load unit boundary', () => {
  function loadChange(unit: 'metric' | 'imperial', from: string, to: string) {
    const source = JSON.parse(JSON.stringify(demoProgramVersion)) as typeof demoProgramVersion;
    const workout = source.workouts[0]!;
    const movement = workout.exercises[0]!;
    movement.sets[0]!.target.load = { unit, value: 40 };
    return () =>
      applyCoachProposalToProgramVersion(
        source,
        proposal([
          {
            id: 'load-units',
            type: 'target-change',
            workoutId: workout.id,
            workoutExerciseId: movement.id,
            exerciseId: movement.exerciseId,
            field: 'load',
            from,
            to,
            requiresUserConfirmation: true,
          },
        ]),
      );
  }
  it.each([
    ['metric', '40 kg', '45 lb'],
    ['imperial', '40 lb', '45 kg'],
  ] as const)(
    'rejects explicit cross-unit changes (%s) instead of relabelling',
    (unit, from, to) => {
      expect(loadChange(unit, from, to)).toThrow('current target unit');
    },
  );
  it.each([
    ['metric', '40kg', '45 kilograms'],
    ['imperial', '40lbs', '45 pounds'],
  ] as const)('preserves actual target unit (%s)', (unit, from, to) => {
    expect(loadChange(unit, from, to)().workouts[0]!.exercises[0]!.sets[0]!.target.load).toEqual({
      unit,
      value: 45,
    });
  });
  it('rejects a stale before value and unsupported suffix', () => {
    expect(loadChange('metric', '39 kg', '45 kg')).toThrow('no longer matches');
    expect(loadChange('metric', '40 kg', '45 stones')).toThrow('supported kg or lb');
  });
});

it('does not invent a load unit when no canonical load exists', () => {
  const workout = demoProgramVersion.workouts[0]!;
  const movement = workout.exercises[0]!;
  expect(() =>
    applyCoachProposalToProgramVersion(
      demoProgramVersion,
      proposal([
        {
          id: 'missing-unit',
          type: 'target-change',
          workoutId: workout.id,
          workoutExerciseId: movement.id,
          exerciseId: movement.exerciseId,
          field: 'load',
          from: '40',
          to: '45',
          requiresUserConfirmation: true,
        },
      ]),
    ),
  ).toThrow('explicit kg or lb unit');
});
