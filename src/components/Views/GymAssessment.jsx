import { useState, useEffect, useCallback } from 'react'
import {
  X,
  ChevronUp,
  ChevronDown,
  Check,
  Target,
  TrendingUp,
  Dumbbell,
  RefreshCw,
  Info
} from 'lucide-react'
import { GYM_EXERCISES } from '../../data/gymExercises'
import { vibrate } from '../../utils/device'
import { playSuccess } from '../../utils/audio'
import { KG_TO_LBS, LBS_TO_KG } from '../../utils/constants'
import {
  createExerciseGoal,
  calculateRealisticGoal
} from '../../utils/gymProgression'

/**
 * Convert weight between kg and lbs
 */
const convertWeight = (weight, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return weight
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round(weight * KG_TO_LBS * 2) / 2
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round(weight * LBS_TO_KG * 2) / 2
  }
  return weight
}

/**
 * GymAssessment - Initial assessment flow to find starting point
 * Guides user through testing each exercise to set baseline
 */
const GymAssessment = ({
  exercises, // Array of exercise IDs to assess
  gymWeights = {}, // Existing weights if any
  gymWeightUnit = 'kg',
  fitnessLevel = 'beginner',
  onComplete, // (assessmentResults, goals) => void
  onSkip, // Skip assessment
  onExit,
  audioEnabled = true,
  theme = 'dark'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [assessmentResults, setAssessmentResults] = useState({})
  const [phase, setPhase] = useState('intro') // 'intro' | 'warmup' | 'test' | 'result' | 'complete'

  // Current exercise state
  const [currentWeight, setCurrentWeight] = useState(20) // in kg
  const [currentReps, setCurrentReps] = useState(8)
  const [showTips, setShowTips] = useState(false)

  const currentExerciseId = exercises?.[currentIndex]
  const currentExercise = currentExerciseId ? GYM_EXERCISES[currentExerciseId] : null
  const totalExercises = exercises?.length || 0

  // Theme classes
  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'
  const buttonBg = theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'

  // Initialize weight when exercise changes
  useEffect(() => {
    if (currentExercise && currentExerciseId) {
      const existingWeight = gymWeights[currentExerciseId]
      const defaultWeight = currentExercise.defaultWeight || 20
      const weightKg = existingWeight || defaultWeight
      setCurrentWeight(weightKg)
      setCurrentReps(currentExercise.defaultReps?.[0] || 8)
    }
  }, [currentExerciseId, currentExercise, gymWeights])

  // Adjust weight
  const adjustWeight = (delta) => {
    vibrate(10)
    const increment = gymWeightUnit === 'lbs' ? 5 * LBS_TO_KG : 2.5
    setCurrentWeight(prev => Math.max(0, prev + (delta * increment)))
  }

  // Adjust reps
  const adjustReps = (delta) => {
    vibrate(10)
    setCurrentReps(prev => Math.max(1, Math.min(30, prev + delta)))
  }

  // Toggle weight unit
  const toggleUnit = () => {
    vibrate(20)
  }

  // Record assessment result
  const recordResult = useCallback(() => {
    if (!currentExerciseId) return

    vibrate(50)
    if (audioEnabled) playSuccess()

    const result = {
      exerciseId: currentExerciseId,
      weight: currentWeight, // Always in kg
      reps: currentReps,
      date: new Date().toISOString()
    }

    setAssessmentResults(prev => ({
      ...prev,
      [currentExerciseId]: result
    }))

    setPhase('result')
  }, [currentExerciseId, currentWeight, currentReps, audioEnabled])

  // Move to next exercise or complete
  const nextExercise = useCallback(() => {
    if (currentIndex < totalExercises - 1) {
      setCurrentIndex(prev => prev + 1)
      setPhase('intro')
    } else {
      setPhase('complete')
    }
  }, [currentIndex, totalExercises])

  // Complete assessment and create goals
  const completeAssessment = useCallback(() => {
    const goals = {}

    Object.entries(assessmentResults).forEach(([exerciseId, result]) => {
      goals[exerciseId] = createExerciseGoal(
        exerciseId,
        result.weight,
        result.reps,
        null,
        null,
        fitnessLevel
      )
    })

    if (audioEnabled) playSuccess()
    vibrate([100, 50, 100, 50, 200])

    onComplete(assessmentResults, goals)
  }, [assessmentResults, fitnessLevel, audioEnabled, onComplete])

  // Display weight
  const displayWeight = convertWeight(currentWeight, 'kg', gymWeightUnit)
  const weightIncrement = gymWeightUnit === 'lbs' ? 5 : 2.5

  // Intro screen for each exercise
  if (phase === 'intro') {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <button onClick={onExit} className="p-2">
            <X className={`w-6 h-6 ${textSecondary}`} />
          </button>
          <span className={textSecondary}>
            {currentIndex + 1} of {totalExercises}
          </span>
          <button
            onClick={onSkip}
            className={`text-sm ${textSecondary} hover:text-purple-400`}
          >
            Skip All
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10 text-purple-400" />
          </div>

          <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            {currentExercise?.name}
          </h1>

          <p className={`${textSecondary} mb-8 max-w-sm`}>
            Let&apos;s find your starting point. You&apos;ll do a test set to determine your current working weight.
          </p>

          <div className={`${cardBg} rounded-xl p-4 w-full max-w-sm mb-6 border ${borderColor}`}>
            <h3 className={`font-medium ${textPrimary} mb-2`}>What to do:</h3>
            <ol className={`text-sm ${textSecondary} space-y-2 text-left`}>
              <li>1. Start with a weight you can comfortably lift</li>
              <li>2. Do as many good reps as possible (aim for 6-12)</li>
              <li>3. Stop when form breaks down or at RPE 8-9</li>
              <li>4. Record your weight and reps</li>
            </ol>
          </div>

          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={() => {
                const result = assessmentResults[currentExerciseId]
                if (result) {
                  // Already assessed, just skip
                  nextExercise()
                } else {
                  // Skip this exercise
                  setAssessmentResults(prev => ({
                    ...prev,
                    [currentExerciseId]: {
                      exerciseId: currentExerciseId,
                      weight: currentWeight,
                      reps: currentReps,
                      skipped: true,
                      date: new Date().toISOString()
                    }
                  }))
                  nextExercise()
                }
              }}
              className={`flex-1 py-3 border ${borderColor} ${textSecondary} rounded-xl font-medium ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}
            >
              Skip
            </button>
            <button
              onClick={() => setPhase('test')}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium"
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Test phase - record weight and reps
  if (phase === 'test') {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <button onClick={() => setPhase('intro')} className="p-2">
            <X className={`w-6 h-6 ${textSecondary}`} />
          </button>
          <div className="text-center">
            <p className={`${textPrimary} font-semibold`}>{currentExercise?.name}</p>
            <p className={`${textSecondary} text-sm`}>Assessment Set</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Exercise info */}
        <div className={`p-4 border-b ${borderColor}`}>
          <p className={`${textSecondary} text-sm`}>{currentExercise?.cue}</p>

          {/* Tips toggle */}
          <button
            onClick={() => setShowTips(!showTips)}
            className={`flex items-center gap-2 mt-2 text-sm ${textSecondary} hover:text-purple-400`}
          >
            <Info size={14} />
            {showTips ? 'Hide tips' : 'Show tips'}
          </button>

          {showTips && currentExercise?.tips && (
            <div className={`mt-2 p-3 rounded-lg ${buttonBg}`}>
              <ul className={`text-xs ${textSecondary} space-y-1`}>
                {currentExercise.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Weight input */}
        <div className="flex-1 p-6 flex flex-col gap-6">
          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`${textSecondary} text-sm`}>Weight Used</p>
              <button
                onClick={toggleUnit}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${buttonBg} text-xs font-medium ${textSecondary}`}
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
              ±{weightIncrement}{gymWeightUnit} per tap
            </p>
          </div>

          {/* Reps input */}
          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <p className={`${textSecondary} text-sm mb-2`}>Reps Completed</p>
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
            <p className={`${textSecondary} text-xs text-center mt-2`}>
              Good reps with proper form
            </p>
          </div>
        </div>

        {/* Record button */}
        <div className="p-6">
          <button
            onClick={recordResult}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Record Assessment
          </button>
        </div>
      </div>
    )
  }

  // Result phase - show calculated goal
  if (phase === 'result') {
    const result = assessmentResults[currentExerciseId]
    const suggestedGoal = calculateRealisticGoal(
      currentExerciseId,
      result.weight,
      result.reps,
      fitnessLevel
    )

    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <div className="w-10" />
          <span className={textSecondary}>Assessment Complete</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>

          <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            {currentExercise?.name}
          </h1>

          <p className={`${textSecondary} mb-6`}>Your starting point</p>

          {/* Current stats */}
          <div className={`${cardBg} rounded-xl p-4 w-full max-w-sm mb-4 border ${borderColor}`}>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">
                  {convertWeight(result.weight, 'kg', gymWeightUnit)}{gymWeightUnit}
                </p>
                <p className={`text-xs ${textSecondary}`}>Current Weight</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">{result.reps}</p>
                <p className={`text-xs ${textSecondary}`}>Reps</p>
              </div>
            </div>
          </div>

          {/* 6-week goal */}
          <div className={`${cardBg} rounded-xl p-4 w-full max-w-sm border border-purple-500/30 bg-purple-500/5`}>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-purple-400" />
              <p className={`font-medium ${textPrimary}`}>6-Week Goal</p>
            </div>

            <div className="flex justify-around mb-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {convertWeight(suggestedGoal.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit}
                </p>
                <p className={`text-xs ${textSecondary}`}>Target Weight</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{suggestedGoal.targetReps}</p>
                <p className={`text-xs ${textSecondary}`}>Target Reps</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className={textSecondary}>
                +{convertWeight(suggestedGoal.totalIncrease, 'kg', gymWeightUnit)}{gymWeightUnit} in 6 weeks
              </span>
            </div>

            {suggestedGoal.weeklyIncrease > 0 && (
              <p className={`text-xs ${textSecondary} text-center mt-2`}>
                ~{convertWeight(suggestedGoal.weeklyIncrease, 'kg', gymWeightUnit)}{gymWeightUnit}/week progression
              </p>
            )}
          </div>
        </div>

        {/* Next button */}
        <div className="p-6">
          <button
            onClick={nextExercise}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg"
          >
            {currentIndex < totalExercises - 1 ? 'Next Exercise' : 'View Summary'}
          </button>
        </div>
      </div>
    )
  }

  // Complete phase - summary of all assessments
  if (phase === 'complete') {
    const assessedCount = Object.values(assessmentResults).filter(r => !r.skipped).length
    const skippedCount = Object.values(assessmentResults).filter(r => r.skipped).length

    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <div className="w-10" />
          <span className={textPrimary}>Assessment Summary</span>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>You&apos;re All Set!</h1>
            <p className={textSecondary}>
              {assessedCount} exercise{assessedCount !== 1 ? 's' : ''} assessed
              {skippedCount > 0 && `, ${skippedCount} skipped`}
            </p>
          </div>

          {/* Results list */}
          <div className="space-y-3 mb-6">
            {exercises.map(exerciseId => {
              const result = assessmentResults[exerciseId]
              const exercise = GYM_EXERCISES[exerciseId]
              if (!exercise) return null

              const suggestedGoal = result && !result.skipped
                ? calculateRealisticGoal(exerciseId, result.weight, result.reps, fitnessLevel)
                : null

              return (
                <div
                  key={exerciseId}
                  className={`${cardBg} rounded-xl p-4 border ${borderColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium ${textPrimary}`}>{exercise.shortName || exercise.name}</h3>
                    {result?.skipped && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${buttonBg} ${textSecondary}`}>
                        Skipped
                      </span>
                    )}
                  </div>

                  {suggestedGoal && (
                    <div className="flex items-center justify-between text-sm">
                      <div className={textSecondary}>
                        <span>Now: </span>
                        <span className="text-purple-400 font-medium">
                          {convertWeight(result.weight, 'kg', gymWeightUnit)}{gymWeightUnit} × {result.reps}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">
                          {convertWeight(suggestedGoal.targetWeight, 'kg', gymWeightUnit)}{gymWeightUnit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className={`text-sm ${textSecondary} text-center`}>
            Your weekly targets will automatically adjust based on your performance.
          </p>
        </div>

        {/* Complete button */}
        <div className="p-6">
          <button
            onClick={completeAssessment}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg"
          >
            Start Training
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default GymAssessment
