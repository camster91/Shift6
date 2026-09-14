import { demoProgramVersion } from './fixtures/home';
import { createTrainingCycle } from './cycle';

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
  });
});
