import {
  buildCycleProgressSummary,
  buildCycleReviewFacts,
  calculateNextTarget,
  detectPlateau,
  evaluateReadiness,
  getWeekSixGuidance,
} from './progression';

const normalReadiness = {
  energy: 4 as const,
  soreness: 2 as const,
  sleepQuality: 4 as const,
  timeAvailableMinutes: 30,
  discomfort: false,
};

describe('SHIFT6 deterministic progression', () => {
  it('advances double progression reps before load, then increases load at the top', () => {
    const base = {
      strategy: 'double-progression' as const,
      currentTarget: {
        reps: { min: 6, max: 8 },
        load: { value: 100, unit: 'imperial' as const },
      },
      readiness: normalReadiness,
      loadIncrement: 5,
    };

    expect(
      calculateNextTarget({
        ...base,
        completedSets: [
          { completed: true, reps: 6 },
          { completed: true, reps: 6 },
        ],
      }),
    ).toMatchObject({ action: 'increase-reps', nextTarget: { reps: { min: 7, max: 8 } } });

    expect(
      calculateNextTarget({
        ...base,
        completedSets: [
          { completed: true, reps: 8 },
          { completed: true, reps: 8 },
        ],
      }),
    ).toMatchObject({ action: 'increase-load', nextTarget: { load: { value: 105 } } });
  });

  it('holds progression after a discomfort flag or poor readiness', () => {
    const decision = calculateNextTarget({
      strategy: 'linear-load',
      currentTarget: { reps: 5, load: { value: 185, unit: 'imperial' } },
      completedSets: [{ completed: true, reps: 5 }],
      loadIncrement: 5,
      readiness: { ...normalReadiness, discomfort: true },
    });

    expect(decision).toMatchObject({ action: 'hold', nextTarget: { load: { value: 185 } } });
    expect(decision.reason).toContain('Discomfort');
    expect(evaluateReadiness({ ...normalReadiness, energy: 2 })).toMatchObject({
      action: 'lighter-volume',
      label: 'consider lighter volume',
    });
  });

  it('supports rep-target, time, distance, cardio, and skill decisions', () => {
    expect(
      calculateNextTarget({
        strategy: 'rep-target',
        currentTarget: { reps: 10, load: { value: 50, unit: 'metric' } },
        completedSets: [
          { completed: true, reps: 12 },
          { completed: true, reps: 12 },
        ],
        totalRepTarget: 24,
        loadIncrement: 2,
        readiness: normalReadiness,
      }).action,
    ).toBe('increase-load');
    expect(
      calculateNextTarget({
        strategy: 'time',
        currentTarget: { durationSeconds: 600 },
        completedSets: [{ completed: true, durationSeconds: 600 }],
        durationIncrementSeconds: 60,
        readiness: normalReadiness,
      }).nextTarget.durationSeconds,
    ).toBe(660);
    expect(
      calculateNextTarget({
        strategy: 'distance',
        currentTarget: { distanceMeters: 2000 },
        completedSets: [{ completed: true, distanceMeters: 2000 }],
        distanceIncrementMeters: 250,
        readiness: normalReadiness,
      }).nextTarget.distanceMeters,
    ).toBe(2250);
    expect(
      calculateNextTarget({
        strategy: 'cardio',
        currentTarget: { durationSeconds: 1200 },
        completedSets: [{ completed: true, durationSeconds: 1200 }],
        durationIncrementSeconds: 120,
        readiness: normalReadiness,
      }).action,
    ).toBe('increase-time');
    expect(
      calculateNextTarget({
        strategy: 'skill',
        currentTarget: {},
        completedSets: [{ completed: true, formQuality: 'good' }],
        skillReady: true,
        readiness: normalReadiness,
      }).action,
    ).toBe('progress-skill');
  });

  it('keeps RPE/RIR bounded and requires review for volume or density changes', () => {
    expect(
      calculateNextTarget({
        strategy: 'rpe-rir',
        currentTarget: { reps: 5, load: { value: 185, unit: 'imperial' }, rir: 2 },
        completedSets: [
          { completed: true, reps: 5, rir: 3 },
          { completed: true, reps: 5, rir: 2 },
        ],
        loadIncrement: 5,
        readiness: normalReadiness,
      }),
    ).toMatchObject({ action: 'increase-load', nextTarget: { load: { value: 190 } } });

    expect(
      calculateNextTarget({
        strategy: 'volume',
        currentTarget: { reps: 8 },
        completedSets: [{ completed: true, reps: 8 }],
        readiness: normalReadiness,
      }),
    ).toMatchObject({
      action: 'increase-volume',
      setCountDelta: 1,
      requiresUserConfirmation: true,
    });

    expect(
      calculateNextTarget({
        strategy: 'density',
        currentTarget: { durationSeconds: 600 },
        completedSets: [{ completed: true, durationSeconds: 600 }],
        durationIncrementSeconds: 15,
        readiness: normalReadiness,
      }),
    ).toMatchObject({
      action: 'increase-density',
      densitySecondsDelta: -15,
      requiresUserConfirmation: true,
    });
  });

  it('does not call one poor session a plateau', () => {
    const session = (id: string, progressed: boolean) => ({
      id,
      planned: true,
      completed: true,
      targetAttempted: true,
      progressed,
    });

    expect(detectPlateau([session('one', false)])).toMatchObject({ status: 'insufficient-data' });
    expect(
      detectPlateau([session('one', false), session('two', true), session('three', false)]),
    ).toMatchObject({ status: 'no-plateau' });
    expect(
      detectPlateau([session('one', false), session('two', false), session('three', false)]),
    ).toMatchObject({ status: 'plateau', adherenceRate: 1 });
  });

  it('produces cycle facts without an LLM and keeps Week 6 program-specific', () => {
    const facts = buildCycleReviewFacts(3, [
      {
        completed: true,
        durationMinutes: 30,
        cardioMinutes: 0,
        progressionEvents: 1,
        personalRecordIds: ['record-squat'],
        effort: 7,
        sets: [{ completed: true, load: 100, reps: 5 }],
      },
      {
        completed: true,
        durationMinutes: 35,
        cardioMinutes: 30,
        progressionEvents: 0,
        personalRecordIds: ['record-squat'],
        effort: 8,
        sets: [{ completed: true, load: 105, reps: 5 }],
      },
    ]);

    expect(facts).toMatchObject({
      plannedWorkoutCount: 3,
      completedWorkoutCount: 2,
      completionRate: 2 / 3,
      progressionEvents: 1,
      totalTrainingVolume: 1025,
      cardioMinutes: 30,
      averageReportedEffort: 7.5,
      discomfortFlags: 0,
    });
    expect(facts.personalRecordIds).toEqual(['record-squat']);
    expect(getWeekSixGuidance('consolidation').isReducedVolume).toBe(false);
    expect(getWeekSixGuidance('reduced-volume').isReducedVolume).toBe(true);
    expect(getWeekSixGuidance('evaluation').description).not.toContain('1RM');
  });

  it('summarizes logged sets separately from completed-workout adherence', () => {
    const summary = buildCycleProgressSummary(6, [
      {
        completed: false,
        sets: [{ completed: true, load: 100, reps: 5 }],
      },
      {
        completed: true,
        sets: [
          { completed: true, load: 105, reps: 5 },
          { completed: true, load: 105, reps: 5 },
        ],
      },
    ]);

    expect(summary).toMatchObject({
      facts: { completedWorkoutCount: 1, completionRate: 1 / 6, totalTrainingVolume: 1050 },
      loggedSetCount: 3,
    });
  });
});
