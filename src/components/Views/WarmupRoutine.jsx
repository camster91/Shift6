import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, Play, Pause, SkipForward, Flame, CheckCircle2, RotateCcw } from 'lucide-react'
import { WARMUP_EXERCISES, WARMUP_ROUTINES } from '../../data/warmupRoutines'
import { playBeep, playSuccess } from '../../utils/audio'
import { vibrate } from '../../utils/device'

/**
 * WarmupRoutine - Pre-workout warm-up flow component
 * Shows dynamic stretches and mobility exercises before main workout
 */
const WarmupRoutine = ({
  onComplete,
  onSkip,
  recommendedRoutine = 'quick',
  audioEnabled = true
}) => {
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [completedExercises, setCompletedExercises] = useState([])

  // Get current routine and exercise - memoized
  const routine = selectedRoutine ? WARMUP_ROUTINES[selectedRoutine] : null
  const exerciseIds = useMemo(() => routine?.exercises || [], [routine])
  const currentExerciseId = exerciseIds[currentExerciseIndex]
  const currentExercise = currentExerciseId ? WARMUP_EXERCISES[currentExerciseId] : null
  const totalExercises = exerciseIds.length

  // Use ref for exercise completion to avoid circular dependency
  const exerciseCompleteRef = useRef(null)

  // Timer effect
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Call via ref to avoid stale closure
          exerciseCompleteRef.current?.()
          return 0
        }
        // Play beep in last 3 seconds
        if (prev <= 4 && audioEnabled) {
          playBeep()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, timeLeft, audioEnabled])

  // Start exercise timer
  const startExercise = useCallback(() => {
    if (!currentExercise) return

    // For rep-based exercises, estimate 3 seconds per rep
    const duration = currentExercise.unit === 'reps'
      ? currentExercise.duration * 3
      : currentExercise.duration

    setTimeLeft(duration)
    setIsRunning(true)
  }, [currentExercise])

  // Handle exercise completion
  const handleExerciseComplete = useCallback(() => {
    setIsRunning(false)
    setCompletedExercises(prev => [...prev, currentExerciseId])

    if (audioEnabled) {
      playSuccess()
    }
    vibrate([50, 50, 50])

    // Move to next exercise or complete routine
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
      // Auto-start next exercise after brief pause
      setTimeout(() => {
        const nextExercise = WARMUP_EXERCISES[exerciseIds[currentExerciseIndex + 1]]
        if (nextExercise) {
          const duration = nextExercise.unit === 'reps'
            ? nextExercise.duration * 3
            : nextExercise.duration
          setTimeLeft(duration)
          setIsRunning(true)
        }
      }, 1500)
    } else {
      setIsComplete(true)
      if (audioEnabled) {
        playSuccess()
      }
      vibrate([100, 100, 100, 100, 100])
    }
  }, [currentExerciseIndex, totalExercises, exerciseIds, currentExerciseId, audioEnabled])

  // Update ref when handler changes
  useEffect(() => {
    exerciseCompleteRef.current = handleExerciseComplete
  }, [handleExerciseComplete])

  // Skip current exercise
  const skipExercise = () => {
    setIsRunning(false)
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
      const nextExercise = WARMUP_EXERCISES[exerciseIds[currentExerciseIndex + 1]]
      if (nextExercise) {
        const duration = nextExercise.unit === 'reps'
          ? nextExercise.duration * 3
          : nextExercise.duration
        setTimeLeft(duration)
      }
    } else {
      setIsComplete(true)
    }
  }

  // Toggle pause
  const togglePause = () => {
    setIsRunning(prev => !prev)
  }

  // Reset routine
  const resetRoutine = () => {
    setCurrentExerciseIndex(0)
    setTimeLeft(0)
    setIsRunning(false)
    setIsComplete(false)
    setCompletedExercises([])
    setSelectedRoutine(null)
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  // Progress percentage
  const progress = totalExercises > 0
    ? ((currentExerciseIndex + (timeLeft === 0 && !isComplete ? 1 : 0)) / totalExercises) * 100
    : 0

  // Routine selection view - simplified to 2 options
  if (!selectedRoutine) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden border border-slate-800">
          {/* Header */}
          <div className="p-5 text-center border-b border-slate-800">
            <div className="w-14 h-14 mx-auto mb-3 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Flame className="w-7 h-7 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Warm Up First?</h2>
            <p className="text-sm text-slate-400 mt-1">Prep your muscles and joints</p>
          </div>

          {/* Options - 2 side by side buttons */}
          <div className="p-4 flex gap-3">
            {Object.values(WARMUP_ROUTINES).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoutine(r.id)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${
                  r.id === recommendedRoutine
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="text-2xl font-bold text-white">{r.duration}</p>
                <p className="text-xs text-slate-400">min</p>
                <p className="text-sm font-medium text-white mt-2">{r.name}</p>
              </button>
            ))}
          </div>

          {/* Skip button */}
          <div className="p-4 pt-0">
            <button
              onClick={onSkip}
              className="w-full py-3 text-slate-500 hover:text-white transition-colors text-sm"
            >
              Skip and start workout
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Completion view
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="fixed inset-0 bg-slate-950 md:inset-4 md:rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Warmed Up!</h2>
              <p className="text-slate-400">
                Great job! Your body is ready for the workout.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              Completed {completedExercises.length} of {totalExercises} exercises
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetRoutine}
                className="flex-1 py-3 px-4 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Repeat
              </button>
              <button
                onClick={onComplete}
                className="flex-1 py-3 px-4 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-400 transition-colors"
              >
                Start Workout
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active warm-up view
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed inset-0 bg-slate-950 md:inset-4 md:rounded-2xl overflow-hidden flex flex-col">
        {/* Header with progress */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{routine.name}</h2>
                <p className="text-xs text-slate-500">
                  Exercise {currentExerciseIndex + 1} of {totalExercises}
                </p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main content - Current exercise */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {currentExercise && (
            <>
              {/* Timer display */}
              <div className="relative mb-8">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="rgba(30,41,59,0.5)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#warmupGradient)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={553}
                    strokeDashoffset={553 - (553 * (timeLeft / (currentExercise.unit === 'reps' ? currentExercise.duration * 3 : currentExercise.duration)))}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="warmupGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-white">{formatTime(timeLeft)}</span>
                  <span className="text-sm text-slate-400 mt-1">
                    {currentExercise.unit === 'reps' ? `${currentExercise.duration} reps` : 'remaining'}
                  </span>
                </div>
              </div>

              {/* Exercise name and instructions */}
              <div className="text-center mb-8 max-w-md">
                <h3 className="text-2xl font-bold text-white mb-3">{currentExercise.name}</h3>
                <p className="text-slate-400">{currentExercise.instructions}</p>
                {currentExercise.tips && currentExercise.tips.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {currentExercise.tips.map((tip, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {!isRunning && timeLeft === 0 ? (
                  <button
                    onClick={startExercise}
                    className="w-16 h-16 bg-orange-500 hover:bg-orange-400 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-orange-500/30"
                  >
                    <Play size={28} className="text-white ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={togglePause}
                    className="w-16 h-16 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    {isRunning ? (
                      <Pause size={28} className="text-white" />
                    ) : (
                      <Play size={28} className="text-white ml-1" />
                    )}
                  </button>
                )}
                <button
                  onClick={skipExercise}
                  className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors"
                >
                  <SkipForward size={20} className="text-slate-400" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Upcoming exercises */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">Coming up:</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {exerciseIds.slice(currentExerciseIndex + 1, currentExerciseIndex + 4).map((id) => {
              const ex = WARMUP_EXERCISES[id]
              return (
                <div
                  key={id}
                  className="flex-shrink-0 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <p className="text-sm text-white font-medium">{ex?.name}</p>
                  <p className="text-xs text-slate-500">
                    {ex?.duration} {ex?.unit}
                  </p>
                </div>
              )
            })}
            {currentExerciseIndex + 1 >= totalExercises && (
              <div className="flex-shrink-0 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm text-emerald-400 font-medium">Ready!</p>
                <p className="text-xs text-emerald-500/70">Start workout</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WarmupRoutine
