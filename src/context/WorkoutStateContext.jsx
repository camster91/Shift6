import { createContext, useContext, useState } from 'react';
import { storage } from '../services/storage';

const WorkoutStateContext = createContext();

export const WorkoutStateProvider = ({ children }) => {
  const [sessionHistory, setSessionHistoryState] = useState(() => storage.load('history', []));
  const [completedDays, setCompletedDaysState] = useState(() => storage.load('progress', {}));
  const [sprints, setSprintsState] = useState(() => storage.load('sprints', {}));

  const setSessionHistory = (newValue) => {
    setSessionHistoryState(newValue);
    storage.save('history', newValue);
  };

  const setCompletedDays = (newValue) => {
    setCompletedDaysState(newValue);
    storage.save('progress', newValue);
  };

  const setSprints = (newValue) => {
    setSprintsState(newValue);
    storage.save('sprints', newValue);
  };
  
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
