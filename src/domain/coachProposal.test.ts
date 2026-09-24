import { demoProgramVersion } from './fixtures/home';
import { applyCoachProposalToProgramVersion } from './coachProposal';
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
          to: 'exercise-front-squat',
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
    );

    expect(next.workouts[0]!.exercises[0]!.exerciseId).toBe('exercise-front-squat');
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
