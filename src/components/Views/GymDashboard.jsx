import { useState, useMemo, memo } from 'react'
import {
  Dumbbell,
  ChevronRight,
  Calendar,
  TrendingUp,
  RotateCcw,
  Flame,
  Trophy,
  Target,
  Play,
  Zap,
  Settings
} from 'lucide-react'
import { GYM_EXERCISES, GYM_PROGRAMS, getGymProgram, GYM_DIFFICULTY_LABELS } from '../../data/gymExercises'
import { vibrate } from '../../utils/device'
import { getCurrentWeek, getCurrentTarget, calculateProgress, getGoalsSummary } from '../../utils/gymProgression'

// Resume Gym Workout Banner - shows when there's a saved session
const ResumeGymWorkoutBanner = ({ session, onResume, onDiscard, theme }) => {
  if (!session) return null

  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const completedSets = Object.values(session.internalState?.completedSets || {}).flat().length
  const currentExercise = session.exercises?.[session.internalState?.currentExerciseIndex || 0]
  const exerciseName = currentExercise ? (GYM_EXERCISES[currentExercise]?.shortName || GYM_EXERCISES[currentExercise]?.name || currentExercise) : 'Unknown'

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4 animate-pulse-slow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <RotateCcw className="text-purple-400" size={20} />
          </div>
          <div>
            <p className={`font-bold text-purple-400`}>Resume Workout</p>
            <p className={`text-xs ${textSecondary}`}>
              {session.dayName} - {exerciseName} • {completedSets} sets done
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDiscard}
            className={`px-3 py-2 text-xs ${textSecondary} hover:${textPrimary} transition-colors`}
          >
            Discard
          </button>
          <button
            onClick={() => {
              vibrate(30)
              onResume()
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// Floating Quick Start Button - matches Home mode style
const QuickStartFAB = ({ onClick, exerciseCount, isVisible }) => {
  if (!isVisible || exerciseCount === 0) return null

  return (
    <button
      onClick={() => {
        vibrate(50)
        onClick()
      }}
      className="fixed bottom-24 right-4 z-30 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full shadow-xl shadow-purple-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
      aria-label={`Start workout with ${exerciseCount} exercises`}
    >
      <div className="relative">
        <Play size={28} className="fill-current ml-1" />
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-purple-600 text-xs font-bold rounded-full flex items-center justify-center">
          {exerciseCount}
        </span>
      </div>
    </button>
  )
}

// Streak display with flame animation
const StreakBadge = ({ streak, theme }) => {
  if (streak <= 0) return null

  const textClass = theme === 'light' ? 'text-orange-600' : 'text-orange-400'
  const isHot = streak >= 7

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
      theme === 'light' ? 'bg-orange-100' : 'bg-orange-500/20'
    } ${isHot ? 'animate-pulse' : ''}`}>
      <Flame className={`w-4 h-4 ${textClass} ${isHot ? 'animate-bounce' : ''}`} />
      <span className={`text-sm font-bold ${textClass}`}>{streak}</span>
    </div>
  )
}

// 6-Week Goals Progress component
const GoalsProgress = ({ exercises, gymGoals, gymWeightUnit, onStartAssessment, theme }) => {
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'

  // Find exercises with and without goals
  const exercisesWithGoals = exercises?.filter(exId => gymGoals[exId]) || []
  const exercisesWithoutGoals = exercises?.filter(exId => !gymGoals[exId]) || []

  // Calculate summary for exercises with goals
  const summary = getGoalsSummary(
    exercisesWithGoals.reduce((acc, exId) => {
      acc[exId] = gymGoals[exId]
      return acc
    }, {})
  )

  if (exercises?.length === 0) return null

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${textSecondary} uppercase tracking-wider`}>6-Week Goals</h3>
        {summary.active > 0 && (
          <span className={`text-xs ${textSecondary}`}>
            {summary.averageProgress}% avg progress
          </span>
        )}
      </div>

      {/* Show prompt to set up goals if exercises have no goals */}
      {exercisesWithoutGoals.length > 0 && (
        <button
          onClick={() => {
            vibrate(30)
            onStartAssessment?.(exercisesWithoutGoals)
          }}
          className={`w-full ${cardBg} rounded-xl p-4 mb-3 border-2 border-dashed ${borderColor} hover:border-purple-500 transition-colors flex items-center gap-3`}
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left flex-1">
            <p className={`font-medium ${textPrimary}`}>Set Up Your Goals</p>
            <p className={`text-xs ${textSecondary}`}>
              {exercisesWithoutGoals.length} exercise{exercisesWithoutGoals.length !== 1 ? 's' : ''} need assessment
            </p>
          </div>
          <ChevronRight className={`w-5 h-5 ${textSecondary}`} />
        </button>
      )}

      {/* Show progress for exercises with goals */}
      {exercisesWithGoals.length > 0 && (
        <div className="space-y-2">
          {exercisesWithGoals.slice(0, 3).map(exId => {
            const goal = gymGoals[exId]
            const exercise = GYM_EXERCISES[exId]
            if (!goal || !exercise) return null

            const progress = calculateProgress(goal)
            const currentWeek = getCurrentWeek(goal)
            const target = getCurrentTarget(goal)

            return (
              <div
                key={exId}
                className={`${cardBg} rounded-xl p-3 border ${borderColor} hover:border-purple-500/30 transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${textPrimary} text-sm`}>
                    {exercise.shortName || exercise.name}
                  </span>
                  <span className={`text-xs ${textSecondary}`}>
                    Week {Math.min(currentWeek, 6)}/6
                  </span>
                </div>

                {/* Progress bar */}
                <div className={`h-2 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-full overflow-hidden mb-1`}>
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress >= 100 ? 'bg-emerald-500' :
                      progress >= 50 ? 'bg-purple-500' :
                      'bg-purple-500/70'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={textSecondary}>
                    Target: {target.targetWeight}{gymWeightUnit} × {target.targetReps}
                  </span>
                  <span className={progress >= 100 ? 'text-emerald-400' : 'text-purple-400'}>
                    {progress}%
                  </span>
                </div>
              </div>
            )
          })}

          {exercisesWithGoals.length > 3 && (
            <p className={`text-xs ${textSecondary} text-center`}>
              +{exercisesWithGoals.length - 3} more exercise{exercisesWithGoals.length - 3 !== 1 ? 's' : ''} with goals
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * GymDashboard - Main view for gym mode
 * Shows current program, today's workout, recent history
 */
const GymDashboard = ({
  gymProgram = null, // { programId, currentWeek, currentDay, startDate, isCustom }
  gymWeights = {}, // { [exerciseId]: lastWeight }
  gymWeightUnit = 'kg', // 'kg' | 'lbs'
  gymHistory = [], // [{ date, dayName, exercises, duration, totalVolume }]
  gymStreak = 0,
  gymGoals = {}, // { [exerciseId]: goal }
  customGymPrograms = [], // User-created programs
  onStartWorkout,
  onStartAssessment, // (exerciseIds) => void
  onChangeProgram,
  onShowProgramManager, // Open the full program manager
  pendingSession = null, // Saved gym session from previous use
  onResumeSession = null, // Resume the pending session
  onDiscardSession = null, // Discard the pending session
  theme = 'dark'
}) => {
  const [showProgramSelect, setShowProgramSelect] = useState(false)

  // Get current program details (check custom programs first)
  const currentProgram = useMemo(() => {
    if (!gymProgram?.programId) return null

    // Check custom programs first
    const customMatch = customGymPrograms?.find(p => p.id === gymProgram.programId)
    if (customMatch) return { ...customMatch, isCustom: true }

    // Fall back to built-in programs
    return getGymProgram(gymProgram.programId)
  }, [gymProgram?.programId, customGymPrograms])

  // Calculate today's workout
  const todaysWorkout = useMemo(() => {
    if (!currentProgram || !gymProgram) return null

    const dayIndex = (gymProgram.currentDay - 1) % currentProgram.split.length
    const daySchedule = currentProgram.split[dayIndex]

    if (!daySchedule || daySchedule.isRest) {
      return { isRest: true, dayName: 'Rest Day' }
    }

    return {
      isRest: false,
      dayName: daySchedule.name,
      exercises: daySchedule.exercises,
      exerciseDetails: daySchedule.exercises
        .filter(exId => GYM_EXERCISES[exId]) // Filter out undefined exercises
        .map(exId => ({
          id: exId,
          ...GYM_EXERCISES[exId],
          lastWeight: gymWeights[exId] || GYM_EXERCISES[exId]?.defaultWeight
        }))
    }
  }, [currentProgram, gymProgram, gymWeights])

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const thisWeekWorkouts = gymHistory.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= weekStart
    })

    const totalVolume = thisWeekWorkouts.reduce((sum, w) => {
      return sum + (w.exercises?.reduce((eSum, e) => eSum + (e.totalVolume || 0), 0) || 0)
    }, 0)

    const totalSets = thisWeekWorkouts.reduce((sum, w) => {
      return sum + (w.exercises?.reduce((eSum, e) => eSum + (e.sets?.length || 0), 0) || 0)
    }, 0)

    return {
      workouts: thisWeekWorkouts.length,
      totalVolume: Math.round(totalVolume),
      totalSets
    }
  }, [gymHistory])

  // Get recent workouts (last 5)
  const recentWorkouts = gymHistory.slice(0, 5)

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  // Program selection modal
  if (showProgramSelect) {
    // Group programs by difficulty
    const programsByDifficulty = Object.entries(GYM_PROGRAMS).reduce((acc, [id, program]) => {
      const diff = program.difficulty || 'beginner'
      if (!acc[diff]) acc[diff] = []
      acc[diff].push({ id, ...program })
      return acc
    }, {})

    return (
      <div className={`min-h-screen ${bgClass} p-4`}>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowProgramSelect(false)}
            className={`${textSecondary} hover:${textPrimary} transition-colors`}
          >
            Cancel
          </button>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Select Program</h2>
          <div className="w-16" />
        </div>

        <div className="space-y-6">
          {['beginner', 'intermediate', 'advanced'].map(difficulty => {
            const programs = programsByDifficulty[difficulty] || []
            if (programs.length === 0) return null

            const diffLabel = GYM_DIFFICULTY_LABELS[difficulty] || { name: difficulty, icon: '💪', color: 'purple' }

            return (
              <div key={difficulty}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{diffLabel.icon}</span>
                  <h3 className={`text-sm font-medium uppercase tracking-wider ${textSecondary}`}>
                    {diffLabel.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                  } ${textSecondary}`}>
                    {programs.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {programs.map((program) => {
                    const isSelected = gymProgram?.programId === program.id
                    return (
                      <button
                        key={program.id}
                        onClick={() => {
                          vibrate(30)
                          onChangeProgram(program.id)
                          setShowProgramSelect(false)
                        }}
                        className={`w-full ${cardBg} rounded-xl p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected
                            ? 'ring-2 ring-purple-500 bg-purple-500/10'
                            : 'hover:ring-2 hover:ring-purple-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold ${textPrimary}`}>{program.name}</h3>
                              {isSelected && (
                                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${textSecondary} mt-1`}>{program.desc}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                              } ${textSecondary}`}>
                                {program.daysPerWeek}x/week
                              </span>
                              <span className={`text-xs ${textSecondary}`}>
                                ~{program.estimatedDuration || 45}min
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 ${textSecondary} flex-shrink-0`} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Resume Workout Banner - Shows when there's a saved session */}
      {pendingSession && onResumeSession && (
        <ResumeGymWorkoutBanner
          session={pendingSession}
          onResume={onResumeSession}
          onDiscard={onDiscardSession}
          theme={theme}
        />
      )}

      {/* Streak and Stats Header */}
      {gymStreak > 0 && (
        <div className="flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <StreakBadge streak={gymStreak} theme={theme} />
            <span className={`text-sm ${textSecondary}`}>day streak</span>
          </div>
          {gymHistory.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">{gymHistory.length}</span>
              <span className={`text-xs ${textSecondary}`}>workouts</span>
            </div>
          )}
        </div>
      )}

      {/* Current Program */}
      {currentProgram ? (
        <div className="animate-fadeIn">
          <div className={`${cardBg} rounded-2xl p-5 border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'} hover:border-purple-500/50 transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className={`text-xs ${textSecondary} uppercase tracking-wider`}>Current Program</p>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-bold ${textPrimary}`}>{currentProgram.name}</h2>
                    {currentProgram.isCustom && (
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${textSecondary}`}>{currentProgram.difficulty} • {currentProgram.daysPerWeek}x/week</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-purple-400 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Week {gymProgram.currentWeek}</span>
                </div>
                <p className={`text-sm ${textSecondary}`}>Day {gymProgram.currentDay}</p>
              </div>
            </div>

            {/* Progress bar with animation */}
            <div className={`h-2.5 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-full overflow-hidden`}>
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 relative overflow-hidden"
                style={{
                  width: `${Math.min(100, (gymProgram.currentDay / (currentProgram.split.length * 4)) * 100)}%`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className={`text-xs ${textSecondary}`}>Progress</span>
              <span className={`text-xs text-purple-400 font-medium`}>
                {Math.min(100, Math.round((gymProgram.currentDay / (currentProgram.split.length * 4)) * 100))}%
              </span>
            </div>

            {/* Manage Programs Button */}
            {onShowProgramManager && (
              <button
                onClick={() => {
                  vibrate(30)
                  onShowProgramManager()
                }}
                className={`mt-4 w-full py-2 px-4 rounded-xl border ${
                  theme === 'light' ? 'border-slate-200 hover:bg-slate-100' : 'border-slate-700 hover:bg-slate-800'
                } ${textSecondary} text-sm flex items-center justify-center gap-2 transition-colors`}
              >
                <Settings className="w-4 h-4" />
                Manage Programs
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => {
              vibrate(30)
              onShowProgramManager ? onShowProgramManager() : setShowProgramSelect(true)
            }}
            className={`w-full ${cardBg} rounded-2xl p-6 text-center border-2 border-dashed border-slate-700 hover:border-purple-500 transition-colors`}
          >
            <Dumbbell className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className={`font-semibold ${textPrimary} mb-1`}>Select a Program</h3>
            <p className={`text-sm ${textSecondary}`}>Choose a template or create your own</p>
          </button>
        </div>
      )}

      {/* Today's Workout */}
      {todaysWorkout && (
        <div className="animate-fadeIn">
          <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider`}>Today&apos;s Workout</h3>

          {todaysWorkout.isRest ? (
            <div className={`${cardBg} rounded-2xl p-6 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className={`font-semibold ${textPrimary} mb-1`}>Rest Day</h3>
              <p className={`text-sm ${textSecondary}`}>Recovery is part of the process. You&apos;ve earned it!</p>
            </div>
          ) : (
            <button
              onClick={() => {
                vibrate(30)
                if (todaysWorkout?.exercises?.length) {
                  onStartWorkout(todaysWorkout)
                }
              }}
              className="w-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-5 text-left hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-200 text-sm flex items-center gap-1">
                    <Play className="w-3 h-3" /> Ready to train
                  </p>
                  <h3 className="text-xl font-bold text-white">{todaysWorkout.dayName}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {todaysWorkout.exerciseDetails?.slice(0, 4).map(ex => (
                  <span
                    key={ex.id}
                    className="text-xs px-3 py-1.5 bg-white/20 rounded-lg text-white font-medium backdrop-blur-sm"
                  >
                    {ex.shortName || ex.name}
                  </span>
                ))}
                {todaysWorkout.exerciseDetails?.length > 4 && (
                  <span className="text-xs px-3 py-1.5 bg-white/10 rounded-lg text-purple-200">
                    +{todaysWorkout.exerciseDetails.length - 4} more
                  </span>
                )}
              </div>

              {/* Exercise count indicator */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
                <span className="text-sm text-purple-200">
                  {todaysWorkout.exerciseDetails?.length || 0} exercises
                </span>
                <span className="text-sm text-white font-medium">
                  ~45 min
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Quick Start FAB */}
      {todaysWorkout && !todaysWorkout.isRest && (
        <QuickStartFAB
          onClick={() => {
            vibrate(50)
            onStartWorkout(todaysWorkout)
          }}
          exerciseCount={todaysWorkout.exerciseDetails?.length || 0}
          isVisible={true}
        />
      )}

      {/* 6-Week Goals Progress */}
      {currentProgram && todaysWorkout && !todaysWorkout.isRest && (
        <GoalsProgress
          exercises={todaysWorkout.exercises}
          gymGoals={gymGoals}
          gymWeightUnit={gymWeightUnit}
          onStartAssessment={onStartAssessment}
          theme={theme}
        />
      )}

      {/* Weekly Stats */}
      <div className="animate-fadeIn">
        <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider`}>This Week</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className={`${cardBg} rounded-xl p-4 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'} hover:border-purple-500/30 transition-colors`}>
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{weeklyStats.workouts}</p>
            <p className={`text-xs ${textSecondary}`}>Workouts</p>
          </div>
          <div className={`${cardBg} rounded-xl p-4 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'} hover:border-blue-500/30 transition-colors`}>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
              <Dumbbell className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{weeklyStats.totalSets}</p>
            <p className={`text-xs ${textSecondary}`}>Sets</p>
          </div>
          <div className={`${cardBg} rounded-xl p-4 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'} hover:border-emerald-500/30 transition-colors`}>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {weeklyStats.totalVolume >= 1000
                ? `${(weeklyStats.totalVolume / 1000).toFixed(1)}k`
                : weeklyStats.totalVolume}
            </p>
            <p className={`text-xs ${textSecondary}`}>Volume (kg)</p>
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <div className="animate-fadeIn">
          <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider`}>Recent Workouts</h3>
          <div className="space-y-2">
            {recentWorkouts.map((workout, idx) => {
              const date = new Date(workout.date)
              const isToday = date.toDateString() === new Date().toDateString()
              const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString()
              const dayName = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

              const totalVolume = workout.exercises?.reduce((sum, e) => sum + (e.totalVolume || 0), 0) || 0

              return (
                <div
                  key={idx}
                  className={`${cardBg} rounded-xl p-4 flex items-center justify-between border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'} hover:border-purple-500/30 transition-colors`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isToday ? 'bg-emerald-500/20' : 'bg-purple-500/20'
                    }`}>
                      <Calendar className={`w-5 h-5 ${isToday ? 'text-emerald-400' : 'text-purple-400'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{workout.dayName}</p>
                      <p className={`text-sm ${textSecondary}`}>{dayName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3 text-purple-400" />
                      <p className="text-purple-400 font-medium">{Math.round(totalVolume).toLocaleString()} {gymWeightUnit || 'kg'}</p>
                    </div>
                    <p className={`text-xs ${textSecondary}`}>{workout.duration || '~45'} min</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for no history */}
      {recentWorkouts.length === 0 && currentProgram && (
        <div className="animate-fadeIn">
          <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider`}>Recent Workouts</h3>
          <div className={`${cardBg} rounded-xl p-6 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className={`font-medium ${textPrimary} mb-1`}>No Workouts Yet</h4>
            <p className={`text-sm ${textSecondary}`}>Complete your first workout to see your history here</p>
          </div>
        </div>
      )}

      {/* Motivational Footer */}
      {currentProgram && (
        <div className={`text-center py-4 animate-fadeIn`}>
          <p className={`text-sm ${textSecondary}`}>
            Keep pushing! Every rep counts. 💪
          </p>
        </div>
      )}
    </div>
  )
}

// ⚡ Bolt: Memoize GymDashboard to prevent re-renders when props are unchanged.
export default memo(GymDashboard)
