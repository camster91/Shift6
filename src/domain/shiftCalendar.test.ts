import { projectShiftCalendarPosition } from './shiftCalendar';

describe('Shift calendar position', () => {
  it('moves with calendar time without completing sessions or advancing prescription', () => {
    const result = projectShiftCalendarPosition(
      { currentWeek: 1 },
      '2026-09-01',
      '2026-09-16',
      [],
      '2026-10-13',
    );
    expect(result).toEqual({
      asOfDate: '2026-09-16',
      elapsedDays: 16,
      elapsedCalendarWeek: 3,
      pausedDays: 0,
      activeDays: 16,
      cycleWeek: 1,
      isPaused: false,
      plannedReviewDate: '2026-10-13',
    });
  });

  it('counts explicit paused days once and keeps the confirmed review date', () => {
    const result = projectShiftCalendarPosition(
      { currentWeek: 2 },
      '2026-09-01',
      '2026-09-16',
      [{ startDate: '2026-09-05', endDate: '2026-09-08' }, { startDate: '2026-09-14' }],
      '2026-10-20',
    );
    expect(result.elapsedDays).toBe(16);
    expect(result.pausedDays).toBe(6);
    expect(result.activeDays).toBe(10);
    expect(result.elapsedCalendarWeek).toBe(3);
    expect(result.cycleWeek).toBe(2);
    expect(result.isPaused).toBe(true);
    expect(result.plannedReviewDate).toBe('2026-10-20');
  });

  it('counts local dates across spring and autumn DST without a lost or extra day', () => {
    expect(
      projectShiftCalendarPosition({ currentWeek: 1 }, '2026-03-07', '2026-03-09').elapsedDays,
    ).toBe(3);
    expect(
      projectShiftCalendarPosition({ currentWeek: 1 }, '2026-10-31', '2026-11-02').elapsedDays,
    ).toBe(3);
  });

  it('rejects overlapping, backward and pre-start pauses instead of inventing time', () => {
    expect(() =>
      projectShiftCalendarPosition({ currentWeek: 1 }, '2026-09-01', '2026-09-10', [
        { startDate: '2026-09-02', endDate: '2026-09-06' },
        { startDate: '2026-09-05', endDate: '2026-09-08' },
      ]),
    ).toThrow('non-overlapping');
    expect(() =>
      projectShiftCalendarPosition({ currentWeek: 1 }, '2026-09-01', '2026-09-10', [
        { startDate: '2026-08-31', endDate: '2026-09-02' },
      ]),
    ).toThrow('within the Shift');
    expect(() =>
      projectShiftCalendarPosition({ currentWeek: 1 }, '2026-09-01', '2026-08-31'),
    ).toThrow('cannot precede');
    expect(() =>
      projectShiftCalendarPosition({ currentWeek: 1 }, '2026-09-01', '2026-09-10', [
        { startDate: '2026-09-05', endDate: '2026-09-05' },
      ]),
    ).toThrow('non-overlapping');
  });
});
