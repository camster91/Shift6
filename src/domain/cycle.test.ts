import { demoProgramVersion } from './fixtures/home';
import { advanceCycleAfterCompletedWorkout, createTrainingCycle } from './cycle';

describe('training cycle creation', () => {
  it('snapshots six program-specific weeks at cycle start', () => {
    const cycle = createTrainingCycle({
      id: 'cycle-test',
      userId: 'guest-user',
      programVersion: demoProgramVersion,
      startedAt: '2026-09-13T12:00:00.000Z',
    });

    expect(cycle).toMatchObject({
      id: 'cycle-test',
      userId: 'guest-user',
      programVersionId: demoProgramVersion.id,
      status: 'active',
      currentWeek: 1,
    });
    expect(cycle.weeks).toHaveLength(6);
    expect(cycle.weeks[0]).toMatchObject({
      phase: 'Establish',
      status: 'current',
      plannedWorkoutCount: 3,
    });
    expect(cycle.weeks[5]).toMatchObject({
      phase: 'Consolidate and review',
      status: 'upcoming',
    });
    expect(cycle.weeks[0]?.plannedWorkoutCount).toBe(3);
  });

  it('advances to the next week only when the current week is complete', () => {
    const cycle = createTrainingCycle({
      id: 'cycle-transition-test',
      userId: 'guest-user',
      programVersion: demoProgramVersion,
      startedAt: '2026-09-14T12:00:00.000Z',
    });

    const partial = advanceCycleAfterCompletedWorkout(cycle, 2);
    expect(partial.currentWeek).toBe(1);
    expect(partial.weeks[0]).toMatchObject({ status: 'current', completedWorkoutCount: 2 });

    const nextWeek = advanceCycleAfterCompletedWorkout(cycle, 3);
    expect(nextWeek.currentWeek).toBe(2);
    expect(nextWeek.weeks[0]?.status).toBe('completed');
    expect(nextWeek.weeks[1]).toMatchObject({ status: 'current', completedWorkoutCount: 0 });
  });

  it('completes Week 6 without applying a universal deload or max test', () => {
    const cycle = createTrainingCycle({
      id: 'cycle-final-test',
      userId: 'guest-user',
      programVersion: demoProgramVersion,
      startedAt: '2026-09-14T12:00:00.000Z',
    });
    const weekSix = {
      ...cycle,
      currentWeek: 6,
      weeks: cycle.weeks.map((week, index) => ({
        ...week,
        status: index === 5 ? ('current' as const) : ('completed' as const),
      })),
    };

    const complete = advanceCycleAfterCompletedWorkout(weekSix, 3);
    expect(complete.status).toBe('complete');
    expect(complete.currentWeek).toBe(6);
    expect(complete.weeks[5]).toMatchObject({
      status: 'completed',
      phase: 'Consolidate and review',
      completedWorkoutCount: 3,
    });
  });

  it('can progress a complete six-week sequence without skipping or rewriting weeks', () => {
    let cycle = createTrainingCycle({
      id: 'cycle-six-week-sequence-test',
      userId: 'guest-user',
      programVersion: demoProgramVersion,
      startedAt: '2026-09-14T12:00:00.000Z',
    });

    for (let week = 1; week <= 6; week += 1) {
      cycle = advanceCycleAfterCompletedWorkout(cycle, 3);
      expect(cycle.weeks[week - 1]).toMatchObject({
        weekNumber: week,
        status: 'completed',
        completedWorkoutCount: 3,
      });
      if (week < 6) expect(cycle.currentWeek).toBe(week + 1);
    }

    expect(cycle.status).toBe('complete');
    expect(cycle.currentWeek).toBe(6);
    expect(cycle.weeks.every((week) => week.status === 'completed')).toBe(true);
  });
});
