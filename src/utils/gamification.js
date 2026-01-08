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

export const calculateStats = (completedDays) => {
    let totalSessions = 0;
    let completedPlans = 0;

    // Flatten all dates/sessions to find streaks
    // In this app, completedDays[key] is an array of IDs like 'p11', 'p12'. 
    // We don't currently store timestamps in completedDays (it's just IDs). 
    // To do TRUE streak tracking we would need timestamps.
    // For now, we will approximate 'Consistency' based on total count vs expected.
    // OR we relies on the user to use the app daily. 

    // Wait, the current completion logic relies on IDs. 
    // To support "Streaks" properly we need to know WHEN they finished.
    // Since we didn't migrate to timestamped data yet, we can't calculate *real-time* streaks (e.g. yesterday vs today).
    // Feature Adjustment: We will implement "Session Streaks" (consecutive sessions without failure) 
    // or just "Total Sessions" for now until we migrate data structure.

    // Actually, look at App.jsx -> handleImport/Export. We see it's just ID arrays.
    // CHANGE: We will interpret 'Streak' as 'Sessions Completed' for Version 1 of this feature, 
    // OR we can add a 'lastWorkoutDate' to localStorage to track simple daily streaks separate from exercise progress.

    Object.keys(completedDays).forEach(key => {
        const count = completedDays[key].length;
        totalSessions += count;
        if (count >= 18) completedPlans++;
    });

    return {
        totalSessions,
        completedPlans,
        // Mocked for now since we don't have timestamps in the underlying data structure yet
        currentStreak: Math.min(totalSessions, 5),
        hasEarlyWorkout: false,
        hasLateWorkout: false
    };
};

// Helper to check badges
export const getUnlockedBadges = (stats) => {
    return BADGES.filter(badge => badge.condition(stats));
};
