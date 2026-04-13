import { useMemo, memo } from 'react'
import { Flame } from 'lucide-react'
import Header from '../Layout/Header'
import BottomNav from '../Layout/BottomNav'
import StartWorkoutButton from './dashboard/StartWorkoutButton'
import RecentWorkouts from './dashboard/RecentWorkouts'
import { getDailyStack, getScheduleFocus, isTrainingDay } from '../../utils/schedule'
import { calculateStreakWithGrace } from '../../utils/gamification'
import { getGymProgram } from '../../data/gymExercises'

/**
 * DashboardShell - Unified shell wrapping both Home and Gym dashboard views.
 *
 * Renders:
 *  - Header (mode-aware)
 *  - Streak badge (max of home + gym streaks)
 *  - StartWorkoutButton (mode-aware hero)
 *  - RecentWorkouts (merged from both histories)
 *  - Mode-specific dashboard content as children
 *  - BottomNav (mode-aware)
 */
const DashboardShell = ({
  mode = 'home',
  currentMode,
  homeWorkout,
  gymWorkout,
  state,
  program,
  theme,
  ui,
  allExercises,
  handleStartWorkout,
  activeProgramKeys,
  trainingPreferences,
  handleSwitchMode,
  handleOpenDrawer,
  audioEnabled,
  setAudioEnabled,
  setTheme,
  children,
}) => {
  const isGym = (mode || currentMode) === 'gym'

  // ── Home streak calculation ──
  const homeStreak = useMemo(() => {
    return calculateStreakWithGrace(state.sessionHistory).streak
  }, [state.sessionHistory])

  // ── Combined streak (max of both) ──
  const combinedStreak = useMemo(() => {
    const gymStreak = state.gymStreak || 0
    return Math.max(homeStreak, gymStreak)
  }, [homeStreak, state.gymStreak])

  // ── Home: today's stack info ──
  const homeDailyStack = useMemo(() => {
    return getDailyStack(state.completedDays, allExercises, activeProgramKeys, trainingPreferences)
  }, [state.completedDays, allExercises, activeProgramKeys, trainingPreferences])

  const homeTodayDescription = useMemo(() => {
    if (homeDailyStack.length === 0) return ''
    if (homeDailyStack.length === 1) {
      const key = homeDailyStack[0]?.exerciseKey
      return allExercises[key]?.name || 'Workout'
    }
    return "Today's Stack"
  }, [homeDailyStack, allExercises])

  const homeIsRestDay = homeDailyStack.length === 0 || !isTrainingDay(trainingPreferences?.preferredDays)

  // ── Gym: today's workout info ──
  const gymTodayInfo = useMemo(() => {
    const gp = state.gymProgram
    if (!gp?.programId) return { name: '', isRest: false }
    const currentProgram = getGymProgram(gp.programId)
    if (!currentProgram) return { name: '', isRest: false }
    const dayIndex = (gp.currentDay - 1) % currentProgram.split.length
    const daySchedule = currentProgram.split[dayIndex]
    if (!daySchedule || daySchedule.isRest) return { name: 'Rest Day', isRest: true }
    return { name: daySchedule.name, isRest: false }
  }, [state.gymProgram])

  // ── Mode-specific start handler ──
  const handleStart = () => {
    if (isGym) {
      const gp = state.gymProgram
      if (!gp?.programId) return
      const currentProgram = getGymProgram(gp.programId)
      if (!currentProgram) return
      const dayIndex = (gp.currentDay - 1) % currentProgram.split.length
      const daySchedule = currentProgram.split[dayIndex]
      if (daySchedule && !daySchedule.isRest) {
        gymWorkout?.handleStartGymWorkout({
          isRest: false,
          dayName: daySchedule.name,
          exercises: daySchedule.exercises,
        })
      }
    } else {
      homeWorkout?.startStack?.()
    }
  }

  // ── Mode-specific workout label and rest state ──
  const todayWorkoutLabel = isGym ? gymTodayInfo.name : homeTodayDescription
  const isRestDay = isGym ? gymTodayInfo.isRest : homeIsRestDay

  return (
    <>
      <Header
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        theme={theme}
        setTheme={setTheme}
        onSwitchMode={handleSwitchMode}
        showSwitchMode
        currentMode={mode || currentMode}
      />

      <main className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
        {/* Streak badge */}
        {combinedStreak > 0 && (
          <div className="flex items-center justify-between mb-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                theme === 'light' ? 'bg-orange-100' : 'bg-orange-500/20'
              }`}>
                <Flame className={`w-4 h-4 ${theme === 'light' ? 'text-orange-600' : 'text-orange-400'} ${combinedStreak >= 7 ? 'animate-bounce' : ''}`} />
                <span className={`text-sm font-bold ${theme === 'light' ? 'text-orange-600' : 'text-orange-400'}`}>
                  {combinedStreak}
                </span>
              </div>
              <span className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>day streak</span>
            </div>
          </div>
        )}

        {/* Mode-aware Start Workout button */}
        <div className="mb-6">
          <StartWorkoutButton
            mode={isGym ? 'gym' : 'home'}
            todayWorkout={todayWorkoutLabel}
            isRestDay={isRestDay}
            onStart={handleStart}
            theme={theme}
          />
        </div>

        {/* Mode-specific dashboard content (Dashboard or GymDashboard) */}
        {children}

        {/* Merged Recent Workouts */}
        <div className="mt-6">
          <RecentWorkouts
            sessionHistory={state.sessionHistory}
            gymHistory={state.gymHistory}
            allExercises={allExercises}
            theme={theme}
          />
        </div>
      </main>

      <BottomNav
        activeTab={ui.activeTab}
        setActiveTab={ui.setActiveTab}
        onMenuClick={handleOpenDrawer}
        theme={theme}
        mode={isGym ? 'gym' : 'home'}
      />
    </>
  )
}

export default memo(DashboardShell)