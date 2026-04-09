import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useWorkoutState } from './context/WorkoutStateContext';
import { useUIState } from './context/UIStateContext';
import { useSettingsState } from './context/SettingsStateContext';
import { useGymState } from './context/GymStateContext';
import { useTheme } from './context/ThemeContext';
import { usePersistedState, safeLoadJSON, STORAGE_PREFIX } from './hooks/usePersistedState';
import { useProgram } from './hooks/useProgram';
import { useHomeWorkout } from './hooks/useHomeWorkout';
import { useGymWorkout } from './hooks/useGymWorkout';
import { useAchievements } from './hooks/useAchievements';
import { useDataManagement } from './hooks/useDataManagement';

import { EXERCISE_PLANS } from './data/exercises.jsx';
import { STARTER_TEMPLATES, EQUIPMENT, PROGRAM_MODES } from './data/exerciseLibrary.js';
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
import WorkoutQuickStart from './components/Views/WorkoutQuickStart';
import WorkoutSession from './components/Views/WorkoutSession';
import Onboarding from './components/Views/Onboarding';

// Lazy-loaded components
const Progress = lazy(() => import('./components/Views/Progress'));
const Guide = lazy(() => import('./components/Views/Guide'));
const AddExercise = lazy(() => import('./components/Views/AddExercise'));
const ExerciseLibrary = lazy(() => import('./components/Views/ExerciseLibrary'));
const ProgramManager = lazy(() => import('./components/Views/ProgramManager'));
const TrainingSettings = lazy(() => import('./components/Views/TrainingSettings'));
const ProgramSwitcher = lazy(() => import('./components/Views/ProgramSwitcher'));
const BodyMetrics = lazy(() => import('./components/Views/BodyMetrics'));
const WarmupRoutine = lazy(() => import('./components/Views/WarmupRoutine'));
const AccessibilitySettings = lazy(() => import('./components/Views/AccessibilitySettings'));
import { MultiAchievementModal } from './components/Visuals/AchievementModal';
import UpdateNotification from './components/Visuals/UpdateNotification';
const NotificationSettings = lazy(() => import('./components/Visuals/NotificationSettings'));
const GymDashboard = lazy(() => import('./components/Views/GymDashboard'));
const GymOnboarding = lazy(() => import('./components/Views/GymOnboarding'));
const GymWorkoutSession = lazy(() => import('./components/Views/GymWorkoutSession'));
const GymProgramManager = lazy(() => import('./components/Views/GymProgramManager'));
const GymAssessment = lazy(() => import('./components/Views/GymAssessment'));
const HomeGoalSetter = lazy(() => import('./components/Views/HomeGoalSetter'));

