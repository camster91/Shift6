import { useState, useMemo } from 'react'
import { ChevronRight, Home, ChevronLeft, Zap, Trophy, Target, Clock, Dumbbell, Flame, Users, Heart } from 'lucide-react'
import { FITNESS_LEVEL_PRESETS } from '../../data/exercises.jsx'
import {
  STARTER_TEMPLATES,
  DIFFICULTY_LABELS,
  getProgramsByDifficulty,
  getRecommendedProgram
} from '../../data/exerciseLibrary.js'

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

// Experience levels with improved descriptions
const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    desc: 'New to fitness or returning after a break',
    details: 'Start with foundational movements and build your base',
    icon: Zap,
    ringClass: 'ring-emerald-500',
    bgClass: 'bg-emerald-500/10',
    iconBgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
    programCount: null // Will be computed
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    desc: 'Consistent training for 3+ months',
    details: 'Ready for more volume and harder progressions',
    icon: Target,
    ringClass: 'ring-cyan-500',
    bgClass: 'bg-cyan-500/10',
    iconBgClass: 'bg-cyan-500/20',
    textClass: 'text-cyan-400',
    programCount: null
  },
  {
    id: 'advanced',
    name: 'Advanced',
    desc: 'Training consistently for 1+ years',
    details: 'High intensity and advanced skill work',
    icon: Trophy,
    ringClass: 'ring-purple-500',
    bgClass: 'bg-purple-500/10',
    iconBgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
    programCount: null
  }
]

// Goal icons for display
const GOAL_ICONS = {
  strength: Flame,
  endurance: Heart,
  hypertrophy: Target,
  balanced: Users,
  core: Target,
}

/**
 * Onboarding - Simplified setup with better program selection
 * Step 0: Mode Selection (Home vs Gym) - one click
 * Step 1: Experience Level - shows recommended program
 * Step 2: Program Selection - shows all programs for selected level
 */
