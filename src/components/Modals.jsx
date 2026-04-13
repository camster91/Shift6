import { lazy, Suspense } from 'react';
import { STARTER_TEMPLATES, EQUIPMENT, PROGRAM_MODES } from '../data/exerciseLibrary.js';

// Lazy-loaded modal components
const AddExercise = lazy(() => import('./Views/AddExercise'));
const ExerciseLibrary = lazy(() => import('./Views/ExerciseLibrary'));
const ProgramManager = lazy(() => import('./Views/ProgramManager'));
const TrainingSettings = lazy(() => import('./Views/TrainingSettings'));
const ProgramSwitcher = lazy(() => import('./Views/ProgramSwitcher'));
const BodyMetrics = lazy(() => import('./Views/BodyMetrics'));
const WarmupRoutine = lazy(() => import('./Views/WarmupRoutine'));
const AccessibilitySettings = lazy(() => import('./Views/AccessibilitySettings'));
const NotificationSettings = lazy(() => import('./Visuals/NotificationSettings'));
const GymProgramManager = lazy(() => import('./Views/GymProgramManager'));
const GymAssessment = lazy(() => import('./Views/GymAssessment'));
const GoalSetter = lazy(() => import('./Views/GoalSetter'));
const ProgramManagerShell = lazy(() => import('./Views/ProgramManagerShell'));
const Guide = lazy(() => import('./Views/Guide'));

/**
 * Modals — Renders all modal dialogs based on activeModal state.
 * Centralizes modal rendering that was previously scattered across App.jsx.
 */
