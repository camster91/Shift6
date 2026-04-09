import { createContext, useContext } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';

const SettingsStateContext = createContext();

export const SettingsStateProvider = ({ children }) => {
  const [audioEnabled, setAudioEnabled] = usePersistedState('audio_enabled', true);
  const [restTimerOverride, setRestTimerOverride] = usePersistedState('rest_timer', null);
  const [dailyGoal, setDailyGoal] = usePersistedState('daily_goal', 1);
  const [warmupEnabled, setWarmupEnabled] = usePersistedState('warmup_enabled', true);
  const [gymWeightUnit, setGymWeightUnit] = usePersistedState('gym_weight_unit', 'kg');

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
