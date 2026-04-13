import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useUnifiedState } from './context/UnifiedStateContext';
import { useUIState } from './context/UIStateContext';
import { useSettingsState } from './context/SettingsStateContext';
import { useTheme } from './context/ThemeContext';
import { usePersistedState, safeLoadJSON, STORAGE_PREFIX } from './hooks/usePersistedState';
import { useProgram } from './hooks/useProgram';
import { useHomeWorkout } from './hooks/useHomeWorkout';
import { useGymWorkout } from './hooks/useGymWorkout';
import { useAchievements } from './hooks/useAchievements';
import { useDataManagement } from './hooks/useDataManagement';

import { EXERCISE_PLANS } from './data/exercises.jsx';
import { getDailyStack } from './utils/schedule';
import { calculateStats, getUnlockedBadges } from './utils/gamification';
import {
    getActiveSprint,
    getOrCreateSprint,
} from './utils/progression.js';


// Core layout components (always needed)
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import SideDrawer from './components/Layout/SideDrawer';
import Dashboard from './components/Views/Dashboard';
import DashboardShell from './components/Views/DashboardShell';
import WorkoutQuickStart from './components/Views/WorkoutQuickStart';
import WorkoutSession from './components/Views/WorkoutSession';
import OnboardingFlow from './components/Views/OnboardingFlow';

// Lazy-loaded components (still needed by App directly)
const Progress = lazy(() => import('./components/Views/Progress'));
const GymDashboard = lazy(() => import('./components/Views/GymDashboard'));
const GymWorkoutSession = lazy(() => import('./components/Views/GymWorkoutSession'));
import { MultiAchievementModal } from './components/Visuals/AchievementModal';
import UpdateNotification from './components/Visuals/UpdateNotification';
import Modals from './components/Modals';