const Modals = ({
    ui,
    state,
    program,
    homeWorkout,
    gymWorkout,
    allExercises,
    homeGoals,
    personalRecords,
    bodyMetrics,
    audioEnabled,
    theme,
    currentMode,
    gymWeightUnit,
    setGymWeightUnit,
    handleAddExercise,
    handleSetDifficulty,
    handleAddToProgram,
    handleRemoveFromProgram,
    handleApplyTemplate,
    handleApplyCustomProgram,
    handleChangeProgramMode,
    handleTrainingPreferencesChange,
    handleSwitchProgram,
    setUserEquipment,
    handleSetHomeGoal,
    handleAddMetric,
    handleDeleteMetric,
    handleWarmupComplete,
    handleWarmupSkip,
    pendingWorkout,
    getRecommendedWarmupForExercise,
    dailyGoal,
    setDailyGoal,
    restTimerOverride,
    setRestTimerOverride,
    warmupEnabled,
    setWarmupEnabled,
    trainingPreferences,
    customExercises,
    activeProgramKeys,
}) => {
    const { activeModal, activeModalData, closeModal } = ui;

    const modalMap = {
        addExercise: (
            <AddExercise onAdd={handleAddExercise} onClose={closeModal} />
        ),
        exerciseLibrary: (
            <ExerciseLibrary
                allExercises={allExercises}
                activeProgram={activeProgramKeys}
                programMode={program.programMode}
                userEquipment={program.userEquipment}
                onAddToProgram={handleAddToProgram}
                onRemoveFromProgram={handleRemoveFromProgram}
                onClose={closeModal}
            />
        ),
        programManager: (
            <ProgramManagerShell mode="home" onClose={closeModal} theme={theme}>
                <ProgramManager
                    allExercises={allExercises}
                    activeProgram={activeProgramKeys}
                    programMode={program.programMode}
                    userEquipment={program.userEquipment}
                    templates={STARTER_TEMPLATES}
                    equipment={EQUIPMENT}
                    programModes={PROGRAM_MODES}
                    onApplyTemplate={handleApplyTemplate}
                    onApplyCustomProgram={handleApplyCustomProgram}
                    onRemoveFromProgram={handleRemoveFromProgram}
                    onChangeProgramMode={handleChangeProgramMode}
                    onSetEquipment={setUserEquipment}
                    completedDays={state.completedDays}
                    onShowLibrary={() => ui.openModal('exerciseLibrary')}
                />
            </ProgramManagerShell>
        ),
        gymProgramManager: (
            <ProgramManagerShell mode="gym" onClose={closeModal} theme={theme}>
                <GymProgramManager
                    currentProgram={state.gymProgram}
                    customGymPrograms={state.customGymPrograms}
                    onSelectProgram={gymWorkout.handleChangeGymProgram}
                    onSaveCustomProgram={gymWorkout.handleSaveCustomGymProgram}
                    onDeleteCustomProgram={gymWorkout.handleDeleteCustomGymProgram}
                    theme={theme}
                />
            </ProgramManagerShell>
        ),
        gymAssessment: gymWorkout.assessmentExercises.length > 0 ? (
            <GymAssessment
                exercises={gymWorkout.assessmentExercises}
                gymWeights={state.gymWeights}
                gymWeightUnit={gymWeightUnit}
                onWeightUnitChange={setGymWeightUnit}
                fitnessLevel="beginner"
                onComplete={gymWorkout.handleCompleteGymAssessment}
                onSkip={closeModal}
                onExit={closeModal}
                audioEnabled={audioEnabled}
                theme={theme}
            />
        ) : null,
        homeGoalSetter: (
            <GoalSetter
                mode={currentMode}
                exerciseKey={activeModalData}
                exercise={allExercises[activeModalData]}
                goal={homeGoals[activeModalData] || null}
                sessionHistory={state.sessionHistory}
                gymHistory={state.gymHistory}
                gymWeights={state.gymWeights}
                gymWeightUnit={gymWeightUnit}
                personalRecords={personalRecords}
                onSetGoal={handleSetHomeGoal}
                onClose={closeModal}
                theme={theme}
            />
        ),
        trainingSettings: (
            <TrainingSettings
                preferences={trainingPreferences}
                onSave={handleTrainingPreferencesChange}
                onClose={closeModal}
                hasProgress={Object.keys(state.completedDays).length > 0}
                theme={theme}
                mode={currentMode}
                dailyGoal={dailyGoal}
                onDailyGoalChange={setDailyGoal}
                restTimerOverride={restTimerOverride}
                onRestTimerChange={setRestTimerOverride}
                warmupEnabled={warmupEnabled}
                onWarmupChange={setWarmupEnabled}
            />
        ),
        programSwitcher: (
            <ProgramSwitcher
                currentProgramId={program.currentProgramId}
                onSelectProgram={handleSwitchProgram}
                onClose={closeModal}
                theme={theme}
            />
        ),
        bodyMetrics: (
            <BodyMetrics
                metrics={bodyMetrics}
                onAddMetric={handleAddMetric}
                onDeleteMetric={handleDeleteMetric}
                onClose={closeModal}
                theme={theme}
            />
        ),
        accessibility: (
            <AccessibilitySettings onClose={closeModal} />
        ),
        notificationSettings: (
            <NotificationSettings
                onClose={closeModal}
                theme={theme}
                mode={currentMode}
            />
        ),
        warmup: (
            <WarmupRoutine
                onComplete={handleWarmupComplete}
                onSkip={handleWarmupSkip}
                recommendedRoutine={pendingWorkout ? getRecommendedWarmupForExercise(pendingWorkout.overrideKey) : 'quick'}
                audioEnabled={audioEnabled}
                theme={theme}
            />
        ),
        guide: (
            <div className={`fixed inset-0 z-50 overflow-y-auto ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'}`}>
                <div className="min-h-screen">
                    <div className={`sticky top-0 z-10 p-4 flex items-center justify-between border-b ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                        <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Exercise Guide</h2>
                        <button onClick={closeModal} className={`px-4 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-slate-200 active:bg-slate-300 text-slate-700' : 'bg-slate-800 active:bg-slate-700 text-white'}`}>Close</button>
                    </div>
                    <div className="p-4"><Guide allExercises={allExercises} activeProgram={activeProgramKeys} /></div>
                </div>
            </div>
        ),
        help: (
            <div className={`fixed inset-0 z-50 overflow-y-auto ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'}`}>
                <div className="min-h-screen">
                    <div className={`sticky top-0 z-10 p-4 flex items-center justify-between border-b ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                        <h2 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Help & Support</h2>
                        <button onClick={closeModal} className={`px-4 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-slate-200 active:bg-slate-300 text-slate-700' : 'bg-slate-800 active:bg-slate-700 text-white'}`}>Close</button>
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
                            <button onClick={() => { closeModal(); ui.openModal('guide'); }} className={`w-full py-3 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-slate-200 active:bg-slate-300 text-slate-700' : 'bg-slate-800 active:bg-slate-700 text-white'}`}>Open Exercise Guide</button>
                        </div>
                        <p className="text-center text-xs text-slate-500 pt-4">Shift6 v2.1.0 - Made with care for your fitness journey</p>
                    </div>
                </div>
            </div>
        ),
    };

    const content = modalMap[activeModal];
    if (!content) return null;

    return <Suspense fallback={null}>{content}</Suspense>;
};

export default Modals;