const App = () => {
    // ──────────── Context State ────────────
    const { completedDays, setCompletedDays, sessionHistory, setSessionHistory, sprints, setSprints } = useWorkoutState();
    const ui = useUIState();
    const { audioEnabled, setAudioEnabled, restTimerOverride, setRestTimerOverride, dailyGoal, setDailyGoal, warmupEnabled, setWarmupEnabled, gymWeightUnit, setGymWeightUnit } = useSettingsState();
    const gym = useGymState();
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
        completedDays, setCompletedDays,
        sessionHistory, setSessionHistory,
        sprints, setSprints,
        exerciseDifficulty, restTimerOverride,
        customPlans, trainingPreferences, warmupEnabled,
        homeGoals, setHomeGoals,
        setPendingConfirm,
    });

    const gymWorkout = useGymWorkout({
        gymProgram: gym.gymProgram, setGymProgram: gym.setGymProgram,
        gymHistory: gym.gymHistory, setGymHistory: gym.setGymHistory,
        gymStreak: gym.gymStreak, setGymStreak: gym.setGymStreak,
        gymGoals: gym.gymGoals, setGymGoals: gym.setGymGoals,
        gymWeights: gym.gymWeights, setGymWeights: gym.setGymWeights,
        gymReps: gym.gymReps, setGymReps: gym.setGymReps,
        gymOnboardingComplete: gym.gymOnboardingComplete, setGymOnboardingComplete: gym.setGymOnboardingComplete,
        customGymPrograms: gym.customGymPrograms, setCustomGymPrograms: gym.setCustomGymPrograms,
    });

    const { newBadges, handleCloseBadges } = useAchievements({
        completedDays, sessionHistory, dailyGoal,
    });

    const { handleExport, handleExportCSV, handleImport, handleFactoryReset } = useDataManagement({
        completedDays, setCompletedDays,
        sessionHistory, setSessionHistory,
        setPendingConfirm,
    });

    // ──────────── Sprint Initialization ────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            let hasChanges = false;
            const updatedSprints = { ...sprints };
            const historyPRs = {};
            sessionHistory.forEach(s => {
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

            if (hasChanges) setSprints(updatedSprints);
        }, 2000);
        return () => clearTimeout(timer);
    }, [activeProgram, trainingPreferences, sessionHistory.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Theme DOM sync
    useEffect(() => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
    }, [theme]);

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
                setCompletedDays(prev => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                });
                setPendingConfirm(null);
            }
        });
    }, [program.setCustomExercises, setCompletedDays]);

    // ──────────── Home Goal Handlers ────────────
    const handleSetHomeGoal = useCallback((exerciseKey, goal) => {
        setHomeGoals(prev => ({ ...prev, [exerciseKey]: goal }));
    }, [setHomeGoals]);

    const handleOpenHomeGoalSetter = useCallback((exerciseKey) => {
        ui.setShowHomeGoalSetter(exerciseKey);
    }, [ui.setShowHomeGoalSetter]);

    // ──────────── Memoized Drawer Handlers ────────────
    const handleOpenDrawer = useCallback(() => ui.setShowDrawer(true), [ui.setShowDrawer]);
    const handleCloseDrawer = useCallback(() => ui.setShowDrawer(false), [ui.setShowDrawer]);
    const handleShowCalendar = useCallback(() => { ui.setActiveTab('progress'); ui.setShowDrawer(false); }, [ui.setActiveTab, ui.setShowDrawer]);
    const handleShowGuide = useCallback(() => { ui.setShowGuide(true); ui.setShowDrawer(false); }, [ui.setShowGuide, ui.setShowDrawer]);
    const handleShowAchievements = useCallback(() => { ui.setActiveTab('progress'); ui.setShowDrawer(false); }, [ui.setActiveTab, ui.setShowDrawer]);
    const handleShowTrainingSettings = useCallback(() => { ui.setShowTrainingSettings(true); ui.setShowDrawer(false); }, [ui.setShowTrainingSettings, ui.setShowDrawer]);
    const handleShowBodyMetrics = useCallback(() => { ui.setShowBodyMetrics(true); ui.setShowDrawer(false); }, [ui.setShowBodyMetrics, ui.setShowDrawer]);
    const handleShowAccessibility = useCallback(() => { ui.setShowAccessibility(true); ui.setShowDrawer(false); }, [ui.setShowAccessibility, ui.setShowDrawer]);
    const handleShowHelp = useCallback(() => { ui.setShowHelp(true); ui.setShowDrawer(false); }, [ui.setShowHelp, ui.setShowDrawer]);
    const handleShowProgramSwitcher = useCallback(() => { ui.setShowProgramSwitcher(true); ui.setShowDrawer(false); }, [ui.setShowProgramSwitcher, ui.setShowDrawer]);
    const handleShowNotifications = useCallback(() => { ui.setShowNotificationSettings(true); ui.setShowDrawer(false); }, [ui.setShowNotificationSettings, ui.setShowDrawer]);
    const onShowAddExercise = useCallback(() => ui.setShowAddExercise(true), [ui.setShowAddExercise]);
    const onShowExerciseLibrary = useCallback(() => ui.setShowExerciseLibrary(true), [ui.setShowExerciseLibrary]);
    const onShowProgramManager = useCallback(() => ui.setShowProgramManager(true), [ui.setShowProgramManager]);

    // ──────────── Computed Values ────────────
    const drawerStats = useMemo(() => {
        const stats = calculateStats(completedDays, sessionHistory);
        const unlockedBadges = getUnlockedBadges(stats);
        return {
            totalSessions: stats.totalSessions,
            currentStreak: stats.currentStreak,
            completedPlans: stats.completedPlans,
            unlockedBadges: unlockedBadges.length
        };
    }, [completedDays, sessionHistory]);

    const homeStreak = useMemo(() => {
        return calculateStats(completedDays, sessionHistory).currentStreak;
    }, [completedDays, sessionHistory]);

    const todayHomeWorkout = useMemo(() => {
        const stack = getDailyStack(completedDays, allExercises, activeProgramKeys, trainingPreferences);
        if (stack.length === 0) return 'Rest Day';
        return stack.slice(0, 2).map(s => allExercises[s.exerciseKey]?.name).filter(Boolean).join(', ');
    }, [completedDays, allExercises, activeProgramKeys, trainingPreferences]);

    const shouldShowGymOnboarding = currentMode === 'gym' && !gym.gymOnboardingComplete;
    const isGymMode = currentMode === 'gym' && gym.gymOnboardingComplete;

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

            {/* Gym Onboarding */}
            {shouldShowGymOnboarding && (
                <GymOnboarding
                    onComplete={gymWorkout.handleGymOnboardingComplete}
                    onSwitchToHome={() => setCurrentMode('home')}
                    theme={theme}
                />
            )}

            {/* Gym Workout Session - Fullscreen */}
            {gymWorkout.currentGymSession && (
                <GymWorkoutSession
                    workout={gymWorkout.currentGymSession}
                    gymWeights={gym.gymWeights}
                    gymReps={gym.gymReps}
                    gymWeightUnit={gymWeightUnit}
                    onWeightUnitChange={setGymWeightUnit}
                    gymHistory={gym.gymHistory}
                    gymGoals={gym.gymGoals}
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

            {/* Gym Dashboard */}
            {isGymMode && !gymWorkout.currentGymSession && (
                <>
                    <Header audioEnabled={audioEnabled} setAudioEnabled={setAudioEnabled} theme={theme} setTheme={setTheme} onSwitchMode={handleSwitchMode} showSwitchMode currentMode="gym" />
                    <main className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
                        <GymDashboard
                            gymProgram={gym.gymProgram}
                            gymWeights={gym.gymWeights}
                            gymWeightUnit={gymWeightUnit}
                            gymHistory={gym.gymHistory}
                            gymStreak={gym.gymStreak}
                            gymGoals={gym.gymGoals}
                            customGymPrograms={gym.customGymPrograms}
                            onStartWorkout={gymWorkout.handleStartGymWorkout}
                            onStartAssessment={gymWorkout.handleStartGymAssessment}
                            onChangeProgram={gymWorkout.handleChangeGymProgram}
                            onShowProgramManager={() => ui.setShowGymProgramManager(true)}
                            onSwitchMode={handleSwitchMode}
                            pendingSession={gymWorkout.pendingGymSession}
                            onResumeSession={gymWorkout.handleResumeGymSession}
                            onDiscardSession={gymWorkout.handleDiscardGymSession}
                            theme={theme}
                        />
                    </main>
                    <BottomNav activeTab={ui.activeTab} setActiveTab={ui.setActiveTab} onMenuClick={handleOpenDrawer} theme={theme} mode="gym" />
                    <SideDrawer {...drawerProps} />
                </>
            )}

            {/* Home Mode */}
            {currentMode === 'home' && (
                <>
                    <Header audioEnabled={audioEnabled} setAudioEnabled={setAudioEnabled} theme={theme} setTheme={setTheme} onSwitchMode={handleSwitchMode} showSwitchMode currentMode="home" />
                    <main className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
                        {ui.activeTab === 'home' && (
                            <Dashboard
                                completedDays={completedDays}
                                sessionHistory={sessionHistory}
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
                                sprints={sprints}
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
                                completedDays={completedDays}
                                sessionHistory={sessionHistory}
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
                                completedDays={completedDays}
                                sessionHistory={sessionHistory}
                                allExercises={allExercises}
                                activeProgram={activeProgramKeys}
                                startWorkout={homeWorkout.startWorkoutWithWarmup}
                                theme={theme}
                                sprints={sprints}
                                getExerciseSprintProgress={homeWorkout.getExerciseSprintProgress}
                            />
                        )}
                    </main>

                    {!homeWorkout.currentSession && onboardingComplete && (
                        <BottomNav activeTab={ui.activeTab} setActiveTab={ui.setActiveTab} onMenuClick={handleOpenDrawer} theme={theme} mode="home" />
                    )}
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
                        completedDays={completedDays}
                        sessionHistory={sessionHistory}
                        personalRecords={personalRecords}
                        setPersonalRecords={setPersonalRecords}
                        allExercises={allExercises}
                        onSaveForLater={homeWorkout.handleSaveSession}
                        theme={theme}
                    />
                </div>
            )}

            {/* ──────────── Modals ──────────── */}

            {ui.showAddExercise && (
                <AddExercise onAdd={handleAddExercise} onClose={() => ui.setShowAddExercise(false)} />
            )}

            {ui.showHomeGoalSetter && (
                <HomeGoalSetter
                    exerciseKey={ui.showHomeGoalSetter}
                    exercise={allExercises[ui.showHomeGoalSetter]}
                    goal={homeGoals[ui.showHomeGoalSetter] || null}
                    sessionHistory={sessionHistory}
                    personalRecords={personalRecords}
                    onSetGoal={handleSetHomeGoal}
                    onClose={() => ui.setShowHomeGoalSetter(null)}
                    theme={theme}
                />
            )}

            {ui.showExerciseLibrary && (
                <ExerciseLibrary
                    allExercises={allExercises}
                    activeProgram={activeProgramKeys}
                    programMode={programMode}
                    userEquipment={userEquipment}
                    onAddToProgram={handleAddToProgram}
                    onRemoveFromProgram={handleRemoveFromProgram}
                    onClose={() => ui.setShowExerciseLibrary(false)}
                />
            )}

            {ui.showProgramManager && (
                <ProgramManager
                    allExercises={allExercises}
                    activeProgram={activeProgramKeys}
                    programMode={programMode}
                    userEquipment={userEquipment}
                    templates={STARTER_TEMPLATES}
                    equipment={EQUIPMENT}
                    programModes={PROGRAM_MODES}
                    onApplyTemplate={handleApplyTemplate}
                    onApplyCustomProgram={handleApplyCustomProgram}
                    onRemoveFromProgram={handleRemoveFromProgram}
                    onChangeProgramMode={handleChangeProgramMode}
                    onSetEquipment={setUserEquipment}
                    completedDays={completedDays}
                    onShowLibrary={() => { ui.setShowProgramManager(false); ui.setShowExerciseLibrary(true); }}
                    onClose={() => ui.setShowProgramManager(false)}
                />
            )}

            {ui.showGymProgramManager && (
                <GymProgramManager
                    currentProgram={gym.gymProgram}
                    customGymPrograms={gym.customGymPrograms}
                    onSelectProgram={gymWorkout.handleChangeGymProgram}
                    onSaveCustomProgram={gymWorkout.handleSaveCustomGymProgram}
                    onDeleteCustomProgram={gymWorkout.handleDeleteCustomGymProgram}
                    onClose={() => ui.setShowGymProgramManager(false)}
                    theme={theme}
                />
            )}

            {ui.showGymAssessment && gymWorkout.assessmentExercises.length > 0 && (
                <GymAssessment
                    exercises={gymWorkout.assessmentExercises}
                    gymWeights={gym.gymWeights}
                    gymWeightUnit={gymWeightUnit}
                    onWeightUnitChange={setGymWeightUnit}
                    fitnessLevel="beginner"
                    onComplete={gymWorkout.handleCompleteGymAssessment}
                    onSkip={() => { ui.setShowGymAssessment(false); }}
                    onExit={() => { ui.setShowGymAssessment(false); }}
                    audioEnabled={audioEnabled}
                    theme={theme}
                />
            )}

            {!onboardingComplete && (
                <Onboarding
                    equipment={EQUIPMENT}
                    templates={STARTER_TEMPLATES}
                    onComplete={handleCompleteOnboarding}
                    onSelectGym={() => { setCurrentMode('gym'); setOnboardingComplete(true); }}
                />
            )}

            {ui.showTrainingSettings && (
                <TrainingSettings
                    preferences={trainingPreferences}
                    onSave={handleTrainingPreferencesChange}
                    onClose={() => ui.setShowTrainingSettings(false)}
                    hasProgress={Object.keys(completedDays).length > 0}
                    theme={theme}
                    mode={currentMode}
                    dailyGoal={dailyGoal}
                    onDailyGoalChange={setDailyGoal}
                    restTimerOverride={restTimerOverride}
                    onRestTimerChange={setRestTimerOverride}
                    warmupEnabled={warmupEnabled}
                    onWarmupChange={setWarmupEnabled}
                />
            )}

            {ui.showProgramSwitcher && (
                <ProgramSwitcher
                    currentProgramId={currentProgramId}
                    onSelectProgram={handleSwitchProgram}
                    onClose={() => ui.setShowProgramSwitcher(false)}
                    theme={theme}
                />
            )}

            {ui.showBodyMetrics && (
                <BodyMetrics
                    metrics={bodyMetrics}
                    onAddMetric={handleAddMetric}
                    onDeleteMetric={handleDeleteMetric}
                    onClose={() => ui.setShowBodyMetrics(false)}
                    theme={theme}
                />
            )}

            {ui.showAccessibility && (
                <AccessibilitySettings onClose={() => ui.setShowAccessibility(false)} />
            )}

            {ui.showNotificationSettings && (
                <NotificationSettings
                    onClose={() => ui.setShowNotificationSettings(false)}
                    theme={theme}
                    mode={currentMode}
                />
            )}

            {ui.showWarmup && (
                <WarmupRoutine
                    onComplete={homeWorkout.handleWarmupComplete}
                    onSkip={homeWorkout.handleWarmupSkip}
                    recommendedRoutine={homeWorkout.pendingWorkout ? homeWorkout.getRecommendedWarmupForExercise(homeWorkout.pendingWorkout.overrideKey) : 'quick'}
                    audioEnabled={audioEnabled}
                    theme={theme}
                />
            )}

            {ui.showGuide && (
                <div className={`fixed inset-0 z-50 overflow-y-auto ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'}`}>
                    <div className="min-h-screen">
                        <div className={`sticky top-0 z-10 p-4 flex items-center justify-between border-b ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                            <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Exercise Guide</h2>
                            <button onClick={() => ui.setShowGuide(false)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-slate-200 active:bg-slate-300 text-slate-700' : 'bg-slate-800 active:bg-slate-700 text-white'}`}>Close</button>
                        </div>
                        <div className="p-4"><Guide allExercises={allExercises} activeProgram={activeProgramKeys} /></div>
                    </div>
                </div>
            )}

            {ui.showHelp && (
                <div className={`fixed inset-0 z-50 overflow-y-auto ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'}`}>
                    <div className="min-h-screen">
                        <div className={`sticky top-0 z-10 p-4 flex items-center justify-between border-b ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                            <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Help & Support</h2>
                            <button onClick={() => ui.setShowHelp(false)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-slate-200 active:bg-slate-300 text-slate-700' : 'bg-slate-800 active:bg-slate-700 text-white'}`}>Close</button>
                        </div>
                        <div className="p-4 space-y-6">
                            {[
                                { title: 'Getting Started', color: 'cyan', items: ['Select your experience level during onboarding to get personalized programs', 'Tap any exercise card on the home screen to start a workout', 'Follow the sets and reps shown, rest between sets as indicated', 'Complete all sets to mark the day as done'] },
                                { title: 'Daily Goals', color: 'emerald', items: ['Set your daily workout goal in Training Settings', 'Track your progress on the home screen', 'Build streaks by working out consistently', 'Earn badges for reaching milestones'] },
                                { title: 'Tips for Success', color: 'orange', items: ['Focus on form over speed - quality reps build strength', 'Use the warmup routine before intense workouts', 'Track your body metrics to see progress over time', "Rest days are important - don't skip them!"] },
                            ].map(section => (
                                <div key={section.title} className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                    <h3 className={`text-lg font-semibold text-${section.color}-400 mb-3`}>{section.title}</h3>
                                    <ul className={`space-y-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                                        {section.items.map(item => <li key={item}>• {item}</li>)}
                                    </ul>
                                </div>
                            ))}
                            <div className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                <h3 className="text-lg font-semibold text-pink-400 mb-3">Need More Help?</h3>
                                <p className={`text-sm mb-3 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>Check the Exercise Guide for detailed form instructions and tips for each movement.</p>
                                <button onClick={() => { ui.setShowHelp(false); ui.setShowGuide(true); }} className={`w-full py-3 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-slate-200 active:bg-slate-300 text-slate-700' : 'bg-slate-800 active:bg-slate-700 text-white'}`}>Open Exercise Guide</button>
                            </div>
                            <p className="text-center text-xs text-slate-500 pt-4">Shift6 v2.1.0 - Made with care for your fitness journey</p>
                        </div>
                    </div>
                </div>
            )}

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
