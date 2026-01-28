import { useState, useMemo } from 'react'
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
  Zap
} from 'lucide-react'
import { GYM_EXERCISES, GYM_PROGRAMS, getGymProgram, GYM_DIFFICULTY_LABELS } from '../../data/gymExercises'
import { vibrate } from '../../utils/device'

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

/**
 * GymDashboard - Main view for gym mode
 * Shows current program, today's workout, recent history
 */
const GymDashboard = ({
  gymProgram = null, // { programId, currentWeek, currentDay, startDate }
  gymWeights = {}, // { [exerciseId]: lastWeight }
  gymHistory = [], // [{ date, dayName, exercises, duration, totalVolume }]
  gymStreak = 0,
  onStartWorkout,
  onChangeProgram,
  theme = 'dark'
}) => {
  const [showProgramSelect, setShowProgramSelect] = useState(false)

  // Get current program details
  const currentProgram = gymProgram?.programId ? getGymProgram(gymProgram.programId) : null

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
                  <h2 className={`text-lg font-bold ${textPrimary}`}>{currentProgram.name}</h2>
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
                  width: `${(gymProgram.currentDay / (currentProgram.split.length * 4)) * 100}%`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className={`text-xs ${textSecondary}`}>Progress</span>
              <span className={`text-xs text-purple-400 font-medium`}>
                {Math.round((gymProgram.currentDay / (currentProgram.split.length * 4)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setShowProgramSelect(true)}
            className={`w-full ${cardBg} rounded-2xl p-6 text-center border-2 border-dashed border-slate-700 hover:border-purple-500 transition-colors`}
          >
            <Dumbbell className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className={`font-semibold ${textPrimary} mb-1`}>Select a Program</h3>
            <p className={`text-sm ${textSecondary}`}>Choose your training split to get started</p>
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
                onStartWorkout(todaysWorkout)
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
                      <p className="text-purple-400 font-medium">{Math.round(totalVolume).toLocaleString()} kg</p>
                    </div>
                    <p className={`text-xs ${textSecondary}`}>{workout.duration || 45} min</p>
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

export default GymDashboard
