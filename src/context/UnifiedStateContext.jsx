import { createContext, useContext, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';

const UnifiedStateContext = createContext();

export const UnifiedStateProvider = ({ children }) => {
    // ──────────── Home (bodyweight) state ────────────
    const [sessionHistory, setSessionHistory] = usePersistedState('history', []);
    const [completedDays, setCompletedDays] = usePersistedState('progress', {});
    const [sprints, setSprints] = usePersistedState('sprints', {});

    // ──────────── Gym (weights) state ────────────
    const [gymProgram, setGymProgram] = usePersistedState('gym_program', {});
    const [gymHistory, setGymHistory] = usePersistedState('gym_history', []);
    const [gymStreak, setGymStreak] = usePersistedState('gym_streak', 0);
    const [gymGoals, setGymGoals] = usePersistedState('gym_goals', {});
    const [gymWeights, setGymWeights] = usePersistedState('gym_weights', {});
    const [gymReps, setGymReps] = usePersistedState('gym_reps', {});
    const [gymOnboardingComplete, setGymOnboardingComplete] = usePersistedState('gym_onboarding_complete', false, { raw: true });
    const [customGymPrograms, setCustomGymPrograms] = usePersistedState('custom_gym_programs', []);

    // ──────────── Computed cross-mode values ────────────
    const totalWorkoutCount = useMemo(() => sessionHistory.length + gymHistory.length, [sessionHistory.length, gymHistory.length]);

    const unifiedStreak = useMemo(() => {
        const homeStreak = (() => {
            if (sessionHistory.length === 0) return 0;
            const dates = [...new Set(sessionHistory.map(s => new Date(s.date).toDateString()))].sort().reverse();
            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            for (const d of dates) {
                const date = new Date(d);
                date.setHours(0, 0, 0, 0);
                const diff = (today - date) / (1000 * 60 * 60 * 24);
                if (diff <= streak + 1) {
                    streak = Math.floor(diff) + 1;
                } else break;
            }
            return streak;
        })();
        return Math.max(homeStreak, gymStreak);
    }, [sessionHistory, gymStreak]);

    const value = useMemo(() => ({
        // Home state
        sessionHistory, setSessionHistory,
        completedDays, setCompletedDays,
        sprints, setSprints,

        // Gym state
        gymProgram, setGymProgram,
        gymHistory, setGymHistory,
        gymStreak, setGymStreak,
        gymGoals, setGymGoals,
        gymWeights, setGymWeights,
        gymReps, setGymReps,
        gymOnboardingComplete, setGymOnboardingComplete,
        customGymPrograms, setCustomGymPrograms,

        // Cross-mode computed
        totalWorkoutCount,
        unifiedStreak,
    }), [
        sessionHistory, setSessionHistory,
        completedDays, setCompletedDays,
        sprints, setSprints,
        gymProgram, setGymProgram,
        gymHistory, setGymHistory,
        gymStreak, setGymStreak,
        gymGoals, setGymGoals,
        gymWeights, setGymWeights,
        gymReps, setGymReps,
        gymOnboardingComplete, setGymOnboardingComplete,
        customGymPrograms, setCustomGymPrograms,
        totalWorkoutCount, unifiedStreak,
    ]);

    return (
        <UnifiedStateContext.Provider value={value}>
            {children}
        </UnifiedStateContext.Provider>
    );
};

export const useUnifiedState = () => useContext(UnifiedStateContext);