const Onboarding = ({ onComplete, onSelectGym }) => {
  const [step, setStep] = useState(0)
  const [experienceLevel, setExperienceLevel] = useState(null)

  // Get programs for each level
  const programsByLevel = useMemo(() => ({
    beginner: getProgramsByDifficulty('beginner'),
    intermediate: getProgramsByDifficulty('intermediate'),
    advanced: getProgramsByDifficulty('advanced')
  }), [])

  // Get recommended program for selected level
  const recommendedProgram = useMemo(() => {
    if (!experienceLevel) return null
    return getRecommendedProgram(experienceLevel)
  }, [experienceLevel])

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

  // Handle experience selection - show programs for that level
  const handleSelectExperience = (level) => {
    setExperienceLevel(level)
    setStep(2) // Go to program selection
  }

  // Handle quick start with recommended program
  const handleQuickStart = (level) => {
    const program = getRecommendedProgram(level)
    if (program) {
      completeWithProgram(program, level)
    }
  }

  // Handle program selection
  const handleSelectProgram = (program) => {
    completeWithProgram(program, experienceLevel)
  }

  // Complete onboarding with selected program
  const completeWithProgram = (program, level) => {
    const fitnessPreset = FITNESS_LEVEL_PRESETS[level] || FITNESS_LEVEL_PRESETS.beginner

    const trainingPreferences = {
      fitnessLevel: level,
      trainingDaysPerWeek: program.daysPerWeek,
      repScheme: fitnessPreset.defaultRepScheme || 'balanced',
      targetSessionDuration: program.sessionDuration,
      maxExercisesPerDay: program.maxExercisesPerDay || 0,
      setsPerExercise: program.sets || 3,
      restBetweenSets: program.restSeconds || 60
    }

    onComplete('bodyweight', ['none'], program.id, trainingPreferences, program.exercises)
  }

  // Step 0: Mode Selection (Home vs Gym)
  if (step === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
          {/* Animated Logo */}
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
            {/* Home Mode - Primary option */}
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

            {/* Gym Mode - Secondary option */}
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

          {/* Switch modes note */}
          <p className="text-xs text-slate-500 mt-6 text-center">
            You can switch between Home and Gym anytime in settings
          </p>
        </div>
      </div>
    )
  }

  // Step 1: Experience Level Selection
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
          <StepIndicator currentStep={0} totalSteps={2} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            What's your experience level?
          </h2>
          <p className="text-slate-400 mb-8 text-center">
            We'll recommend the perfect program for you
          </p>

          <div className="space-y-4 flex-1">
            {EXPERIENCE_LEVELS.map((level) => {
              const Icon = level.icon
              const programs = programsByLevel[level.id] || []
              const recommended = programs[0]

              return (
                <button
                  key={level.id}
                  onClick={() => handleSelectExperience(level.id)}
                  className={`w-full bg-slate-900 rounded-xl p-5 text-left transition-all hover:ring-2 ${level.ringClass} ${level.bgClass.replace('/10', '/5')}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${level.iconBgClass}`}>
                      <Icon className={`w-7 h-7 ${level.textClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg">{level.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                          {programs.length} programs
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{level.desc}</p>
                      {recommended && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={`${level.textClass} flex-shrink-0`}>Recommended:</span>
                          <span className="text-slate-300 truncate max-w-[120px]">{recommended.name}</span>
                          <span className="text-slate-500 hidden sm:inline">•</span>
                          <span className="text-slate-400 flex-shrink-0">{recommended.daysPerWeek}x/week</span>
                          <span className="text-slate-500 hidden sm:inline">•</span>
                          <span className="text-slate-400 flex-shrink-0">{recommended.sessionDuration}min</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-5 h-5 ${level.textClass} flex-shrink-0`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Program Selection for chosen level
  if (step === 2) {
    const programs = programsByLevel[experienceLevel] || []
    const levelInfo = EXPERIENCE_LEVELS.find(l => l.id === experienceLevel)
    const difficultyLabel = DIFFICULTY_LABELS[experienceLevel] || DIFFICULTY_LABELS.beginner

    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={1} totalSteps={2} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto pb-24">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <span className={`text-2xl`}>{difficultyLabel.icon}</span>
            <h2 className="text-2xl font-bold text-white">
              {levelInfo?.name} Programs
            </h2>
          </div>
          <p className="text-slate-400 mb-6 text-center">
            Choose a program that fits your schedule
          </p>

          <div className="space-y-3">
            {programs.map((program, index) => {
              const GoalIcon = GOAL_ICONS[program.goal] || Target
              const isRecommended = index === 0

              return (
                <button
                  key={program.id}
                  onClick={() => handleSelectProgram(program)}
                  className={`w-full bg-slate-900 rounded-xl p-4 text-left transition-all hover:ring-2 ${
                    isRecommended
                      ? `ring-2 ${levelInfo?.ringClass || 'ring-cyan-500'} ${levelInfo?.bgClass || 'bg-cyan-500/10'}`
                      : 'hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isRecommended ? levelInfo?.iconBgClass || 'bg-cyan-500/20' : 'bg-slate-800'
                    }`}>
                      <GoalIcon className={`w-5 h-5 ${
                        isRecommended ? levelInfo?.textClass || 'text-cyan-400' : 'text-slate-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{program.name}</h3>
                        {isRecommended && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            levelInfo?.bgClass || 'bg-cyan-500/20'
                          } ${levelInfo?.textClass || 'text-cyan-400'}`}>
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{program.desc}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                          {program.exercises.length} exercises
                        </span>
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                          {program.daysPerWeek}x/week
                        </span>
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {program.sessionDuration}min
                        </span>
                        {program.sets && (
                          <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                            {program.sets} sets
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Option to see other levels */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-sm text-slate-500 text-center mb-3">
              Want to try a different difficulty?
            </p>
            <div className="flex justify-center gap-2">
              {EXPERIENCE_LEVELS.filter(l => l.id !== experienceLevel).map((level) => (
                <button
                  key={level.id}
                  onClick={() => setExperienceLevel(level.id)}
                  className={`px-3 py-2 rounded-lg text-sm ${level.bgClass} ${level.textClass} transition-colors hover:opacity-80`}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default Onboarding
