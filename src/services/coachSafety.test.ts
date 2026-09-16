import { demoCoachProposal } from '../domain/fixtures/home';
import type { CoachProposal } from '../domain/types';
import { classifyCoachSafety, isValidCoachProposal, validateCoachProposal } from './coachSafety';

describe('classifyCoachSafety', () => {
  it('routes urgent symptoms away from workout adaptation', () => {
    const result = classifyCoachSafety('I have chest pain and severe shortness of breath.');

    expect(result.route).toBe('urgent-care');
    expect(result.shouldStopTraining).toBe(true);
    expect(result.matchedSignals).toEqual(['chest pain', 'severe shortness of breath']);
    expect(result.response).toContain('urgent medical care');
  });

  it('routes medication requests to a clinician boundary', () => {
    const result = classifyCoachSafety('Can I change my insulin dose before training?');

    expect(result.route).toBe('medication-boundary');
    expect(result.shouldStopTraining).toBe(false);
    expect(result.response).toContain('cannot advise');
  });

  it('does not over-route an ordinary training question', () => {
    expect(classifyCoachSafety('How should I warm up for squats?').route).toBe('standard');
  });
});

describe('validateCoachProposal', () => {
  it('accepts the empty-change informational proposal used by the coach placeholder', () => {
    expect(isValidCoachProposal(demoCoachProposal)).toBe(true);
  });

  it('rejects changes that could be applied without confirmation or use an unsafe field', () => {
    const invalidProposal = {
      ...demoCoachProposal,
      changes: [
        {
          id: 'change-1',
          type: 'target-change',
          field: 'medicalStatus',
          from: 'unknown',
          to: 'cleared',
          requiresUserConfirmation: false,
        },
      ],
    } as unknown as CoachProposal;

    expect(validateCoachProposal(invalidProposal)).toEqual([
      'Change 1 must require explicit user confirmation.',
      'Change 1 uses a field that is not allowed for its change type.',
    ]);
  });

  it('requires an affected exercise for substitutions', () => {
    const invalidProposal: CoachProposal = {
      ...demoCoachProposal,
      changes: [
        {
          id: 'change-2',
          type: 'exercise-substitution',
          field: 'exerciseId',
          from: 'exercise-old',
          to: 'exercise-new',
          requiresUserConfirmation: true,
        },
      ],
    };

    expect(validateCoachProposal(invalidProposal)).toContain(
      'Change 1 must identify the affected exercise.',
    );
  });

  it('rejects unsafe medication or nutrition instructions anywhere in provider proposals', () => {
    const invalidProposal: CoachProposal = {
      ...demoCoachProposal,
      summary: 'Increase your insulin dose before the next workout.',
      evidence: ['Eat fewer calories to make the plan work faster.'],
      changes: [
        {
          id: 'change-3',
          type: 'target-change',
          workoutId: 'workout-1',
          workoutExerciseId: 'workout-exercise-1',
          exerciseId: 'exercise-bench-press',
          field: 'reps',
          from: '8',
          to: '9',
          requiresUserConfirmation: true,
        },
      ],
    };

    const errors = validateCoachProposal(invalidProposal);
    expect(errors.some((error) => /medication|insulin/i.test(error))).toBe(true);
    expect(errors.some((error) => /nutrition|calorie/i.test(error))).toBe(true);
  });

  it('rejects unusually large numeric target increases instead of trusting provider output', () => {
    const invalidProposal: CoachProposal = {
      ...demoCoachProposal,
      changes: [
        {
          id: 'change-4',
          type: 'target-change',
          workoutId: 'workout-1',
          workoutExerciseId: 'workout-exercise-1',
          exerciseId: 'exercise-bench-press',
          field: 'reps',
          from: '8',
          to: '12',
          requiresUserConfirmation: true,
        },
      ],
    };

    expect(validateCoachProposal(invalidProposal)).toContain(
      'Change 1 increases reps by more than the allowed 25%.',
    );
  });

  it('rejects out-of-range set-count mutations', () => {
    const invalidProposal: CoachProposal = {
      ...demoCoachProposal,
      changes: [
        {
          id: 'change-5',
          type: 'set-count-change',
          workoutId: 'workout-1',
          workoutExerciseId: 'workout-exercise-1',
          exerciseId: 'exercise-bench-press',
          field: 'sets',
          from: '3',
          to: '25',
          requiresUserConfirmation: true,
        },
      ],
    };

    expect(validateCoachProposal(invalidProposal)).toContain(
      'Change 1 set count must stay between 1 and 20.',
    );
  });
});
