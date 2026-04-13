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
import {
    GYM_BADGES,
    calculateGymStats,
    getUnlockedGymBadges,
} from './gymGamification';

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

        it('does not include gym badges in home BADGES array', () => {
            // Gym badges are in GYM_BADGES, not BADGES
            expect(BADGES.map(b => b.id)).not.toContain('first_weight');
            expect(BADGES.map(b => b.id)).not.toContain('iron_warrior');
        });
    });

    describe('calculateStats', () => {
        it('returns zero stats for empty data', () => {
            const stats = calculateStats({}, []);
            expect(stats.totalSessions).toBe(0);
            expect(stats.completedPlans).toBe(0);
            expect(stats.currentStreak).toBe(0);
            expect(stats.totalGymSessions).toBe(0);
            expect(stats.totalAllSessions).toBe(0);
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

        it('includes gym stats when gymHistory is provided', () => {
            const gymHistory = [
                { date: new Date().toISOString(), exercises: [{ exerciseId: 'bench', totalVolume: 500 }] },
                { date: new Date().toISOString(), exercises: [{ exerciseId: 'squat', totalVolume: 600 }] },
            ];
            const stats = calculateStats({}, [], gymHistory, 3);
            expect(stats.totalGymSessions).toBe(2);
            expect(stats.totalGymVolume).toBe(1100);
            expect(stats.gymStreak).toBe(3);
            expect(stats.totalAllSessions).toBe(2);
            expect(stats.totalAllVolume).toBe(1100);
            expect(stats.bestStreak).toBe(3);
        });

        it('merges home and gym totals', () => {
            const completedDays = { pushups: [{ dayIndex: 0 }, { dayIndex: 1 }] };
            const gymHistory = [{ date: new Date().toISOString(), exercises: [{ exerciseId: 'bench', totalVolume: 1000 }] }];
            const stats = calculateStats(completedDays, [], gymHistory, 5);
            expect(stats.totalSessions).toBe(2);
            expect(stats.totalGymSessions).toBe(1);
            expect(stats.totalAllSessions).toBe(3);
            expect(stats.totalAllVolume).toBe(1000);
            // bestStreak should be max of home streak (0) and gym streak (5)
            expect(stats.bestStreak).toBe(5);
        });

        it('defaults gymHistory to empty array and gymStreak to 0', () => {
            const stats = calculateStats({}, []);
            expect(stats.totalGymSessions).toBe(0);
            expect(stats.totalGymVolume).toBe(0);
            expect(stats.gymPRs).toBe(0);
            expect(stats.gymStreak).toBe(0);
            expect(stats.totalAllSessions).toBe(0);
            expect(stats.totalAllVolume).toBe(0);
            expect(stats.bestStreak).toBe(0);
        });
    });

    describe('getUnlockedBadges', () => {
        it('returns empty array for zero stats', () => {
            const stats = { totalSessions: 0, completedPlans: 0, currentStreak: 0, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            expect(getUnlockedBadges(stats)).toEqual([]);
        });

        it('returns first_step badge for 1 session', () => {
            const stats = { totalSessions: 1, completedPlans: 0, currentStreak: 0, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('first_step');
        });

        it('returns week_warrior badge for 3 day streak', () => {
            const stats = { totalSessions: 3, completedPlans: 0, currentStreak: 3, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('week_warrior');
        });

        it('returns month_monster badge for 30 day streak', () => {
            const stats = { totalSessions: 30, completedPlans: 0, currentStreak: 30, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('month_monster');
        });

        it('returns century_club badge for 100 sessions', () => {
            const stats = { totalSessions: 100, completedPlans: 0, currentStreak: 0, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('century_club');
        });

        it('returns complete_athlete badge when all 9 plans completed', () => {
            const stats = { totalSessions: 162, completedPlans: 9, currentStreak: 0, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('complete_athlete');
        });

        it('does not return complete_athlete for partial completion', () => {
            const stats = { totalSessions: 100, completedPlans: 8, currentStreak: 0, totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).not.toContain('complete_athlete');
        });

        it('includes gym badges when gym stats qualify', () => {
            const stats = { totalSessions: 0, completedPlans: 0, currentStreak: 0, totalGymSessions: 1, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('first_weight');
        });

        it('includes both home and gym badges', () => {
            const stats = { totalSessions: 1, completedPlans: 0, currentStreak: 0, totalGymSessions: 1, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedBadges(stats);
            expect(badges.map(b => b.id)).toContain('first_step');
            expect(badges.map(b => b.id)).toContain('first_weight');
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

// ──── Gym Gamification Tests ────
describe('gymGamification', () => {
    describe('GYM_BADGES', () => {
        it('contains expected gym badges', () => {
            expect(GYM_BADGES.length).toBe(9);
            expect(GYM_BADGES.map(b => b.id)).toContain('first_weight');
            expect(GYM_BADGES.map(b => b.id)).toContain('iron_warrior');
            expect(GYM_BADGES.map(b => b.id)).toContain('plateau_breaker');
            expect(GYM_BADGES.map(b => b.id)).toContain('volume_king');
            expect(GYM_BADGES.map(b => b.id)).toContain('consistent_lifter');
        });

        it('each badge has required fields', () => {
            GYM_BADGES.forEach(badge => {
                expect(badge.id).toBeDefined();
                expect(badge.name).toBeDefined();
                expect(badge.desc).toBeDefined();
                expect(badge.icon).toBeDefined();
                expect(typeof badge.condition).toBe('function');
            });
        });
    });

    describe('calculateGymStats', () => {
        it('returns zero stats for empty gym history', () => {
            const stats = calculateGymStats([], 0);
            expect(stats.totalGymSessions).toBe(0);
            expect(stats.totalGymVolume).toBe(0);
            expect(stats.gymPRs).toBe(0);
            expect(stats.gymStreak).toBe(0);
        });

        it('counts gym sessions correctly', () => {
            const gymHistory = [
                { date: '2026-01-01T10:00:00Z', exercises: [{ exerciseId: 'bench', totalVolume: 500 }] },
                { date: '2026-01-02T10:00:00Z', exercises: [{ exerciseId: 'squat', totalVolume: 600 }] },
                { date: '2026-01-03T10:00:00Z', exercises: [{ exerciseId: 'deadlift', totalVolume: 700 }] },
            ];
            const stats = calculateGymStats(gymHistory, 0);
            expect(stats.totalGymSessions).toBe(3);
        });

        it('sums total volume across all sessions', () => {
            const gymHistory = [
                { date: '2026-01-01T10:00:00Z', exercises: [{ exerciseId: 'bench', totalVolume: 500 }, { exerciseId: 'row', totalVolume: 300 }] },
                { date: '2026-01-02T10:00:00Z', exercises: [{ exerciseId: 'squat', totalVolume: 600 }] },
            ];
            const stats = calculateGymStats(gymHistory, 0);
            expect(stats.totalGymVolume).toBe(1400);
        });

        it('passes through gym streak', () => {
            const stats = calculateGymStats([], 7);
            expect(stats.gymStreak).toBe(7);
        });

        it('counts personal records correctly', () => {
            const gymHistory = [
                { date: '2026-01-01T10:00:00Z', exercises: [{ exerciseId: 'bench', totalVolume: 500 }] },
                { date: '2026-01-02T10:00:00Z', exercises: [{ exerciseId: 'bench', totalVolume: 600 }] }, // PR for bench
                { date: '2026-01-01T10:00:00Z', exercises: [{ exerciseId: 'squat', totalVolume: 400 }] },
                { date: '2026-01-02T10:00:00Z', exercises: [{ exerciseId: 'squat', totalVolume: 450 }] }, // PR for squat
            ];
            const stats = calculateGymStats(gymHistory, 0);
            expect(stats.gymPRs).toBe(2);
        });

        it('does not count PR if exercise only appears once', () => {
            const gymHistory = [
                { date: '2026-01-01T10:00:00Z', exercises: [{ exerciseId: 'bench', totalVolume: 500 }] },
            ];
            const stats = calculateGymStats(gymHistory, 0);
            expect(stats.gymPRs).toBe(0);
        });

        it('handles missing exercises array gracefully', () => {
            const gymHistory = [
                { date: '2026-01-01T10:00:00Z', totalVolume: 500 },
            ];
            const stats = calculateGymStats(gymHistory, 0);
            expect(stats.totalGymVolume).toBe(500);
            expect(stats.totalGymSessions).toBe(1);
        });
    });

    describe('getUnlockedGymBadges', () => {
        it('returns empty array for zero stats', () => {
            const stats = { totalGymSessions: 0, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            expect(getUnlockedGymBadges(stats)).toEqual([]);
        });

        it('unlocks first_weight for 1 gym session', () => {
            const stats = { totalGymSessions: 1, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedGymBadges(stats);
            expect(badges.map(b => b.id)).toContain('first_weight');
        });

        it('unlocks iron_warrior for 25 gym sessions', () => {
            const stats = { totalGymSessions: 25, totalGymVolume: 0, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedGymBadges(stats);
            expect(badges.map(b => b.id)).toContain('iron_warrior');
        });

        it('unlocks plateau_breaker for gym PRs', () => {
            const stats = { totalGymSessions: 5, totalGymVolume: 0, gymPRs: 1, gymStreak: 0 };
            const badges = getUnlockedGymBadges(stats);
            expect(badges.map(b => b.id)).toContain('plateau_breaker');
        });

        it('unlocks volume_king for 10000kg volume', () => {
            const stats = { totalGymSessions: 10, totalGymVolume: 10000, gymPRs: 0, gymStreak: 0 };
            const badges = getUnlockedGymBadges(stats);
            expect(badges.map(b => b.id)).toContain('volume_king');
        });

        it('unlocks consistent_lifter for 7-day gym streak', () => {
            const stats = { totalGymSessions: 7, totalGymVolume: 0, gymPRs: 0, gymStreak: 7 };
            const badges = getUnlockedGymBadges(stats);
            expect(badges.map(b => b.id)).toContain('consistent_lifter');
        });

        it('unlocks multiple gym badges at once', () => {
            const stats = { totalGymSessions: 25, totalGymVolume: 15000, gymPRs: 5, gymStreak: 30 };
            const badges = getUnlockedGymBadges(stats);
            expect(badges.length).toBeGreaterThanOrEqual(5);
            expect(badges.map(b => b.id)).toContain('first_weight');
            expect(badges.map(b => b.id)).toContain('iron_warrior');
            expect(badges.map(b => b.id)).toContain('volume_king');
            expect(badges.map(b => b.id)).toContain('pr_hunter_gym');
            expect(badges.map(b => b.id)).toContain('iron_habit');
        });
    });
});
