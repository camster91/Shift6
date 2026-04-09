import { createContext, useContext } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';

const WorkoutStateContext = createContext();

export const WorkoutStateProvider = ({ children }) => {
  const [sessionHistory, setSessionHistory] = usePersistedState('history', []);
  const [completedDays, setCompletedDays] = usePersistedState('progress', {});
  const [sprints, setSprints] = usePersistedState('sprints', {});

  return (
    <WorkoutStateContext.Provider value={{
      sessionHistory, setSessionHistory,
      completedDays, setCompletedDays,
      sprints, setSprints
    }}>
      {children}
    </WorkoutStateContext.Provider>
  );
};

export const useWorkoutState = () => useContext(WorkoutStateContext);
