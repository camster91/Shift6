import { createContext, useContext, useState } from 'react';
import { storage } from '../services/storage';

const UIStateContext = createContext();

export const UIStateProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showDrawer, setShowDrawer] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [showProgramManager, setShowProgramManager] = useState(false);
  const [showTrainingSettings, setShowTrainingSettings] = useState(false);
  const [showProgramSwitcher, setShowProgramSwitcher] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showBodyMetrics, setShowBodyMetrics] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showWarmup, setShowWarmup] = useState(false);
  const [showHomeGoalSetter, setShowHomeGoalSetter] = useState(null); 
  const [showGymProgramManager, setShowGymProgramManager] = useState(false);
  const [showGymAssessment, setShowGymAssessment] = useState(false);

  return (
    <UIStateContext.Provider value={{ 
      activeTab, setActiveTab,
      showDrawer, setShowDrawer,
      showGuide, setShowGuide,
      showHelp, setShowHelp,
      showAddExercise, setShowAddExercise,
      showExerciseLibrary, setShowExerciseLibrary,
      showProgramManager, setShowProgramManager,
      showTrainingSettings, setShowTrainingSettings,
      showProgramSwitcher, setShowProgramSwitcher,
      showNotificationSettings, setShowNotificationSettings,
      showBodyMetrics, setShowBodyMetrics,
      showAccessibility, setShowAccessibility,
      showWarmup, setShowWarmup,
      showHomeGoalSetter, setShowHomeGoalSetter,
      showGymProgramManager, setShowGymProgramManager,
      showGymAssessment, setShowGymAssessment
    }}>
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = () => useContext(UIStateContext);
