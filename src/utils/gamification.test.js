import { describe, it, expect } from 'vitest';
import { BADGES, calculateStats, getUnlockedBadges } from './gamification';

describe('gamification utilities', () => {
    describe('BADGES', () => {
        it('contains expected badges', () => {
            expect(BADGES.length).toBe(9);
            expect(BADGES.map(b => b.id)).toContain('first_step');
            expect(BADGES.map(b => b.id)).toContain('week_warrior');
            expect(BADGES.map(b => b.id)).toContain('month_monster');
            expect(BADGES.map(b => b.id)).toContain('century_club');
            expect(BADGES.map(b => b.id)).toContain('complete_athlete');
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
});
