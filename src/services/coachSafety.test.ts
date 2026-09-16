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

  it('prioritizes urgent symptoms over medication questions in a mixed prompt', () => {
    const result = classifyCoachSafety('I have chest pain. Should I change my insulin dose?');

    expect(result.route).toBe('urgent-care');
    expect(result.shouldStopTraining).toBe(true);
  });

  it('routes medication requests to a clinician boundary', () => {
    const result = classifyCoachSafety('Can I change my insulin dose before training?');

    expect(result.route).toBe('medication-boundary');
    expect(result.shouldStopTraining).toBe(false);
    expect(result.response).toContain('cannot advise');
  });

  it('routes individualized nutrition requests away from Coach guidance', () => {
    const result = classifyCoachSafety('How many calories and what macro target should I use?');

    expect(result.route).toBe('nutrition-boundary');
    expect(result.shouldStopTraining).toBe(false);
    expect(result.response).toContain('cannot provide individualized nutrition');
  });

  it('routes meaningful injury red flags to professional evaluation', () => {
    const result = classifyCoachSafety('I have sharp pain, numbness, and significant swelling.');

    expect(result.route).toBe('professional-evaluation');
    expect(result.shouldStopTraining).toBe(true);
    expect(result.matchedSignals).toEqual(['sharp pain', 'numbness', 'significant swelling']);
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
      evidence: ['Use a lower calorie target and different macros.'],
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
          field: 'setCount',
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

  it('rejects invalid RPE/RIR and schedule bounds', () => {
    const invalidProposal: CoachProposal = {
      ...demoCoachProposal,
      changes: [
        {
          id: 'change-rpe',
          type: 'target-change',
          field: 'rpe',
          from: '8',
          to: '11',
          requiresUserConfirmation: true,
        },
        {
          id: 'change-rir',
          type: 'target-change',
          field: 'rir',
          from: '2',
          to: '-1',
          requiresUserConfirmation: true,
        },
        {
          id: 'change-days',
          type: 'schedule-change',
          field: 'daysPerWeek',
          from: '3',
          to: '8',
          requiresUserConfirmation: true,
        },
      ],
    };

    expect(validateCoachProposal(invalidProposal)).toEqual(
      expect.arrayContaining([
        'Change 1 RPE must stay between 1 and 10.',
        'Change 2 RIR must stay between 0 and 10.',
        'Change 3 schedule value must stay between 1 and 7.',
      ]),
    );
  });
});
