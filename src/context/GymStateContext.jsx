import { createContext, useContext, useState } from 'react';
import { storage } from '../services/storage';

const GymStateContext = createContext();

export const GymStateProvider = ({ children }) => {
  const [gymProgram, setGymProgram] = useState(() => storage.load('gym_program', {}));
  const [gymHistory, setGymHistory] = useState(() => storage.load('gym_history', []));
  const [gymStreak, setGymStreak] = useState(() => storage.load('gym_streak', 0));
  const [gymGoals, setGymGoals] = useState(() => storage.load('gym_goals', {}));

  // ... add setters with storage saving logic
  
  return (
    <GymStateContext.Provider value={{ 
      gymProgram, setGymProgram,
      gymHistory, setGymHistory,
      gymStreak, setGymStreak,
      gymGoals, setGymGoals
    }}>
      {children}
    </GymStateContext.Provider>
  );
};

export const useGymState = () => useContext(GymStateContext);
