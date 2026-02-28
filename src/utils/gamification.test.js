import { describe, it, expect, beforeEach } from 'vitest';
import {
    BADGES,
    calculateStats,
    getUnlockedBadges,
    getPersonalRecords,
    isNewPersonalRecord,
    calculateStreakWithGrace,
    getRemainingFreezeTokens,
    useStreakFreeze,
    checkComeback,
    getStreakStatus
} from './gamification';

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

    // Compassionate Streak System Tests
    describe('calculateStreakWithGrace', () => {
        it('returns zero streak for empty history', () => {
            const result = calculateStreakWithGrace([]);
            expect(result.streak).toBe(0);
            expect(result.graceDaysUsed).toBe(0);
        });

        it('counts consecutive workout days', () => {
            const today = new Date();
            const history = [
                { date: today.toISOString(), exerciseKey: 'pushups', volume: 50 },
                { date: new Date(today - 86400000).toISOString(), exerciseKey: 'pushups', volume: 50 },
                { date: new Date(today - 172800000).toISOString(), exerciseKey: 'pushups', volume: 50 }
            ];
            const result = calculateStreakWithGrace(history);
            expect(result.streak).toBe(3);
        });

        it('identifies when streak is at risk', () => {
            const yesterday = new Date(Date.now() - 86400000);
            const history = [
                { date: yesterday.toISOString(), exerciseKey: 'pushups', volume: 50 }
            ];
            const result = calculateStreakWithGrace(history);
            expect(result.isAtRisk).toBe(true);
        });

        it('shows streak as not at risk when worked out today', () => {
            const today = new Date();
            const history = [
                { date: today.toISOString(), exerciseKey: 'pushups', volume: 50 }
            ];
            const result = calculateStreakWithGrace(history);
            expect(result.isAtRisk).toBe(false);
        });

        it('provides appropriate message for active streak', () => {
            const today = new Date();
            const history = [
                { date: today.toISOString(), exerciseKey: 'pushups', volume: 50 }
            ];
            const result = calculateStreakWithGrace(history);
            expect(result.message).toContain('Keep it up');
        });
    });

    describe('getRemainingFreezeTokens', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('returns max tokens when none used', () => {
            const remaining = getRemainingFreezeTokens();
            expect(remaining).toBe(3); // Default from STREAK_CONFIG
        });
    });

    describe('useStreakFreeze', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('successfully uses a freeze token', () => {
            const result = useStreakFreeze();
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(2);
        });

        it('fails when no tokens remaining', () => {
            // Use all tokens
            useStreakFreeze();
            useStreakFreeze();
            useStreakFreeze();

            const result = useStreakFreeze();
            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
        });
    });

    describe('checkComeback', () => {
        it('returns null for empty history', () => {
            expect(checkComeback([])).toBeNull();
        });

        it('returns null for recent workout', () => {
            const today = new Date();
            const yesterday = new Date(today - 86400000);
            const history = [
                { date: today.toISOString() },
                { date: yesterday.toISOString() }
            ];
            expect(checkComeback(history)).toBeNull();
        });

        it('detects comeback after 7+ days', () => {
            const today = new Date();
            const eightDaysAgo = new Date(today - 8 * 86400000);
            const history = [
                { date: today.toISOString() },
                { date: eightDaysAgo.toISOString() }
            ];
            const result = checkComeback(history);
            expect(result).not.toBeNull();
            expect(result.type).toBe('comeback');
            expect(result.daysMissed).toBeGreaterThanOrEqual(7);
        });
    });

    describe('getStreakStatus', () => {
        it('returns inactive status for zero streak', () => {
            const result = getStreakStatus({ streak: 0, isAtRisk: false, graceRemaining: 1 });
            expect(result.status).toBe('inactive');
            expect(result.emoji).toBe('💤');
        });

        it('returns danger status when at risk with no grace', () => {
            const result = getStreakStatus({ streak: 5, isAtRisk: true, graceRemaining: 0 });
            expect(result.status).toBe('danger');
            expect(result.color).toBe('red');
        });

        it('returns warning status when at risk with grace remaining', () => {
            const result = getStreakStatus({ streak: 5, isAtRisk: true, graceRemaining: 1 });
            expect(result.status).toBe('warning');
            expect(result.color).toBe('yellow');
        });

        it('returns hot status for 7+ day streak', () => {
            const result = getStreakStatus({ streak: 10, isAtRisk: false, graceRemaining: 1 });
            expect(result.status).toBe('hot');
            expect(result.emoji).toBe('🔥');
        });

        it('returns legendary status for 30+ day streak', () => {
            const result = getStreakStatus({ streak: 35, isAtRisk: false, graceRemaining: 1 });
            expect(result.status).toBe('legendary');
        });
    });
});
