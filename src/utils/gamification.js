import { EXERCISE_PLANS } from '../data/exercises';

// Badges Configuration
export const BADGES = [
    { id: 'first_step', name: 'First Step', desc: 'Complete your first workout', icon: '🌱', condition: (p) => p.totalSessions >= 1 },
    { id: 'week_warrior', name: 'Week Warrior', desc: 'Complete 3 workouts in a week', icon: '⚔️', condition: (p) => p.currentStreak >= 3 },
    { id: 'on_fire', name: 'On Fire', desc: '7 day streak', icon: '🔥', condition: (p) => p.currentStreak >= 7 },
    { id: 'mastery', name: 'Master', desc: 'Complete an entire plan', icon: '👑', condition: (p) => p.completedPlans > 0 },
    { id: 'early_bird', name: 'Early Bird', desc: 'Workout before 8am', icon: '🌅', condition: (p) => p.hasEarlyWorkout },
    { id: 'night_owl', name: 'Night Owl', desc: 'Workout after 8pm', icon: '🦉', condition: (p) => p.hasLateWorkout },
];

export const calculateStats = (completedDays, sessionHistory = []) => {
    let totalSessions = 0;
    let completedPlans = 0;

    // Plan Progress
    Object.keys(completedDays).forEach(key => {
        const count = completedDays[key].length;
        totalSessions += count;
        if (count >= 18) completedPlans++;
    });

    // True Streak Calculation from History
    let currentStreak = 0;
    let hasEarlyWorkout = false;
    let hasLateWorkout = false;

    if (sessionHistory.length > 0) {
        // Sort history by date descending
        const sorted = [...sessionHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Time of day checks
        sessionHistory.forEach(s => {
            const hour = new Date(s.date).getHours();
            if (hour < 8) hasEarlyWorkout = true;
            if (hour >= 20) hasLateWorkout = true;
        });

        // Daily Streak
        const uniqueDays = new Set(sorted.map(s => s.date.split('T')[0]));
        const days = Array.from(uniqueDays).sort((a, b) => new Date(b) - new Date(a));

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // If no workout today or yesterday, streak is 0
        if (days[0] === today || days[0] === yesterday) {
            currentStreak = 1;
            for (let i = 0; i < days.length - 1; i++) {
                const current = new Date(days[i]);
                const next = new Date(days[i + 1]);
                const diffDays = (current - next) / (1000 * 60 * 60 * 24);

                if (diffDays <= 1.1) { // Allowing some slack for rounding
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
    }

    return {
        totalSessions,
        completedPlans,
        currentStreak,
        hasEarlyWorkout,
        hasLateWorkout
    };
};

// Helper to check badges
export const getUnlockedBadges = (stats) => {
    return BADGES.filter(badge => badge.condition(stats));
};
