import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Check, ChevronUp, ChevronDown, Timer, Trophy } from 'lucide-react'
import { playBeep, playSuccess } from '../../utils/audio'
import { vibrate } from '../../utils/device'
import { GYM_EXERCISES } from '../../data/gymExercises'

/**
 * GymWorkoutSession - Weight-based workout tracking
 * Handles sets, reps, weight tracking with rest timers
 */
const GymWorkoutSession = ({
  workout, // { dayName, exercises: [exerciseId, ...] }
  gymWeights = {}, // { [exerciseId]: lastWeight }
  onComplete,
  onExit,
  audioEnabled = true,
  theme = 'dark'
}) => {
  // Current exercise state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [completedSets, setCompletedSets] = useState({}) // { [exerciseId]: [{ reps, weight, rpe }, ...] }

  // Weight and reps input
  const [currentWeight, setCurrentWeight] = useState(0)
  const [currentReps, setCurrentReps] = useState(0)
  const [currentRpe, setCurrentRpe] = useState(null) // Rate of Perceived Exertion

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const restTimerRef = useRef(null)

  // Workout state
  const [workoutStartTime] = useState(Date.now())
  const [showSummary, setShowSummary] = useState(false)

  const currentExerciseId = workout?.exercises?.[currentExerciseIndex]
  const currentExercise = currentExerciseId ? GYM_EXERCISES[currentExerciseId] : null
  const totalExercises = workout?.exercises?.length || 0
  const totalSets = currentExercise?.defaultSets || 4

  // Initialize weight from history or default
  useEffect(() => {
    if (currentExercise) {
      const lastWeight = gymWeights[currentExerciseId] || currentExercise.defaultWeight || 20
      setCurrentWeight(lastWeight)
      setCurrentReps(currentExercise.defaultReps?.[currentSetIndex] || 8)
    }
  }, [currentExerciseId, currentExercise, currentSetIndex, gymWeights])

  // Rest timer logic
  useEffect(() => {
    if (isResting && restTimeLeft > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current)
            setIsResting(false)
            if (audioEnabled) {
              playBeep()
              vibrate([200, 100, 200])
            }
            return 0
          }
          // Beep at 10 seconds
          if (prev === 11 && audioEnabled) {
            playBeep()
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(restTimerRef.current)
  }, [isResting, restTimeLeft, audioEnabled])

  // Log a completed set
  const logSet = useCallback(() => {
    if (!currentExerciseId) return

    const setData = {
      reps: currentReps,
      weight: currentWeight,
      rpe: currentRpe,
      timestamp: Date.now()
    }

    setCompletedSets(prev => ({
      ...prev,
      [currentExerciseId]: [...(prev[currentExerciseId] || []), setData]
    }))

    const completedSetsForExercise = (completedSets[currentExerciseId]?.length || 0) + 1

    // Check if all sets done for this exercise
    if (completedSetsForExercise >= totalSets) {
      // Move to next exercise
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex(prev => prev + 1)
        setCurrentSetIndex(0)
        setCurrentRpe(null)
        // Start rest before next exercise
        startRest(currentExercise?.restSeconds || 90)
      } else {
        // Workout complete
        if (audioEnabled) {
          playSuccess()
          vibrate([200, 100, 200, 100, 400])
        }
        setShowSummary(true)
      }
    } else {
      // Start rest between sets
      setCurrentSetIndex(prev => prev + 1)
      setCurrentRpe(null)
      startRest(currentExercise?.restSeconds || 90)
    }
  }, [currentExerciseId, currentReps, currentWeight, currentRpe, completedSets, totalSets, currentExerciseIndex, totalExercises, currentExercise, audioEnabled])

  const startRest = (seconds) => {
    setRestTimeLeft(seconds)
    setIsResting(true)
  }

  const skipRest = () => {
    clearInterval(restTimerRef.current)
    setRestTimeLeft(0)
    setIsResting(false)
  }

  const adjustWeight = (delta) => {
    const increment = currentExercise?.weightIncrement || 2.5
    setCurrentWeight(prev => Math.max(0, prev + (delta * increment)))
  }

  const adjustReps = (delta) => {
    setCurrentReps(prev => Math.max(1, prev + delta))
  }

  const handleComplete = () => {
    const workoutData = {
      dayName: workout.dayName,
      date: new Date().toISOString(),
      duration: Math.round((Date.now() - workoutStartTime) / 1000 / 60),
      exercises: Object.entries(completedSets).map(([exerciseId, sets]) => ({
        exerciseId,
        exerciseName: GYM_EXERCISES[exerciseId]?.name,
        sets,
        totalVolume: sets.reduce((sum, s) => sum + (s.reps * s.weight), 0)
      }))
    }
    onComplete(workoutData, completedSets)
  }

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'

  if (!currentExercise && !showSummary) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex items-center justify-center`}>
        <p className="text-slate-400">No exercises in workout</p>
      </div>
    )
  }

  // Workout Summary Screen
  if (showSummary) {
    const totalVolume = Object.values(completedSets).reduce((total, sets) => {
      return total + sets.reduce((sum, s) => sum + (s.reps * s.weight), 0)
    }, 0)

    const totalReps = Object.values(completedSets).reduce((total, sets) => {
      return total + sets.reduce((sum, s) => sum + s.reps, 0)
    }, 0)

    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Workout Complete!</h1>
          <p className="text-slate-400 mb-8">{workout.dayName}</p>

          <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-purple-400">{Object.keys(completedSets).length}</p>
              <p className="text-xs text-slate-500">Exercises</p>
            </div>
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-purple-400">{totalReps}</p>
              <p className="text-xs text-slate-500">Total Reps</p>
            </div>
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-purple-400">{Math.round(totalVolume)}</p>
              <p className="text-xs text-slate-500">Volume (kg)</p>
            </div>
          </div>

          {/* Exercise breakdown */}
          <div className="w-full max-w-sm space-y-2 mb-8">
            {Object.entries(completedSets).map(([exId, sets]) => (
              <div key={exId} className={`${cardBg} rounded-lg p-3 flex justify-between items-center`}>
                <span className="text-white text-sm">{GYM_EXERCISES[exId]?.shortName || exId}</span>
                <span className="text-slate-400 text-sm">
                  {sets.length} sets × {sets[0]?.weight}kg
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={handleComplete}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg"
          >
            Save Workout
          </button>
        </div>
      </div>
    )
  }

  // Rest Timer Screen
  if (isResting) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button onClick={onExit} className="p-2">
            <X className="w-6 h-6 text-slate-400" />
          </button>
          <span className="text-slate-400">
            {currentExerciseIndex + 1}/{totalExercises} exercises
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Timer className="w-16 h-16 text-purple-400 mb-4" />
          <h2 className="text-xl text-slate-400 mb-2">Rest</h2>
          <p className="text-7xl font-bold text-white mb-8">{formatTime(restTimeLeft)}</p>

          <p className="text-slate-500 mb-4">
            Next: Set {currentSetIndex + 1} of {totalSets}
          </p>

          <button
            onClick={skipRest}
            className="px-8 py-3 rounded-xl bg-slate-800 text-white font-medium"
          >
            Skip Rest
          </button>
        </div>
      </div>
    )
  }

  // Main Workout Screen
  const completedSetsForCurrent = completedSets[currentExerciseId]?.length || 0

  return (
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <button onClick={onExit} className="p-2">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold">{workout.dayName}</p>
          <p className="text-slate-500 text-sm">
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Exercise Info */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-1">{currentExercise.name}</h1>
        <p className="text-slate-400 text-sm mb-4">{currentExercise.cue}</p>

        {/* Set Progress */}
        <div className="flex gap-2">
          {Array.from({ length: totalSets }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < completedSetsForCurrent
                  ? 'bg-purple-500'
                  : i === completedSetsForCurrent
                    ? 'bg-purple-500/50'
                    : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <p className="text-slate-500 text-sm mt-2">
          Set {completedSetsForCurrent + 1} of {totalSets}
        </p>
      </div>

      {/* Weight Input */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        {/* Weight */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <p className="text-slate-400 text-sm mb-2">Weight (kg)</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => adjustWeight(-1)}
              className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ChevronDown className="w-8 h-8 text-white" />
            </button>
            <span className="text-5xl font-bold text-white">{currentWeight}</span>
            <button
              onClick={() => adjustWeight(1)}
              className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ChevronUp className="w-8 h-8 text-white" />
            </button>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">
            Last: {gymWeights[currentExerciseId] || currentExercise.defaultWeight}kg
          </p>
        </div>

        {/* Reps */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <p className="text-slate-400 text-sm mb-2">Reps</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => adjustReps(-1)}
              className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ChevronDown className="w-8 h-8 text-white" />
            </button>
            <span className="text-5xl font-bold text-white">{currentReps}</span>
            <button
              onClick={() => adjustReps(1)}
              className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center"
            >
              <ChevronUp className="w-8 h-8 text-white" />
            </button>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">
            Target: {currentExercise.defaultReps?.[currentSetIndex] || 8} reps
          </p>
        </div>

        {/* RPE (optional) */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <p className="text-slate-400 text-sm mb-3">RPE (Rate of Perceived Exertion)</p>
          <div className="flex gap-2">
            {[6, 7, 8, 9, 10].map(rpe => (
              <button
                key={rpe}
                onClick={() => setCurrentRpe(rpe)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentRpe === rpe
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {rpe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log Set Button */}
      <div className="p-6">
        <button
          onClick={logSet}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Log Set
        </button>
      </div>
    </div>
  )
}

export default GymWorkoutSession
