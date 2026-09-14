import { demoCycle, demoProgram, demoProgramVersion, demoSchedule, demoWorkout } from './home';

describe('SHIFT6 foundation fixtures', () => {
  it('models the Barbell 30 program as a six-week, versioned template', () => {
    expect(demoProgram.title).toBe('Barbell 30');
    expect(demoProgram.isTemplate).toBe(true);
    expect(demoProgram.currentVersionId).toBe(demoProgramVersion.id);
    expect(demoProgramVersion.cycleModel.lengthWeeks).toBe(6);
    expect(demoProgramVersion.cycleModel.weekSixMeaning).toBe('consolidation');
    expect(demoProgramVersion.workouts.filter((workout) => !workout.isOptional)).toHaveLength(3);
    expect(demoProgramVersion.workouts.filter((workout) => workout.isOptional)).toHaveLength(2);
  });

  it('keeps the cycle and home schedule typed around real domain data', () => {
    expect(demoCycle.weeks).toHaveLength(6);
    expect(demoCycle.currentWeek).toBe(1);
    expect(demoWorkout.programVersionId).toBe(demoProgramVersion.id);
    expect(demoSchedule.map((entry) => entry.day)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });
});