const App = () => {
    // ──────────── Context State ────────────
    const state = useUnifiedState();
    const ui = useUIState();
    const { audioEnabled, setAudioEnabled, restTimerOverride, setRestTimerOverride, dailyGoal, setDailyGoal, warmupEnabled, setWarmupEnabled, gymWeightUnit, setGymWeightUnit } = useSettingsState();
    const { theme, setTheme } = useTheme();

    // ──────────── Persisted State (local to App) ────────────
    const [personalRecords, setPersonalRecords] = usePersistedState('personal_records', {});
    const [bodyMetrics, setBodyMetrics] = usePersistedState('body_metrics', []);
    const [homeGoals, setHomeGoals] = usePersistedState('home_goals', {});
    const [pendingConfirm, setPendingConfirm] = useState(null);

    // ──────────── Custom Hooks ────────────
    const program = useProgram();
    const {
        allExercises, activeProgramKeys, customExercises,
        exerciseDifficulty, activeProgram, programMode,
        userEquipment, onboardingComplete, currentMode,
        currentProgramId, trainingPreferences, customPlans,
        handleAddExercise, handleSetDifficulty,
        handleAddToProgram, handleRemoveFromProgram,
        handleApplyTemplate, handleApplyCustomProgram,
        handleCompleteOnboarding, handleTrainingPreferencesChange,
        handleChangeProgramMode, handleSwitchProgram,
        handleSwitchMode, handleSelectMode, setOnboardingComplete, setCurrentMode,
        setUserEquipment,
    } = program;

    const homeWorkout = useHomeWorkout({
        allExercises, activeProgramKeys,
        completedDays: state.completedDays, setCompletedDays: state.setCompletedDays,
        sessionHistory: state.sessionHistory, setSessionHistory: state.setSessionHistory,
        sprints: state.sprints, setSprints: state.setSprints,
        exerciseDifficulty, restTimerOverride,
        customPlans, trainingPreferences, warmupEnabled,
        homeGoals, setHomeGoals,
        setPendingConfirm,
        setShowWarmup: (show) => show ? ui.openModal('warmup') : ui.closeModal(),
    });

    const gymWorkout = useGymWorkout({
        gymProgram: state.gymProgram, setGymProgram: state.setGymProgram,
        gymHistory: state.gymHistory, setGymHistory: state.setGymHistory,
        gymStreak: state.gymStreak, setGymStreak: state.setGymStreak,
        gymGoals: state.gymGoals, setGymGoals: state.setGymGoals,
        gymWeights: state.gymWeights, setGymWeights: state.setGymWeights,
        gymReps: state.gymReps, setGymReps: state.setGymReps,
        gymOnboardingComplete: state.gymOnboardingComplete, setGymOnboardingComplete: state.setGymOnboardingComplete,
        customGymPrograms: state.customGymPrograms, setCustomGymPrograms: state.setCustomGymPrograms,
        setShowGymAssessment: (show) => show ? ui.openModal('gymAssessment') : ui.closeModal(),
    });

    const { newBadges, handleCloseBadges } = useAchievements({
        completedDays: state.completedDays, sessionHistory: state.sessionHistory, dailyGoal,
        gymHistory: state.gymHistory, gymStreak: state.gymStreak,
    });

    const { handleExport, handleExportCSV, handleImport, handleFactoryReset } = useDataManagement({
        completedDays: state.completedDays, setCompletedDays: state.setCompletedDays,
        sessionHistory: state.sessionHistory, setSessionHistory: state.setSessionHistory,
        setPendingConfirm,
    });

    // ──────────── Sprint Initialization ────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            let hasChanges = false;
            const updatedSprints = { ...state.sprints };
            const historyPRs = {};
            state.sessionHistory.forEach(s => {
                if (!historyPRs[s.exerciseKey] || s.volume > historyPRs[s.exerciseKey]) {
                    historyPRs[s.exerciseKey] = s.volume;
                }
            });

            (activeProgram || Object.keys(EXERCISE_PLANS)).forEach(exKey => {
                if (getActiveSprint(updatedSprints, exKey)) return;
                const exercise = allExercises[exKey];
                if (!exercise) return;

                const historyMax = historyPRs[exKey] || 0;
                const calibrations = safeLoadJSON(`${STORAGE_PREFIX}calibrations`, {});
                const calibrationFactor = calibrations[exKey] || 1.0;
                let startMax = Math.round((exercise.startReps || 10) * calibrationFactor);
                if (historyMax > startMax) startMax = historyMax;

                const newSprint = getOrCreateSprint(updatedSprints, exKey, startMax, trainingPreferences, exercise);
                if (newSprint) {
                    updatedSprints[newSprint.id] = newSprint;
                    hasChanges = true;
                }
            });

            if (hasChanges) state.setSprints(updatedSprints);
        }, 2000);
        return () => clearTimeout(timer);
    }, [activeProgram, trainingPreferences, state.sessionHistory.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // ──────────── Body Metrics ────────────
    const handleAddMetric = useCallback((metric) => {
        setBodyMetrics(prev => [...prev, metric]);
    }, [setBodyMetrics]);

    const handleDeleteMetric = useCallback((id) => {
        setBodyMetrics(prev => prev.filter(m => m.id !== id));
    }, [setBodyMetrics]);

    // ──────────── Delete Exercise (needs confirm modal) ────────────
    const handleDeleteExercise = useCallback((key) => {
        setPendingConfirm({
            title: 'Delete Exercise',
            message: 'Delete this custom exercise? This cannot be undone.',
            danger: true,
            confirmText: 'Delete',
            onConfirm: () => {
                program.setCustomExercises(prev => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                });
                state.setCompletedDays(prev => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                });
                setPendingConfirm(null);
            }
        });
    }, [program.setCustomExercises, state.setCompletedDays]);

    // ──────────── Home Goal Handlers ────────────
    const handleSetHomeGoal = useCallback((exerciseKey, goal) => {
        setHomeGoals(prev => ({ ...prev, [exerciseKey]: goal }));
    }, [setHomeGoals]);

    const handleOpenHomeGoalSetter = useCallback((exerciseKey) => {
        ui.openModal('homeGoalSetter', exerciseKey);
    }, [ui.openModal]);

    // ──────────── Memoized Drawer Handlers ────────────
    const handleOpenDrawer = useCallback(() => ui.setShowDrawer(true), [ui.setShowDrawer]);
    const handleCloseDrawer = useCallback(() => ui.setShowDrawer(false), [ui.setShowDrawer]);
    const handleShowCalendar = useCallback(() => { ui.setActiveTab('progress'); ui.setShowDrawer(false); }, [ui.setActiveTab, ui.setShowDrawer]);
    const handleShowGuide = useCallback(() => { ui.openModal('guide'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const handleShowAchievements = useCallback(() => { ui.setActiveTab('progress'); ui.setShowDrawer(false); }, [ui.setActiveTab, ui.setShowDrawer]);
    const handleShowTrainingSettings = useCallback(() => { ui.openModal('trainingSettings'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const handleShowBodyMetrics = useCallback(() => { ui.openModal('bodyMetrics'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const handleShowAccessibility = useCallback(() => { ui.openModal('accessibility'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const handleShowHelp = useCallback(() => { ui.openModal('help'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const handleShowProgramSwitcher = useCallback(() => { ui.openModal('programSwitcher'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const handleShowNotifications = useCallback(() => { ui.openModal('notificationSettings'); ui.setShowDrawer(false); }, [ui.openModal, ui.setShowDrawer]);
    const onShowAddExercise = useCallback(() => ui.openModal('addExercise'), [ui.openModal]);
    const onShowExerciseLibrary = useCallback(() => ui.openModal('exerciseLibrary'), [ui.openModal]);
    const onShowProgramManager = useCallback(() => ui.openModal('programManager'), [ui.openModal]);

    // ──────────── Computed Values ────────────
    const drawerStats = useMemo(() => {
        const stats = calculateStats(state.completedDays, state.sessionHistory);
        const unlockedBadges = getUnlockedBadges(stats);
        return {
            totalSessions: stats.totalSessions,
            currentStreak: stats.currentStreak,
            completedPlans: stats.completedPlans,
            unlockedBadges: unlockedBadges.length
        };
    }, [state.completedDays, state.sessionHistory]);

    const homeStreak = useMemo(() => {
        return calculateStats(state.completedDays, state.sessionHistory).currentStreak;
    }, [state.completedDays, state.sessionHistory]);

    const todayHomeWorkout = useMemo(() => {
        const stack = getDailyStack(state.completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return 'Rest Day';
        return stack.slice(0, 2).map(s => allExercises[s.exerciseKey]?.name).filter(Boolean).join(', ');
    }, [state.completedDays, allExercises, activeProgramKeys, trainingPreferences]);

    const shouldShowGymOnboarding = currentMode === 'gym' && !state.gymOnboardingComplete;
    const isGymMode = currentMode === 'gym' && state.gymOnboardingComplete;

    // ──────────── Shared SideDrawer Props ────────────
    const drawerProps = {
        isOpen: ui.showDrawer,
        onClose: handleCloseDrawer,
        stats: drawerStats,
        onShowCalendar: handleShowCalendar,
        onShowGuide: handleShowGuide,
        onShowAchievements: handleShowAchievements,
        onShowHelp: handleShowHelp,
        onShowTrainingSettings: handleShowTrainingSettings,
        onShowBodyMetrics: handleShowBodyMetrics,
        onShowAccessibility: handleShowAccessibility,
        onShowProgramSwitcher: handleShowProgramSwitcher,
        onShowNotifications: handleShowNotifications,
        currentMode,
        onSwitchMode: handleSwitchMode,
        onExport: handleExport,
        onExportCSV: handleExportCSV,
        onImport: handleImport,
        onFactoryReset: handleFactoryReset,
        theme,
    };

    // ──────────── RENDER ────────────
    return (
        <div className={`min-h-screen font-sans selection:bg-cyan-500/30 ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
            <Suspense fallback={null}>
            <UpdateNotification theme={theme} />

            {/* Unified Onboarding — handles both Home and Gym modes */}
            {(!onboardingComplete || shouldShowGymOnboarding) && (
                <OnboardingFlow
                    onCompleteHome={handleCompleteOnboarding}
                    onCompleteGym={gymWorkout.handleGymOnboardingComplete}
                />
            )}

            {/* Gym Workout Session - Fullscreen */}
            {gymWorkout.currentGymSession && (
                <GymWorkoutSession
                    workout={gymWorkout.currentGymSession}
                    gymWeights={state.gymWeights}
                    gymReps={state.gymReps}
                    gymWeightUnit={gymWeightUnit}
                    onWeightUnitChange={setGymWeightUnit}
                    gymHistory={state.gymHistory}
                    gymGoals={state.gymGoals}
                    onRecordGymResult={gymWorkout.handleRecordGymResult}
                    onComplete={gymWorkout.handleCompleteGymWorkout}
                    onExit={() => gymWorkout.setCurrentGymSession(null)}
                    onSaveForLater={gymWorkout.handleSaveGymSession}
                    onStateChange={(internalState) => {
                        gymWorkout.setCurrentGymSession(prev => ({ ...prev, internalState }));
                    }}
                    audioEnabled={audioEnabled}
                    theme={theme}
                />
            )}

            {/* Dashboard — mode-aware shell wrapping Dashboard / GymDashboard */}
            {currentMode === 'home' && (
            <>
                <DashboardShell
                    mode="home"
                    currentMode={currentMode}
                    homeWorkout={homeWorkout}
                    gymWorkout={gymWorkout}
                    state={state}
                    program={program}
                    theme={theme}
                    ui={ui}
                    allExercises={allExercises}
                    handleStartWorkout={homeWorkout.startStack}
                    activeProgramKeys={activeProgramKeys}
                    trainingPreferences={trainingPreferences}
                    handleSwitchMode={handleSwitchMode}
                    handleOpenDrawer={handleOpenDrawer}
                    audioEnabled={audioEnabled}
                    setAudioEnabled={setAudioEnabled}
                    setTheme={setTheme}
                >
                    {ui.activeTab === 'home' && (
                        <Dashboard
                            completedDays={state.completedDays}
                            sessionHistory={state.sessionHistory}
                            startStack={homeWorkout.startStack}
                            startWorkout={homeWorkout.startWorkoutWithWarmup}
                            startExpressWorkout={homeWorkout.startExpressWorkout}
                            allExercises={allExercises}
                            customExercises={customExercises}
                            exerciseDifficulty={exerciseDifficulty}
                            onSetDifficulty={handleSetDifficulty}
                            onDeleteExercise={handleDeleteExercise}
                            onShowAddExercise={onShowAddExercise}
                            programMode={programMode}
                            activeProgram={activeProgramKeys}
                            onShowExerciseLibrary={onShowExerciseLibrary}
                            onShowProgramManager={onShowProgramManager}
                            trainingPreferences={trainingPreferences}
                            customPlans={customPlans}
                            sprints={state.sprints}
                            getExerciseSprintProgress={homeWorkout.getExerciseSprintProgress}
                            ensureSprintExists={homeWorkout.ensureSprintExists}
                            onCompleteSprint={homeWorkout.handleCompleteSprint}
                            pendingSession={homeWorkout.pendingSession}
                            onResumeSession={homeWorkout.handleResumeSession}
                            onDiscardSession={homeWorkout.handleDiscardSession}
                            homeGoals={homeGoals}
                            onSetHomeGoal={handleOpenHomeGoalSetter}
                            onViewHomeGoal={handleOpenHomeGoalSetter}
                            theme={theme}
                        />
                    )}

                    {ui.activeTab === 'workout' && (
                        <WorkoutQuickStart
                            completedDays={state.completedDays}
                            sessionHistory={state.sessionHistory}
                            allExercises={allExercises}
                            activeProgram={activeProgramKeys}
                            trainingPreferences={trainingPreferences}
                            startStack={homeWorkout.startStack}
                            startExpressWorkout={homeWorkout.startExpressWorkout}
                            startWorkout={homeWorkout.startWorkoutWithWarmup}
                            theme={theme}
                        />
                    )}

                    {ui.activeTab === 'progress' && (
                        <Progress
                            completedDays={state.completedDays}
                            sessionHistory={state.sessionHistory}
                            allExercises={allExercises}
                            activeProgram={activeProgramKeys}
                            startWorkout={homeWorkout.startWorkoutWithWarmup}
                            theme={theme}
                            sprints={state.sprints}
                            getExerciseSprintProgress={homeWorkout.getExerciseSprintProgress}
                            mode={currentMode}
                            gymHistory={state.gymHistory}
                            gymStreak={state.gymStreak}
                            gymWeightUnit={gymWeightUnit}
                        />
                    )}
                </DashboardShell>
                <SideDrawer {...drawerProps} />
            </>
            )}

            {isGymMode && !gymWorkout.currentGymSession && (
            <>
                <DashboardShell
                    mode="gym"
                    currentMode={currentMode}
                    homeWorkout={homeWorkout}
                    gymWorkout={gymWorkout}
                    state={state}
                    program={program}
                    theme={theme}
                    ui={ui}
                    allExercises={allExercises}
                    handleStartWorkout={gymWorkout.handleStartGymWorkout}
                    activeProgramKeys={activeProgramKeys}
                    trainingPreferences={trainingPreferences}
                    handleSwitchMode={handleSwitchMode}
                    handleOpenDrawer={handleOpenDrawer}
                    audioEnabled={audioEnabled}
                    setAudioEnabled={setAudioEnabled}
                    setTheme={setTheme}
                >
                    <GymDashboard
                        gymProgram={state.gymProgram}
                        gymWeights={state.gymWeights}
                        gymWeightUnit={gymWeightUnit}
                        gymHistory={state.gymHistory}
                        gymStreak={state.gymStreak}
                        gymGoals={state.gymGoals}
                        customGymPrograms={state.customGymPrograms}
                        onStartWorkout={gymWorkout.handleStartGymWorkout}
                        onStartAssessment={gymWorkout.handleStartGymAssessment}
                        onChangeProgram={gymWorkout.handleChangeGymProgram}
                        onShowProgramManager={() => ui.openModal('gymProgramManager')}
                        onSwitchMode={handleSwitchMode}
                        pendingSession={gymWorkout.pendingGymSession}
                        onResumeSession={gymWorkout.handleResumeGymSession}
                        onDiscardSession={gymWorkout.handleDiscardGymSession}
                        theme={theme}
                    />
                </DashboardShell>
                <SideDrawer {...drawerProps} />
            </>
            )}

            {/* Workout Session - Fullscreen Overlay */}
            {homeWorkout.currentSession && (
                <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
                    <WorkoutSession
                        currentSession={homeWorkout.currentSession}
                        setCurrentSession={homeWorkout.setCurrentSession}
                        timeLeft={homeWorkout.timeLeft}
                        setTimeLeft={homeWorkout.setTimeLeft}
                        isTimerRunning={homeWorkout.isTimerRunning}
                        setIsTimerRunning={homeWorkout.setIsTimerRunning}
                        amrapValue={homeWorkout.amrapValue}
                        setAmrapValue={homeWorkout.setAmrapValue}
                        testInput={homeWorkout.testInput}
                        setTestInput={homeWorkout.setTestInput}
                        handleTestSubmit={homeWorkout.handleTestSubmit}
                        applyCalibration={homeWorkout.applyCalibration}
                        completeWorkout={homeWorkout.completeWorkout}
                        audioEnabled={audioEnabled}
                        workoutNotes={homeWorkout.workoutNotes}
                        setWorkoutNotes={homeWorkout.setWorkoutNotes}
                        exerciseTimeLeft={homeWorkout.exerciseTimeLeft}
                        setExerciseTimeLeft={homeWorkout.setExerciseTimeLeft}
                        isExerciseTimerRunning={homeWorkout.isExerciseTimerRunning}
                        setIsExerciseTimerRunning={homeWorkout.setIsExerciseTimerRunning}
                        exerciseTimerStarted={homeWorkout.exerciseTimerStarted}
                        setExerciseTimerStarted={homeWorkout.setExerciseTimerStarted}
                        completedDays={state.completedDays}
                        sessionHistory={state.sessionHistory}
                        personalRecords={personalRecords}
                        setPersonalRecords={setPersonalRecords}
                        allExercises={allExercises}
                        onSaveForLater={homeWorkout.handleSaveSession}
                        theme={theme}
                    />
                </div>
            )}

            {/* ──────────── Modals ──────────── */}
            <Modals
                ui={ui}
                state={state}
                program={program}
                homeWorkout={homeWorkout}
                gymWorkout={gymWorkout}
                allExercises={allExercises}
                homeGoals={homeGoals}
                personalRecords={personalRecords}
                bodyMetrics={bodyMetrics}
                audioEnabled={audioEnabled}
                theme={theme}
                currentMode={currentMode}
                gymWeightUnit={gymWeightUnit}
                setGymWeightUnit={setGymWeightUnit}
                handleAddExercise={handleAddExercise}
                handleSetDifficulty={handleSetDifficulty}
                handleAddToProgram={handleAddToProgram}
                handleRemoveFromProgram={handleRemoveFromProgram}
                handleApplyTemplate={handleApplyTemplate}
                handleApplyCustomProgram={handleApplyCustomProgram}
                handleChangeProgramMode={handleChangeProgramMode}
                handleTrainingPreferencesChange={handleTrainingPreferencesChange}
                handleSwitchProgram={handleSwitchProgram}
                setUserEquipment={setUserEquipment}
                handleSetHomeGoal={handleSetHomeGoal}
                handleAddMetric={handleAddMetric}
                handleDeleteMetric={handleDeleteMetric}
                handleWarmupComplete={homeWorkout.handleWarmupComplete}
                handleWarmupSkip={homeWorkout.handleWarmupSkip}
                pendingWorkout={homeWorkout.pendingWorkout}
                getRecommendedWarmupForExercise={homeWorkout.getRecommendedWarmupForExercise}
                dailyGoal={dailyGoal}
                setDailyGoal={setDailyGoal}
                restTimerOverride={restTimerOverride}
                setRestTimerOverride={setRestTimerOverride}
                warmupEnabled={warmupEnabled}
                setWarmupEnabled={setWarmupEnabled}
                trainingPreferences={trainingPreferences}
                customExercises={customExercises}
                activeProgramKeys={activeProgramKeys}
            />

            {/* Confirm Modal */}
            {pendingConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4" role="dialog" aria-modal="true" aria-label={pendingConfirm.title}>
                    <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'}`}>
                        <h3 className={`text-lg font-bold mb-2 ${pendingConfirm.danger ? 'text-red-400' : 'text-cyan-400'}`}>{pendingConfirm.title}</h3>
                        <p className={`text-sm mb-6 whitespace-pre-line ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{pendingConfirm.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => { pendingConfirm.onCancel?.(); setPendingConfirm(null); }} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Cancel</button>
                            <button onClick={pendingConfirm.onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${pendingConfirm.danger ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>{pendingConfirm.confirmText || 'Confirm'}</button>
                        </div>
                    </div>
                </div>
            )}

            <MultiAchievementModal badges={newBadges} onClose={handleCloseBadges} audioEnabled={audioEnabled} />
            </Suspense>
        </div>
    );
};

export default App;
