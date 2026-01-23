import { describe, it, expect } from 'vitest';
import { BADGES, calculateStats, getUnlockedBadges, getPersonalRecords, isNewPersonalRecord } from './gamification';

describe('gamification utilities', () => {
    describe('BADGES', () => {
        it('contains expected badges', () => {
            expect(BADGES.length).toBe(25);
            expect(BADGES.map(b => b.id)).toContain('first_step');
            expect(BADGES.map(b => b.id)).toContain('week_warrior');
            expect(BADGES.map(b => b.id)).toContain('month_monster');
            expect(BADGES.map(b => b.id)).toContain('century_club');
            expect(BADGES.map(b => b.id)).toContain('complete_athlete');
            // New badges
            expect(BADGES.map(b => b.id)).toContain('thousand_club');
            expect(BADGES.map(b => b.id)).toContain('double_up');
            expect(BADGES.map(b => b.id)).toContain('record_breaker');
            expect(BADGES.map(b => b.id)).toContain('weekend_warrior');
        });
    });

    describe('calculateStats', () => {
        it('returns zero stats for empty data', () => {
            const stats = calculateStats({}, []);
            expect(stats.totalSessions).toBe(0);
            expect(stats.completedPlans).toBe(0);
            expect(stats.currentStreak).toBe(0);
        });

        it('counts total sessions across exercises', () => {
            const completedDays = {
                pushups: [{ dayIndex: 0 }, { dayIndex: 1 }],
                squats: [{ dayIndex: 0 }]
            };
            const stats = calculateStats(completedDays, []);
            expect(stats.totalSessions).toBe(3);
        });

        it('marks plan as completed when 18 days done', () => {
            const completedDays = {
                pushups: Array.from({ length: 18 }, (_, i) => ({ dayIndex: i }))
            };
            const stats = calculateStats(completedDays, []);
            expect(stats.completedPlans).toBe(1);
        });

        it('detects early workout', () => {
            const earlyDate = new Date();
            earlyDate.setHours(7, 0, 0);
            const stats = calculateStats({}, [{ date: earlyDate.toISOString() }]);
            expect(stats.hasEarlyWorkout).toBe(true);
        });

        it('detects late workout', () => {
            const lateDate = new Date();
            lateDate.setHours(21, 0, 0);
            const stats = calculateStats({}, [{ date: lateDate.toISOString() }]);
            expect(stats.hasLateWorkout).toBe(true);
        });
    });

    describe('getUnlockedBadges', () => {
        it('returns empty array for zero stats', () => {
            const stats = { totalSessions: 0, completedPlans: 0, currentStreak: 0 };
            expect(getUnlockedBadges(stats)).toEqual([]);
        });

        it('returns first_step badge for 1 session', () => {
            const stats = { totalSessions: 1, completedPlans: 0, currentStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('first_step');
        });

        it('returns week_warrior badge for 3 day streak', () => {
            const stats = { totalSessions: 3, completedPlans: 0, currentStreak: 3 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('week_warrior');
        });

        it('returns month_monster badge for 30 day streak', () => {
            const stats = { totalSessions: 30, completedPlans: 0, currentStreak: 30 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('month_monster');
        });

        it('returns century_club badge for 100 sessions', () => {
            const stats = { totalSessions: 100, completedPlans: 0, currentStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('century_club');
        });

        it('returns complete_athlete badge when all 9 plans completed', () => {
            const stats = { totalSessions: 162, completedPlans: 9, currentStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('complete_athlete');
        });

        it('does not return complete_athlete for partial completion', () => {
            const stats = { totalSessions: 100, completedPlans: 8, currentStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).not.toContain('complete_athlete');
        });
    });

    describe('getPersonalRecords', () => {
        it('returns empty object for empty history', () => {
            expect(getPersonalRecords([])).toEqual({});
        });

        it('returns max volume per exercise', () => {
            const history = [
                { exerciseKey: 'pushups', volume: 50, date: '2024-01-01' },
                { exerciseKey: 'pushups', volume: 75, date: '2024-01-02' },
                { exerciseKey: 'pushups', volume: 60, date: '2024-01-03' },
                { exerciseKey: 'squats', volume: 100, date: '2024-01-01' }
            ];
            const prs = getPersonalRecords(history);
            expect(prs.pushups.volume).toBe(75);
            expect(prs.pushups.date).toBe('2024-01-02');
            expect(prs.squats.volume).toBe(100);
        });

        it('handles single session per exercise', () => {
            const history = [
                { exerciseKey: 'pullups', volume: 25, date: '2024-01-01' }
            ];
            const prs = getPersonalRecords(history);
            expect(prs.pullups.volume).toBe(25);
        });
    });

    describe('isNewPersonalRecord', () => {
        it('returns true for first workout of exercise', () => {
            expect(isNewPersonalRecord('pushups', 50, [])).toBe(true);
        });

        it('returns true when volume exceeds previous max', () => {
            const history = [
                { exerciseKey: 'pushups', volume: 50 },
                { exerciseKey: 'pushups', volume: 60 }
            ];
            expect(isNewPersonalRecord('pushups', 75, history)).toBe(true);
        });

        it('returns false when volume equals previous max', () => {
            const history = [
                { exerciseKey: 'pushups', volume: 60 }
            ];
            expect(isNewPersonalRecord('pushups', 60, history)).toBe(false);
        });

        it('returns false when volume is below previous max', () => {
            const history = [
                { exerciseKey: 'pushups', volume: 75 }
            ];
            expect(isNewPersonalRecord('pushups', 50, history)).toBe(false);
        });

        it('only considers same exercise history', () => {
            const history = [
                { exerciseKey: 'squats', volume: 100 },
                { exerciseKey: 'pushups', volume: 30 }
            ];
            expect(isNewPersonalRecord('pushups', 50, history)).toBe(true);
        });

        it('returns false for zero volume on first workout', () => {
            expect(isNewPersonalRecord('pushups', 0, [])).toBe(false);
        });
    });
});
