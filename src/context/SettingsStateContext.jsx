import { createContext, useContext, useState } from 'react';
import { storage } from '../services/storage';

const SettingsStateContext = createContext();

export const SettingsStateProvider = ({ children }) => {
  const [audioEnabled, setAudioEnabled] = useState(() => storage.load('audio_enabled', true));
  const [restTimerOverride, setRestTimerOverride] = useState(() => storage.load('rest_timer', null));
  const [dailyGoal, setDailyGoal] = useState(() => storage.load('daily_goal', 1));
  const [warmupEnabled, setWarmupEnabled] = useState(() => storage.load('warmup_enabled', true));
  const [gymWeightUnit, setGymWeightUnit] = useState(() => storage.load('gym_weight_unit', 'kg'));

  // ... add setters with storage saving logic

  return (
    <SettingsStateContext.Provider value={{ 
      audioEnabled, setAudioEnabled,
      restTimerOverride, setRestTimerOverride,
      dailyGoal, setDailyGoal,
      warmupEnabled, setWarmupEnabled,
      gymWeightUnit, setGymWeightUnit
    }}>
      {children}
    </SettingsStateContext.Provider>
  );
};

export const useSettingsState = () => useContext(SettingsStateContext);
