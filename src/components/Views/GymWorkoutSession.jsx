import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Check, ChevronUp, ChevronDown, Timer, Trophy, RefreshCw, Youtube, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { playBeep, playSuccess } from '../../utils/audio'
import { vibrate } from '../../utils/device'
import { GYM_EXERCISES } from '../../data/gymExercises'
import { KG_TO_LBS, LBS_TO_KG } from '../../utils/constants'
import { getWeightSuggestion, checkForGymPR, savePR, getRandomPRMessage, getRandomWeightMessage } from '../../utils/progressionCoach'

/**
 * Convert weight between kg and lbs
 */
const convertWeight = (weight, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return weight
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round(weight * KG_TO_LBS * 2) / 2 // Round to nearest 0.5
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round(weight * LBS_TO_KG * 2) / 2 // Round to nearest 0.5
  }
  return weight
}

/**
 * Get weight increment based on unit
 */
const getWeightIncrement = (unit, exerciseIncrement = 2.5) => {
  if (unit === 'lbs') {
    return 5 // 5 lb increments
  }
  return exerciseIncrement // kg increment from exercise config
}

/**
 * VideoModal - YouTube form guide modal
 */
const VideoModal = ({ exercise, onClose, theme = 'dark' }) => {
  if (!exercise || !exercise.videoId) return null

  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${cardBg} border ${borderColor} rounded-xl w-full max-w-2xl overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <h3 className={`text-lg font-bold ${textPrimary}`}>{exercise.name} - Form Guide</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className={textSecondary} />
          </button>
        </div>
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${exercise.videoId}?rel=0`}
            title={`${exercise.name} form guide`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4 space-y-3">
          <p className={`text-sm ${textSecondary}`}>{exercise.cue}</p>
          {exercise.tips && (
            <div className="flex flex-wrap gap-2">
              {exercise.tips.map((tip, i) => (
                <span key={i} className={`text-xs px-2 py-1 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} border rounded-full ${textSecondary}`}>
                  {tip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * GymWorkoutSession - Weight-based workout tracking
 * Handles sets, reps, weight tracking with rest timers
 */
const GymWorkoutSession = ({
  workout, // { dayName, exercises: [exerciseId, ...], internalState?: {...} }
  gymWeights = {}, // { [exerciseId]: lastWeight (in kg) }
  gymReps = {}, // { [exerciseId]: [reps per set] }
  gymWeightUnit = 'kg',
  onWeightUnitChange,
  onComplete,
  onExit,
  onStateChange, // Callback to persist internal state changes
  audioEnabled = true,
  theme = 'dark'
}) => {
  // Current exercise state (initialized from saved state if resuming)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
    workout?.internalState?.currentExerciseIndex || 0
  )
  const [currentSetIndex, setCurrentSetIndex] = useState(
    workout?.internalState?.currentSetIndex || 0
  )
  const [completedSets, setCompletedSets] = useState(
    workout?.internalState?.completedSets || {}
  ) // { [exerciseId]: [{ reps, weight, rpe }, ...] }

  // Weight and reps input (weight stored in kg internally)
  const [currentWeightKg, setCurrentWeightKg] = useState(0)
  const [currentReps, setCurrentReps] = useState(0)
  const [currentRpe, setCurrentRpe] = useState(null) // Rate of Perceived Exertion

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const restTimerRef = useRef(null)

  // Workout state
  const [workoutStartTime] = useState(Date.now())
  const [showSummary, setShowSummary] = useState(false)
  const [isLogging, setIsLogging] = useState(false) // Debounce for log button
  const [showExitConfirm, setShowExitConfirm] = useState(false) // Custom exit modal
  const [showVideo, setShowVideo] = useState(false) // YouTube form video modal
  const [weightSuggestion, setWeightSuggestion] = useState(null) // Smart weight suggestion
  const [showPRCelebration, setShowPRCelebration] = useState(null) // PR celebration modal
  const [sessionPRs, setSessionPRs] = useState([]) // PRs achieved this session

  const currentExerciseId = workout?.exercises?.[currentExerciseIndex]
  const currentExercise = currentExerciseId ? GYM_EXERCISES[currentExerciseId] : null
  const totalExercises = workout?.exercises?.length || 0
  const totalSets = currentExercise?.defaultSets || 4

  // Get display weight (convert from kg to user's preferred unit)
  const displayWeight = convertWeight(currentWeightKg, 'kg', gymWeightUnit)
  const weightIncrement = getWeightIncrement(gymWeightUnit, currentExercise?.weightIncrement)

  // Initialize weight ONLY when exercise changes (NOT on set change!)
  // This fixes the bug where weight would reset after each logged set
  useEffect(() => {
    if (currentExercise && currentExerciseId) {
      // Get last used weight (stored in kg) - only set on exercise change
      const lastWeightKg = gymWeights[currentExerciseId] || currentExercise.defaultWeight || 20
      setCurrentWeightKg(lastWeightKg)
      setCurrentRpe(null) // Reset RPE for new exercise
    }
  }, [currentExerciseId, currentExercise, gymWeights])
  // NOTE: currentSetIndex intentionally NOT in dependencies - weight persists across sets

  // Initialize target reps per set (can update per set since targets may differ)
  useEffect(() => {
    if (currentExercise && currentExerciseId) {
      const lastReps = gymReps[currentExerciseId]
      if (lastReps && lastReps[currentSetIndex] !== undefined) {
        setCurrentReps(lastReps[currentSetIndex])
      } else {
        setCurrentReps(currentExercise.defaultReps?.[currentSetIndex] || 8)
      }
    }
  }, [currentExerciseId, currentExercise, currentSetIndex, gymReps])

  // Persist internal state changes (for crash/refresh recovery)
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        currentExerciseIndex,
        currentSetIndex,
        completedSets,
      })
    }
  }, [currentExerciseIndex, currentSetIndex, completedSets, onStateChange])

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

  // Validate input before logging
  const validateSet = useCallback(() => {
    if (currentReps < 1) {
      return { valid: false, message: 'Please enter at least 1 rep' }
    }
    if (currentReps > 100) {
      return { valid: false, message: 'Reps seem too high. Please check.' }
    }
    if (currentWeightKg < 0) {
      return { valid: false, message: 'Weight cannot be negative' }
    }
    if (currentWeightKg > 500) {
      return { valid: false, message: 'Weight seems too high. Please check.' }
    }
    return { valid: true }
  }, [currentReps, currentWeightKg])

  // Log a completed set (with debounce and validation)
  const logSet = useCallback(() => {
    // Debounce check - prevent double-tap
    if (!currentExerciseId || isLogging) return

    // Validate inputs
    const validation = validateSet()
    if (!validation.valid) {
      vibrate('light')
      alert(validation.message)
      return
    }

    setIsLogging(true)

    const setData = {
      reps: currentReps,
      weight: currentWeightKg, // Always store in kg
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
      // Get all sets for this exercise including the one just completed
      const allSetsForExercise = [...(completedSets[currentExerciseId] || []), setData]

      // Calculate total volume for PR check
      const totalReps = allSetsForExercise.reduce((sum, s) => sum + s.reps, 0)
      const avgWeight = allSetsForExercise.reduce((sum, s) => sum + s.weight, 0) / allSetsForExercise.length
      const avgRpe = allSetsForExercise.filter(s => s.rpe).reduce((sum, s) => sum + s.rpe, 0) / (allSetsForExercise.filter(s => s.rpe).length || 1)

      // Check for PR (best set of the exercise)
      const bestSet = allSetsForExercise.reduce((best, s) => {
        const current1RM = s.weight * (1 + s.reps / 30)
        const best1RM = best.weight * (1 + best.reps / 30)
        return current1RM > best1RM ? s : best
      }, allSetsForExercise[0])

      const gymPRs = JSON.parse(localStorage.getItem('shift6_gym_prs') || '{}')
      const prCheck = checkForGymPR(currentExerciseId, bestSet.weight, bestSet.reps, gymPRs)

      if (prCheck.isNewPR) {
        // Save the PR
        savePR(currentExerciseId, { weight: bestSet.weight, reps: bestSet.reps }, true)

        // Show PR celebration
        setShowPRCelebration({
          exerciseName: currentExercise?.name,
          message: prCheck.message,
          type: prCheck.type,
          estimated1RM: prCheck.estimated1RM
        })
        setSessionPRs(prev => [...prev, { exerciseId: currentExerciseId, ...prCheck }])

        if (audioEnabled) {
          playSuccess()
          vibrate([100, 50, 100, 50, 100, 50, 200])
        }

        // Auto-hide after 3 seconds
        setTimeout(() => setShowPRCelebration(null), 3000)
      }

      // Calculate weight suggestion for next time
      const targetReps = currentExercise?.defaultReps?.[0] || 8
      const suggestion = getWeightSuggestion({
        targetReps,
        actualReps: Math.round(totalReps / allSetsForExercise.length),
        rpe: Math.round(avgRpe),
        currentWeight: avgWeight,
        weightIncrement: currentExercise?.weightIncrement || 2.5,
        recentSessions: [] // Would need gym history for this
      })

      if (suggestion.action !== 'maintain') {
        setWeightSuggestion({
          exerciseName: currentExercise?.name,
          exerciseId: currentExerciseId,
          ...suggestion,
          message: getRandomWeightMessage(suggestion.action)
        })
      }

      // Move to next exercise
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex(prev => prev + 1)
        setCurrentSetIndex(0)
        setCurrentRpe(null)
        // Start rest before next exercise
        startRest(currentExercise?.restSeconds || 90)
      } else {
        // Workout complete
        if (audioEnabled && !prCheck.isNewPR) {
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

    // Reset debounce after short delay
    setTimeout(() => setIsLogging(false), 500)
  }, [currentExerciseId, currentReps, currentWeightKg, currentRpe, completedSets, totalSets, currentExerciseIndex, totalExercises, currentExercise, audioEnabled, isLogging, validateSet])

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
    // Convert increment to kg for storage
    const incrementKg = gymWeightUnit === 'lbs'
      ? weightIncrement * LBS_TO_KG
      : weightIncrement
    setCurrentWeightKg(prev => Math.max(0, prev + (delta * incrementKg)))
  }

  const adjustReps = (delta) => {
    setCurrentReps(prev => Math.max(1, prev + delta))
  }

  const toggleWeightUnit = () => {
    if (onWeightUnitChange) {
      onWeightUnitChange(gymWeightUnit === 'kg' ? 'lbs' : 'kg')
    }
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

  // Format weight for display
  const formatWeight = (weightKg) => {
    const converted = convertWeight(weightKg, 'kg', gymWeightUnit)
    return `${converted}${gymWeightUnit}`
  }

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  // Confirm exit if workout in progress
  const handleExit = () => {
    const completedCount = Object.values(completedSets).flat().length
    if (completedCount > 0) {
      setShowExitConfirm(true)
    } else {
      onExit()
    }
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    onExit()
  }

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

          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Workout Complete!</h1>
          <p className={`${textSecondary} mb-8`}>{workout.dayName}</p>

          <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-purple-400">{Object.keys(completedSets).length}</p>
              <p className={`text-xs ${textSecondary}`}>Exercises</p>
            </div>
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-purple-400">{totalReps}</p>
              <p className={`text-xs ${textSecondary}`}>Total Reps</p>
            </div>
            <div className={`${cardBg} rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold text-purple-400">{formatWeight(totalVolume)}</p>
              <p className={`text-xs ${textSecondary}`}>Volume</p>
            </div>
          </div>

          {/* PRs achieved this session */}
          {sessionPRs.length > 0 && (
            <div className="w-full max-w-sm mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className={`${textPrimary} font-semibold`}>Personal Records!</span>
              </div>
              <div className="space-y-2">
                {sessionPRs.map((pr, i) => (
                  <div key={i} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                    <span className="text-yellow-400 text-sm">{GYM_EXERCISES[pr.exerciseId]?.shortName || pr.exerciseId}</span>
                    <span className={`text-xs ${textSecondary}`}>- {pr.type === 'weight' ? 'Weight PR' : pr.type === 'reps' ? 'Rep PR' : 'New 1RM'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise breakdown */}
          <div className="w-full max-w-sm space-y-2 mb-8">
            {Object.entries(completedSets).map(([exId, sets]) => (
              <div key={exId} className={`${cardBg} rounded-lg p-3 flex justify-between items-center`}>
                <span className={`${textPrimary} text-sm`}>{GYM_EXERCISES[exId]?.shortName || exId}</span>
                <span className={`${textSecondary} text-sm`}>
                  {sets.length} sets × {formatWeight(sets[0]?.weight || 0)}
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
          <button onClick={handleExit} className="p-2">
            <X className={`w-6 h-6 ${textSecondary}`} />
          </button>
          <span className={textSecondary}>
            {currentExerciseIndex + 1}/{totalExercises} exercises
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Timer className="w-16 h-16 text-purple-400 mb-4" />
          <h2 className={`text-xl ${textSecondary} mb-2`}>Rest</h2>
          <p className={`text-7xl font-bold ${textPrimary} mb-8`}>{formatTime(restTimeLeft)}</p>

          <p className={`${textSecondary} mb-4`}>
            Next: Set {currentSetIndex + 1} of {totalSets}
          </p>

          <button
            onClick={skipRest}
            className={`px-8 py-3 rounded-xl ${cardBg} ${textPrimary} font-medium`}
          >
            Skip Rest
          </button>
        </div>
      </div>
    )
  }

  // Main Workout Screen
  const completedSetsForCurrent = completedSets[currentExerciseId]?.length || 0
  const buttonBg = theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'

  // Get last recorded values for display
  const lastWeightKg = gymWeights[currentExerciseId] || currentExercise.defaultWeight
  const lastReps = gymReps[currentExerciseId]
  const hasLastWorkout = lastReps && lastReps.length > 0

  return (
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
        <button onClick={handleExit} className="p-2">
          <X className={`w-6 h-6 ${textSecondary}`} />
        </button>
        <div className="text-center">
          <p className={`${textPrimary} font-semibold`}>{workout.dayName}</p>
          <p className={`${textSecondary} text-sm`}>
            Exercise {currentExerciseIndex + 1} of {totalExercises}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Exercise Info */}
      <div className={`p-6 border-b ${borderColor}`}>
        <div className="flex items-start justify-between mb-1">
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{currentExercise.name}</h1>
          {currentExercise.videoId && (
            <button
              onClick={() => setShowVideo(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Youtube size={16} />
              <span className="text-xs font-medium">Watch</span>
            </button>
          )}
        </div>
        <p className={`${textSecondary} text-sm mb-4`}>{currentExercise.cue}</p>

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
                    : theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
        <p className={`${textSecondary} text-sm mt-2`}>
          Set {completedSetsForCurrent + 1} of {totalSets}
        </p>
      </div>

      {/* Weight Input */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        {/* Weight */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`${textSecondary} text-sm`}>Weight</p>
            <button
              onClick={toggleWeightUnit}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${buttonBg} text-xs font-medium ${textSecondary} hover:opacity-80 transition-opacity`}
            >
              <RefreshCw className="w-3 h-3" />
              {gymWeightUnit.toUpperCase()}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => adjustWeight(-1)}
              className={`w-14 h-14 rounded-xl ${buttonBg} flex items-center justify-center active:scale-95 transition-transform`}
            >
              <ChevronDown className={`w-8 h-8 ${textPrimary}`} />
            </button>
            <div className="text-center">
              <span className={`text-5xl font-bold ${textPrimary}`}>
                {Math.round(displayWeight * 2) / 2}
              </span>
              <span className={`text-2xl ${textSecondary} ml-1`}>{gymWeightUnit}</span>
            </div>
            <button
              onClick={() => adjustWeight(1)}
              className={`w-14 h-14 rounded-xl ${buttonBg} flex items-center justify-center active:scale-95 transition-transform`}
            >
              <ChevronUp className={`w-8 h-8 ${textPrimary}`} />
            </button>
          </div>
          <p className={`${textSecondary} text-xs text-center mt-2`}>
            Last: {formatWeight(lastWeightKg)}
          </p>
        </div>

        {/* Reps */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <p className={`${textSecondary} text-sm mb-2`}>Reps</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => adjustReps(-1)}
              className={`w-14 h-14 rounded-xl ${buttonBg} flex items-center justify-center active:scale-95 transition-transform`}
            >
              <ChevronDown className={`w-8 h-8 ${textPrimary}`} />
            </button>
            <span className={`text-5xl font-bold ${textPrimary}`}>{currentReps}</span>
            <button
              onClick={() => adjustReps(1)}
              className={`w-14 h-14 rounded-xl ${buttonBg} flex items-center justify-center active:scale-95 transition-transform`}
            >
              <ChevronUp className={`w-8 h-8 ${textPrimary}`} />
            </button>
          </div>
          <div className={`${textSecondary} text-xs text-center mt-2 flex items-center justify-center gap-3`}>
            <span>Target: {currentExercise.defaultReps?.[currentSetIndex] || 8}</span>
            {hasLastWorkout && (
              <>
                <span className="text-slate-600">•</span>
                <span>Last: {lastReps[currentSetIndex] || lastReps[lastReps.length - 1]}</span>
              </>
            )}
          </div>
        </div>

        {/* RPE (optional) */}
        <div className={`${cardBg} rounded-xl p-4`}>
          <p className={`${textSecondary} text-sm mb-3`}>RPE (optional)</p>
          <div className="flex gap-2">
            {[6, 7, 8, 9, 10].map(rpe => (
              <button
                key={rpe}
                onClick={() => setCurrentRpe(rpe)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentRpe === rpe
                    ? 'bg-purple-500 text-white'
                    : `${buttonBg} ${textSecondary} hover:opacity-80`
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
          disabled={isLogging}
          className={`w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
            isLogging ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Check className="w-5 h-5" />
          {isLogging ? 'Logging...' : 'Log Set'}
        </button>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-white" />
              </div>
              <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Exit Workout?</h3>
              <p className={textSecondary}>
                You have {Object.values(completedSets).flat().length} sets logged. Your progress will be lost.
              </p>
            </div>
            <div className={`flex border-t ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'}`}>
              <button
                onClick={() => setShowExitConfirm(false)}
                className={`flex-1 py-4 ${textSecondary} hover:bg-slate-800/50 transition-colors`}
              >
                Keep Training
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-4 bg-amber-500 text-white font-semibold"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideo && currentExercise && (
        <VideoModal
          exercise={currentExercise}
          onClose={() => setShowVideo(false)}
          theme={theme}
        />
      )}

      {/* PR Celebration Modal */}
      {showPRCelebration && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 animate-pulse">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">{getRandomPRMessage()}</h2>
            <p className="text-xl text-white mb-2">{showPRCelebration.exerciseName}</p>
            <p className="text-lg text-slate-300">{showPRCelebration.message}</p>
            {showPRCelebration.estimated1RM && (
              <p className="text-sm text-slate-400 mt-2">Est. 1RM: {showPRCelebration.estimated1RM}kg</p>
            )}
          </div>
        </div>
      )}

      {/* Weight Suggestion Banner */}
      {weightSuggestion && (
        <div className="fixed bottom-24 left-4 right-4 z-[60] animate-slide-up">
          <div className={`${cardBg} rounded-xl p-4 border ${
            weightSuggestion.action === 'increase' ? 'border-green-500/50' :
            weightSuggestion.action === 'decrease' ? 'border-red-500/50' :
            weightSuggestion.action === 'deload' ? 'border-amber-500/50' :
            'border-slate-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  weightSuggestion.action === 'increase' ? 'bg-green-500/20' :
                  weightSuggestion.action === 'decrease' ? 'bg-red-500/20' :
                  weightSuggestion.action === 'deload' ? 'bg-amber-500/20' :
                  'bg-slate-700'
                }`}>
                  {weightSuggestion.action === 'increase' && <TrendingUp className="w-5 h-5 text-green-400" />}
                  {weightSuggestion.action === 'decrease' && <TrendingDown className="w-5 h-5 text-red-400" />}
                  {weightSuggestion.action === 'deload' && <Minus className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <p className={`font-semibold ${textPrimary}`}>
                    {weightSuggestion.action === 'increase' ? 'Ready to Progress!' :
                     weightSuggestion.action === 'decrease' ? 'Lower Weight' :
                     weightSuggestion.action === 'deload' ? 'Deload Suggested' : 'Suggestion'}
                  </p>
                  <p className={`text-sm ${textSecondary}`}>{weightSuggestion.message}</p>
                </div>
              </div>
              <button
                onClick={() => setWeightSuggestion(null)}
                className={`p-2 ${textSecondary} hover:opacity-70`}
              >
                <X size={18} />
              </button>
            </div>
            {weightSuggestion.action === 'increase' && weightSuggestion.newWeight && (
              <p className={`mt-2 text-sm ${textSecondary}`}>
                Next time: Try {Math.round(weightSuggestion.newWeight * 10) / 10}kg
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GymWorkoutSession
