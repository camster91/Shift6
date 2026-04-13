import { createContext, useContext, useState, useCallback } from 'react';

const UIStateContext = createContext();

export const UIStateProvider = ({ children }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [showDrawer, setShowDrawer] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [activeModalData, setActiveModalData] = useState(null);

    // Convenience: open a modal, optionally with data payload
    const openModal = useCallback((modal, data = null) => {
        setActiveModal(modal);
        setActiveModalData(data);
    }, []);

    const closeModal = useCallback(() => {
        setActiveModal(null);
        setActiveModalData(null);
    }, []);

    // Backward-compatible boolean getters so existing components can gradually migrate
    // These read from activeModal for convenience
    const showAddExercise = activeModal === 'addExercise';
    const showExerciseLibrary = activeModal === 'exerciseLibrary';
    const showProgramManager = activeModal === 'programManager';
    const showTrainingSettings = activeModal === 'trainingSettings';
    const showProgramSwitcher = activeModal === 'programSwitcher';
    const showNotificationSettings = activeModal === 'notificationSettings';
    const showBodyMetrics = activeModal === 'bodyMetrics';
    const showAccessibility = activeModal === 'accessibility';
    const showWarmup = activeModal === 'warmup';
    const showHomeGoalSetter = activeModal === 'homeGoalSetter' ? activeModalData : null;
    const showGymProgramManager = activeModal === 'gymProgramManager';
    const showGymAssessment = activeModal === 'gymAssessment';
    const showGuide = activeModal === 'guide';
    const showHelp = activeModal === 'help';

    return (
        <UIStateContext.Provider value={{
            activeTab, setActiveTab,
            showDrawer, setShowDrawer,
            activeModal, activeModalData,
            openModal, closeModal,
            // Backward-compatible booleans
            showAddExercise, showExerciseLibrary,
            showProgramManager, showTrainingSettings,
            showProgramSwitcher, showNotificationSettings,
            showBodyMetrics, showAccessibility,
            showWarmup, showHomeGoalSetter,
            showGymProgramManager, showGymAssessment,
            showGuide, showHelp,
        }}>
            {children}
        </UIStateContext.Provider>
    );
};

export const useUIState = () => useContext(UIStateContext);