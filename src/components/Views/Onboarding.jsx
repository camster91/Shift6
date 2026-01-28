import { useState } from 'react'
import { ChevronRight, Home, ChevronLeft, Zap, Trophy, Target, Clock, Dumbbell } from 'lucide-react'
import { FITNESS_LEVEL_PRESETS } from '../../data/exercises.jsx'

// Minimal step indicator - just dots
const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 py-2">
    {Array.from({ length: totalSteps }).map((_, idx) => (
      <div
        key={idx}
        className={`w-2 h-2 rounded-full transition-all ${
          idx <= currentStep ? 'bg-cyan-500' : 'bg-slate-700'
        }`}
      />
    ))}
  </div>
)

// Experience levels matching gym mode structure
const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    desc: 'New to bodyweight training or returning after a break',
    icon: Zap,
    ringClass: 'ring-emerald-500',
    bgClass: 'bg-emerald-500/10',
    iconBgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400'
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    desc: 'Can do 10+ push-ups and have been training regularly',
    icon: Target,
    ringClass: 'ring-cyan-500',
    bgClass: 'bg-cyan-500/10',
    iconBgClass: 'bg-cyan-500/20',
    textClass: 'text-cyan-400'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    desc: 'Strong foundation in calisthenics and bodyweight skills',
    icon: Trophy,
    ringClass: 'ring-purple-500',
    bgClass: 'bg-purple-500/10',
    iconBgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400'
  }
]

// Program recommendations based on experience - Daily Quick is default for beginners
const PROGRAM_RECOMMENDATIONS = {
  beginner: ['daily-quick', 'minimal-start'],
  intermediate: ['daily-quick', 'shift6-classic'],
  advanced: ['shift6-classic', 'full-body']
}

// Home mode programs with descriptions - Daily Quick is the recommended default
const HOME_PROGRAMS = {
  'daily-quick': {
    id: 'daily-quick',
    name: 'Daily Quick',
    desc: 'Recommended: 2 exercises per day, gentle progression',
    exercises: ['pushups', 'squats', 'plank', 'gluteBridges', 'lunges', 'supermans'],
    daysPerWeek: 5,
    duration: 15,
    difficulty: 'All levels',
    maxExercisesPerDay: 2,
    isRecommended: true
  },
  'shift6-classic': {
    id: 'shift6-classic',
    name: 'Shift6 Classic',
    desc: 'The original 9-exercise full body program',
    exercises: ['pushups', 'squats', 'pullups', 'dips', 'vups', 'gluteBridges', 'plank', 'lunges', 'supermans'],
    daysPerWeek: 3,
    duration: 30,
    difficulty: 'Intermediate'
  },
  'minimal-start': {
    id: 'minimal-start',
    name: 'Minimal Start',
    desc: 'Just 3 exercises to build the habit',
    exercises: ['pushups', 'squats', 'plank'],
    daysPerWeek: 3,
    duration: 10,
    difficulty: 'Beginner'
  },
  'full-body': {
    id: 'full-body',
    name: 'Full Body',
    desc: 'All 9 exercises, 5 days per week',
    exercises: ['pushups', 'squats', 'pullups', 'dips', 'vups', 'gluteBridges', 'plank', 'lunges', 'supermans'],
    daysPerWeek: 5,
    duration: 35,
    difficulty: 'Advanced'
  }
}

/**
 * Onboarding - Simplified setup
 * Step 0: Mode Selection (Home vs Gym) - one click
 * Step 1: Experience Level - one click, auto-advances
 * Step 2: Program Selection - one click to complete
 */
