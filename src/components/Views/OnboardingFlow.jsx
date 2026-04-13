import { useState, useMemo } from 'react'
import { ChevronRight, Home, ChevronLeft, Zap, Trophy, Target, Clock, Dumbbell, Flame, Users, Heart, ChevronDown, ChevronUp, Info, Check, ArrowLeftRight, TrendingUp, Calendar } from 'lucide-react'
import { FITNESS_LEVEL_PRESETS, EXERCISE_PLANS } from '../../data/exercises.jsx'
import { DIFFICULTY_LABELS, getProgramsByDifficulty } from '../../data/exerciseLibrary.js'
import { GYM_DIFFICULTY_LABELS, getGymProgramsByDifficulty } from '../../data/gymExercises'

// Shared step indicator with mode-aware color
const StepIndicator = ({ currentStep, totalSteps, mode }) => {
  const activeColor = mode === 'gym' ? 'bg-purple-500' : 'bg-cyan-500'
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div
          key={idx}
          className={`w-2 h-2 rounded-full transition-all ${
            idx <= currentStep ? activeColor : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  )
}

// Experience levels — shared for both modes
const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    homeDesc: 'New to fitness or returning after a break',
    gymDesc: 'New to weight training or less than 6 months experience',
    homeDetails: 'Start with foundational movements and build your base',
    gymDetails: 'Master form with foundational movements',
    icon: Zap,
    ringClass: 'ring-emerald-500',
    bgClass: 'bg-emerald-500/10',
    iconBgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    homeDesc: 'Consistent training for 3+ months',
    gymDesc: '6 months to 2 years of consistent training',
    homeDetails: 'Ready for more volume and harder progressions',
    gymDetails: 'Increase volume and introduce advanced splits',
    icon: Target,
    ringClass: mode => mode === 'gym' ? 'ring-blue-500' : 'ring-cyan-500',
    bgClass: mode => mode === 'gym' ? 'bg-blue-500/10' : 'bg-cyan-500/10',
    iconBgClass: mode => mode === 'gym' ? 'bg-blue-500/20' : 'bg-cyan-500/20',
    textClass: mode => mode === 'gym' ? 'text-blue-400' : 'text-cyan-400',
  },
  {
    id: 'advanced',
    name: 'Advanced',
    homeDesc: 'Training consistently for 1+ years',
    gymDesc: '2+ years of structured weight training',
    homeDetails: 'High intensity and advanced skill work',
    gymDetails: 'High intensity, specialized programming',
    icon: Trophy,
    ringClass: 'ring-purple-500',
    bgClass: 'bg-purple-500/10',
    iconBgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
  }
]

// Goal icons for both modes
const GOAL_ICONS = {
  strength: Flame,
  endurance: Heart,
  hypertrophy: Target,
  balanced: Users,
  core: Target,
  power: Zap,
  athleticism: TrendingUp,
}

// Mode-specific accent colors
const MODE_ACCENT = {
  home: {
    gradient: 'from-cyan-600 to-teal-600',
    gradientHover: 'from-cyan-500 to-teal-500',
    shadow: 'shadow-cyan-500/20',
    ring: 'ring-cyan-500',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    iconBg: 'bg-cyan-500/20',
  },
  gym: {
    gradient: 'from-purple-500 to-pink-500',
    gradientHover: 'from-purple-400 to-pink-400',
    shadow: 'shadow-purple-500/20',
    ring: 'ring-purple-500',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    iconBg: 'bg-purple-500/20',
  },
}

const getLevelClasses = (level, mode) => {
  const dynamic = ['ringClass', 'bgClass', 'iconBgClass', 'textClass']
  const result = {}
  for (const key of dynamic) {
    const val = level[key]
    result[key] = typeof val === 'function' ? val(mode) : val
  }
  return result
}

/**
 * OnboardingFlow — Unified onboarding for both Home and Gym modes.
 * Step 0: Mode Selection
 * Step 1: Experience Level
 * Step 2: Program Selection
 */
const OnboardingFlow = ({ onCompleteHome, onCompleteGym }) => {
  const [step, setStep] = useState(0)
  const [selectedMode, setSelectedMode] = useState(null)
  const [experienceLevel, setExperienceLevel] = useState(null)
  const [expandedProgram, setExpandedProgram] = useState(null)

  const accent = selectedMode ? MODE_ACCENT[selectedMode] : MODE_ACCENT.home

  // Get programs for each level based on mode
  const programsByLevel = useMemo(() => {
    const getPrograms = selectedMode === 'gym' ? getGymProgramsByDifficulty : getProgramsByDifficulty
    return {
      beginner: getPrograms('beginner'),
      intermediate: getPrograms('intermediate'),
      advanced: getPrograms('advanced'),
    }
  }, [selectedMode])

  const difficultyLabels = selectedMode === 'gym' ? GYM_DIFFICULTY_LABELS : DIFFICULTY_LABELS

  const handleSelectMode = (mode) => {
    setSelectedMode(mode)
    setStep(1)
  }

  const handleSelectExperience = (level) => {
    setExperienceLevel(level)
    setStep(2)
  }

  const handleSelectProgram = (program) => {
    if (selectedMode === 'gym') {
      onCompleteGym({
        experienceLevel,
        programId: program.id,
        currentWeek: 1,
        currentDay: 1,
        startDate: new Date().toISOString(),
      })
    } else {
      const fitnessPreset = FITNESS_LEVEL_PRESETS[experienceLevel] || FITNESS_LEVEL_PRESETS.beginner
      const trainingPreferences = {
        fitnessLevel: experienceLevel,
        trainingDaysPerWeek: program.daysPerWeek,
        repScheme: fitnessPreset.defaultRepScheme || 'balanced',
        targetSessionDuration: program.sessionDuration,
        maxExercisesPerDay: program.maxExercisesPerDay || 0,
        setsPerExercise: program.sets || 3,
        restBetweenSets: program.restSeconds || 60,
      }
      onCompleteHome('bodyweight', ['none'], program.id, trainingPreferences, program.exercises)
    }
  }

  // ──── Step 0: Mode Selection ────
  if (step === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
          {/* Logo */}
          <div className="mb-4 animate-bounce">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 text-center animate-fadeIn">
            Welcome to Shift6
          </h1>
          <p className="text-slate-400 mb-8 text-center animate-fadeIn">
            Your personal fitness journey starts here
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-sm animate-fadeIn">
            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Earn Badges</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Build Streaks</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
              <Target className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Track Goals</p>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-6 text-center">
            Choose your training style
          </p>

          <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
            {/* Home Mode */}
            <button
              onClick={() => handleSelectMode('home')}
              className="bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl p-6 text-left hover:from-cyan-500 hover:to-teal-500 transition-all group hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                  <Home className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">Home</h3>
                  <p className="text-cyan-100 text-sm">
                    Bodyweight training, no equipment
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Gym Mode */}
            <button
              onClick={() => handleSelectMode('gym')}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-left hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">Gym</h3>
                  <p className="text-slate-400 text-sm">
                    Weights, machines & equipment
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-6 text-center">
            You can switch between Home and Gym anytime in settings
          </p>
        </div>
      </div>
    )
  }

  // ──── Step 1: Experience Level ────
  if (step === 1) {
    const modeLabel = selectedMode === 'gym' ? 'Gym' : 'Home'

    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={0} totalSteps={2} mode={selectedMode} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            What&apos;s your experience level?
          </h2>
          <p className="text-slate-400 mb-8 text-center">
            We&apos;ll recommend the perfect program for you
          </p>

          <div className="space-y-4 flex-1">
            {EXPERIENCE_LEVELS.map((level) => {
              const Icon = level.icon
              const programs = programsByLevel[level.id] || []
              const recommended = programs[0]
              const desc = selectedMode === 'gym' ? level.gymDesc : level.homeDesc
              const classes = getLevelClasses(level, selectedMode)

              return (
                <button
                  key={level.id}
                  onClick={() => handleSelectExperience(level.id)}
                  className={`w-full bg-slate-900 rounded-xl p-5 text-left transition-all hover:ring-2 ${classes.ringClass} ${classes.bgClass.replace('/10', '/5')}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${classes.iconBgClass}`}>
                      <Icon className={`w-7 h-7 ${classes.textClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg">{level.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                          {programs.length} programs
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{desc}</p>
                      {recommended && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={`${classes.textClass} flex-shrink-0`}>Recommended:</span>
                          <span className="text-slate-300 truncate max-w-[120px]">{recommended.name}</span>
                          <span className="text-slate-500 hidden sm:inline">•</span>
                          <span className="text-slate-400 flex-shrink-0">{recommended.daysPerWeek}x/week</span>
                          {selectedMode === 'home' && recommended.sessionDuration && (
                            <>
                              <span className="text-slate-500 hidden sm:inline">•</span>
                              <span className="text-slate-400 flex-shrink-0">{recommended.sessionDuration}min</span>
                            </>
                          )}
                          {selectedMode === 'gym' && recommended.estimatedDuration && (
                            <>
                              <span className="text-slate-500 hidden sm:inline">•</span>
                              <span className="text-slate-400 flex-shrink-0">~{recommended.estimatedDuration}min</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 ${classes.textClass} flex-shrink-0`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ──── Step 2: Program Selection ────
  if (step === 2 && selectedMode && experienceLevel) {
    const programs = programsByLevel[experienceLevel] || []
    const levelInfo = EXPERIENCE_LEVELS.find(l => l.id === experienceLevel)
    const classes = getLevelClasses(levelInfo, selectedMode)
    const difficultyLabel = difficultyLabels[experienceLevel] || difficultyLabels.beginner

    const getExerciseDetails = (exerciseKeys) => {
      return exerciseKeys.map(key => {
        const exercise = EXERCISE_PLANS[key]
        return exercise ? { key, name: exercise.name, color: exercise.color } : null
      }).filter(Boolean)
    }

    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={1} totalSteps={2} mode={selectedMode} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto pb-24">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <span className="text-2xl">{difficultyLabel.icon}</span>
            <h2 className="text-2xl font-bold text-white">
              {levelInfo?.name} Programs
            </h2>
          </div>
          <p className="text-slate-400 mb-2 text-center">
            Choose a program that fits your schedule
          </p>
          <p className="text-xs text-slate-500 mb-6 text-center flex items-center justify-center gap-1">
            <ArrowLeftRight className="w-3 h-3" />
            You can switch programs anytime and keep your progress
          </p>

          <div className="space-y-3">
            {programs.map((program, index) => {
              const GoalIcon = GOAL_ICONS[program.goal] || Target
              const isRecommended = index === 0

              return (
                <div
                  key={program.id}
                  className={`bg-slate-900 rounded-xl overflow-hidden transition-all ${
                    isRecommended
                      ? `ring-2 ${classes.ringClass} ${classes.bgClass}`
                      : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isRecommended ? classes.iconBgClass : 'bg-slate-800'
                      }`}>
                        <GoalIcon className={`w-5 h-5 ${
                          isRecommended ? classes.textClass : 'text-slate-400'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{program.name}</h3>
                          {isRecommended && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${classes.bgClass} ${classes.textClass}`}>
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{program.desc}</p>

                        <div className="flex flex-wrap items-center gap-2">
                          {selectedMode === 'home' && (
                            <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                              {program.exercises?.length || 0} exercises
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                            {program.daysPerWeek}x/week
                          </span>
                          <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedMode === 'gym'
                              ? `~${program.estimatedDuration || 45}min`
                              : `${program.sessionDuration}min`
                            }
                          </span>
                          {selectedMode === 'gym' && program.difficulty && (
                            <span className="text-xs text-slate-400 capitalize">
                              {program.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      {selectedMode === 'home' && (
                        <button
                          onClick={() => setExpandedProgram(expandedProgram === program.id ? null : program.id)}
                          className="flex items-center gap-1 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                        >
                          <Info className="w-3 h-3" />
                          {expandedProgram === program.id ? 'Hide' : 'View'} Details
                          {expandedProgram === program.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleSelectProgram(program)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isRecommended
                            ? `bg-gradient-to-r ${accent.gradient} text-white hover:${accent.gradientHover}`
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        Select Program
                      </button>
                    </div>

                    {/* Expanded details — home mode only */}
                    {selectedMode === 'home' && expandedProgram === program.id && (
                      <div className="px-0 pt-4 border-t border-slate-800 mt-4 animate-fadeIn">
                        {program.longDesc && (
                          <p className="text-sm text-slate-400 mb-4">{program.longDesc}</p>
                        )}

                        <div className="mb-4">
                          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Exercises Included</h4>
                          <div className="flex flex-wrap gap-2">
                            {getExerciseDetails(program.exercises || []).map((exercise, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded-lg bg-${exercise.color}-500/20 text-${exercise.color}-400 border border-${exercise.color}-500/30`}
                              >
                                {exercise.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <span className="text-slate-500">Sets per exercise</span>
                            <p className="text-slate-300 font-medium">{program.sets || 3} sets</p>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <span className="text-slate-500">Rest between sets</span>
                            <p className="text-slate-300 font-medium">{program.restSeconds || 60}s</p>
                          </div>
                          {program.repRange && (
                            <div className="bg-slate-800/50 rounded-lg p-2">
                              <span className="text-slate-500">Rep range</span>
                              <p className="text-slate-300 font-medium">{program.repRange[0]}-{program.repRange[1]} reps</p>
                            </div>
                          )}
                          {program.progressionRate && (
                            <div className="bg-slate-800/50 rounded-lg p-2">
                              <span className="text-slate-500">Progression</span>
                              <p className="text-slate-300 font-medium capitalize">{program.progressionRate}</p>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                          <ArrowLeftRight className="w-3 h-3" />
                          You can swap exercises you don&apos;t like after starting
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Other difficulty levels */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-sm text-slate-500 text-center mb-3">
              Want to try a different difficulty?
            </p>
            <div className="flex justify-center gap-2">
              {EXPERIENCE_LEVELS.filter(l => l.id !== experienceLevel).map((level) => {
                const levelClasses = getLevelClasses(level, selectedMode)
                return (
                  <button
                    key={level.id}
                    onClick={() => {
                      setExperienceLevel(level.id)
                      setExpandedProgram(null)
                    }}
                    className={`px-3 py-2 rounded-lg text-sm ${levelClasses.bgClass} ${levelClasses.textClass} transition-colors hover:opacity-80`}
                  >
                    {level.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default OnboardingFlow