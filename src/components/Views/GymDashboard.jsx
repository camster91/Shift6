import { useState, useMemo } from 'react'
import {
  Dumbbell,
  ChevronRight,
  Calendar,
  TrendingUp,
  RotateCcw
} from 'lucide-react'
import { GYM_EXERCISES, GYM_PROGRAMS, getGymProgram } from '../../data/gymExercises'

/**
 * GymDashboard - Main view for gym mode
 * Shows current program, today's workout, recent history
 */
const GymDashboard = ({
  gymProgram = null, // { programId, currentWeek, currentDay, startDate }
  gymWeights = {}, // { [exerciseId]: lastWeight }
  gymHistory = [], // [{ date, dayName, exercises, duration, totalVolume }]
  // eslint-disable-next-line no-unused-vars
  gymStreak = 0,
  onStartWorkout,
  onChangeProgram,
  // eslint-disable-next-line no-unused-vars
  onSwitchMode,
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
    return (
      <div className={`min-h-screen ${bgClass} p-4`}>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowProgramSelect(false)}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <h2 className={`text-lg font-semibold ${textPrimary}`}>Select Program</h2>
          <div className="w-16" />
        </div>

        <div className="space-y-3">
          {Object.entries(GYM_PROGRAMS).map(([id, program]) => (
            <button
              key={id}
              onClick={() => {
                onChangeProgram(id)
                setShowProgramSelect(false)
              }}
              className={`w-full ${cardBg} rounded-xl p-4 text-left transition-all hover:ring-2 hover:ring-purple-500/50 ${
                gymProgram?.programId === id ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={`font-semibold ${textPrimary}`}>{program.name}</h3>
                  <p className={`text-sm ${textSecondary} mt-1`}>{program.desc}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-purple-400">
                      {program.daysPerWeek}x/week
                    </span>
                    <span className="text-xs text-slate-500">
                      {program.difficulty}
                    </span>
                  </div>
                </div>
                {gymProgram?.programId === id && (
                  <span className="text-purple-400 text-sm">Current</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Current Program */}
      {currentProgram ? (
        <div>
          <div className={`${cardBg} rounded-2xl p-5 border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className={`text-sm ${textSecondary}`}>Current Program</p>
                <h2 className={`text-xl font-bold ${textPrimary}`}>{currentProgram.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-purple-400 font-bold">Week {gymProgram.currentWeek}</p>
                <p className={`text-sm ${textSecondary}`}>Day {gymProgram.currentDay}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style={{
                  width: `${(gymProgram.currentDay / (currentProgram.split.length * 4)) * 100}%`
                }}
              />
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
        <div>
          <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Today&apos;s Workout</h3>

          {todaysWorkout.isRest ? (
            <div className={`${cardBg} rounded-2xl p-6 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <RotateCcw className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className={`font-semibold ${textPrimary} mb-1`}>Rest Day</h3>
              <p className={`text-sm ${textSecondary}`}>Recovery is part of the process</p>
            </div>
          ) : (
            <button
              onClick={() => onStartWorkout(todaysWorkout)}
              className="w-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-5 text-left hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-200 text-sm">Today</p>
                  <h3 className="text-xl font-bold text-white">{todaysWorkout.dayName}</h3>
                </div>
                <ChevronRight className="w-6 h-6 text-white" />
              </div>

              <div className="flex flex-wrap gap-2">
                {todaysWorkout.exerciseDetails?.slice(0, 4).map(ex => (
                  <span
                    key={ex.id}
                    className="text-xs px-2 py-1 bg-white/20 rounded-lg text-white"
                  >
                    {ex.shortName || ex.name}
                  </span>
                ))}
                {todaysWorkout.exerciseDetails?.length > 4 && (
                  <span className="text-xs px-2 py-1 bg-white/10 rounded-lg text-purple-200">
                    +{todaysWorkout.exerciseDetails.length - 4} more
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Weekly Stats */}
      <div>
        <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>This Week</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className={`${cardBg} rounded-xl p-4 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <p className="text-2xl font-bold text-purple-400">{weeklyStats.workouts}</p>
            <p className={`text-xs ${textSecondary}`}>Workouts</p>
          </div>
          <div className={`${cardBg} rounded-xl p-4 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <p className="text-2xl font-bold text-purple-400">{weeklyStats.totalSets}</p>
            <p className={`text-xs ${textSecondary}`}>Sets</p>
          </div>
          <div className={`${cardBg} rounded-xl p-4 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <p className="text-2xl font-bold text-purple-400">
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
        <div>
          <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Recent Workouts</h3>
          <div className="space-y-2">
            {recentWorkouts.map((workout, idx) => {
              const date = new Date(workout.date)
              const isToday = date.toDateString() === new Date().toDateString()
              const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

              const totalVolume = workout.exercises?.reduce((sum, e) => sum + (e.totalVolume || 0), 0) || 0

              return (
                <div key={idx} className={`${cardBg} rounded-xl p-4 flex items-center justify-between border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{workout.dayName}</p>
                      <p className={`text-sm ${textSecondary}`}>{dayName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-400 font-medium">{Math.round(totalVolume)} kg</p>
                    <p className={`text-xs ${textSecondary}`}>{workout.duration} min</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for no history */}
      {recentWorkouts.length === 0 && currentProgram && (
        <div>
          <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Recent Workouts</h3>
          <div className={`${cardBg} rounded-xl p-6 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <TrendingUp className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className={textSecondary}>Complete your first workout to see history</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GymDashboard
