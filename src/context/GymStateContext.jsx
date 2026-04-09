import { createContext, useContext } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';

const GymStateContext = createContext();

export const GymStateProvider = ({ children }) => {
  const [gymProgram, setGymProgram] = usePersistedState('gym_program', {});
  const [gymHistory, setGymHistory] = usePersistedState('gym_history', []);
  const [gymStreak, setGymStreak] = usePersistedState('gym_streak', 0);
  const [gymGoals, setGymGoals] = usePersistedState('gym_goals', {});
  const [gymWeights, setGymWeights] = usePersistedState('gym_weights', {});
  const [gymReps, setGymReps] = usePersistedState('gym_reps', {});
  const [gymOnboardingComplete, setGymOnboardingComplete] = usePersistedState('gym_onboarding_complete', false, { raw: true });
  const [customGymPrograms, setCustomGymPrograms] = usePersistedState('custom_gym_programs', []);

  return (
    <GymStateContext.Provider value={{
      gymProgram, setGymProgram,
      gymHistory, setGymHistory,
      gymStreak, setGymStreak,
      gymGoals, setGymGoals,
      gymWeights, setGymWeights,
      gymReps, setGymReps,
      gymOnboardingComplete, setGymOnboardingComplete,
      customGymPrograms, setCustomGymPrograms
    }}>
      {children}
    </GymStateContext.Provider>
  );
};

export const useGymState = () => useContext(GymStateContext);