const Onboarding = ({ onComplete, onSelectGym }) => {
  const [step, setStep] = useState(0)
  const [experienceLevel, setExperienceLevel] = useState(null)

  // Handle mode selection - clicking Home continues, clicking Gym exits to gym onboarding
  const handleSelectMode = (mode) => {
    if (mode === 'gym') {
      // Exit to gym onboarding if handler provided
      if (onSelectGym) {
        onSelectGym()
      }
      return
    }
    // Home mode - continue to experience selection
    setStep(1)
  }

  // Handle experience selection - auto-advance with recommended program
  const handleSelectExperience = (level) => {
    setExperienceLevel(level)

    // Auto-select recommended program and complete
    const recommended = PROGRAM_RECOMMENDATIONS[level]?.[0] || 'daily-quick'
    const program = HOME_PROGRAMS[recommended] || HOME_PROGRAMS['daily-quick']
    const fitnessPreset = FITNESS_LEVEL_PRESETS[level] || FITNESS_LEVEL_PRESETS.beginner

    const trainingPreferences = {
      fitnessLevel: level,
      trainingDaysPerWeek: program.daysPerWeek,
      repScheme: fitnessPreset.defaultRepScheme || 'balanced',
      targetSessionDuration: program.duration,
      maxExercisesPerDay: program.maxExercisesPerDay || 0
    }

    // Complete onboarding with recommended program
    onComplete('bodyweight', ['none'], null, trainingPreferences, program.exercises)
  }

  // Handle program selection (if user wants to change from recommended)
  const handleSelectProgram = (programId) => {
    const program = HOME_PROGRAMS[programId] || HOME_PROGRAMS['daily-quick']
    const fitnessPreset = FITNESS_LEVEL_PRESETS[experienceLevel] || FITNESS_LEVEL_PRESETS.beginner

    const trainingPreferences = {
      fitnessLevel: experienceLevel,
      trainingDaysPerWeek: program.daysPerWeek,
      repScheme: fitnessPreset.defaultRepScheme || 'balanced',
      targetSessionDuration: program.duration,
      maxExercisesPerDay: program.maxExercisesPerDay || 0
    }

    onComplete('bodyweight', ['none'], null, trainingPreferences, program.exercises)
  }

  // Step 0: Mode Selection (Home vs Gym)
  if (step === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Welcome to Shift6
          </h1>
          <p className="text-slate-400 mb-12 text-center">
            Choose your training style
          </p>

          <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
            {/* Home Mode - Primary option */}
            <button
              onClick={() => handleSelectMode('home')}
              className="bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl p-6 text-left hover:from-cyan-500 hover:to-teal-500 transition-all group"
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

            {/* Gym Mode - Secondary option */}
            <button
              onClick={() => handleSelectMode('gym')}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-left hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
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
        </div>
      </div>
    )
  }

  // Step 1: Experience Level - one click to complete with recommended program
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={1} totalSteps={2} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Your experience level?
          </h2>
          <p className="text-slate-400 mb-8 text-center">
            Tap to start with the perfect program for you
          </p>

          <div className="space-y-4 flex-1">
            {EXPERIENCE_LEVELS.map((level) => {
              const Icon = level.icon
              const recommended = PROGRAM_RECOMMENDATIONS[level.id]?.[0] || 'daily-quick'
              const program = HOME_PROGRAMS[recommended]

              return (
                <button
                  key={level.id}
                  onClick={() => handleSelectExperience(level.id)}
                  className={`w-full bg-slate-900 rounded-xl p-5 text-left transition-all hover:ring-2 ${level.ringClass} ${level.bgClass.replace('/10', '/5')}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${level.iconBgClass}`}>
                      <Icon className={`w-7 h-7 ${level.textClass}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">{level.name}</h3>
                      <p className="text-sm text-slate-400">{level.desc}</p>
                      {program && (
                        <p className="text-xs text-cyan-400 mt-1">
                          → {program.name} • {program.duration}min • {program.daysPerWeek}x/week
                        </p>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 ${level.textClass}`} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Option to see all programs */}
          <button
            onClick={() => setStep(2)}
            className="mt-4 text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Or browse all programs →
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Program Selection (optional - if user wants to pick manually)
  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={2} totalSteps={2} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Choose Your Program
          </h2>
          <p className="text-slate-400 mb-6 text-center">
            Tap a program to start
          </p>

          <div className="space-y-3">
            {Object.entries(HOME_PROGRAMS).map(([id, program]) => (
              <button
                key={id}
                onClick={() => handleSelectProgram(id)}
                className={`w-full bg-slate-900 rounded-xl p-4 text-left transition-all hover:ring-2 ${
                  program.isRecommended
                    ? 'ring-2 ring-cyan-500 bg-cyan-500/10'
                    : 'hover:ring-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{program.name}</h3>
                      {program.isRecommended && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{program.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400">
                    {program.exercises.length} exercises
                  </span>
                  <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400">
                    {program.daysPerWeek}x/week
                  </span>
                  <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{program.duration}min
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default Onboarding
