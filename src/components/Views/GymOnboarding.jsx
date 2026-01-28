import { useState, useMemo } from 'react'
import { Dumbbell, ChevronRight, ChevronLeft, Zap, Trophy, Target, Clock, Home, Flame, Calendar, TrendingUp } from 'lucide-react'
import {
  GYM_PROGRAMS,
  getGymProgramsByDifficulty,
  getRecommendedGymProgram,
  GYM_DIFFICULTY_LABELS
} from '../../data/gymExercises'

// Minimal step indicator - just dots (matching Home mode)
const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 py-2">
    {Array.from({ length: totalSteps }).map((_, idx) => (
      <div
        key={idx}
        className={`w-2 h-2 rounded-full transition-all ${
          idx <= currentStep ? 'bg-purple-500' : 'bg-slate-700'
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
    desc: 'New to weight training or less than 6 months experience',
    details: 'Master form with foundational movements',
    icon: Zap,
    ringClass: 'ring-emerald-500',
    bgClass: 'bg-emerald-500/10',
    iconBgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400'
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    desc: '6 months to 2 years of consistent training',
    details: 'Increase volume and introduce advanced splits',
    icon: Target,
    ringClass: 'ring-blue-500',
    bgClass: 'bg-blue-500/10',
    iconBgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    desc: '2+ years of structured weight training',
    details: 'High intensity, specialized programming',
    icon: Trophy,
    ringClass: 'ring-purple-500',
    bgClass: 'bg-purple-500/10',
    iconBgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400'
  }
]

// Goal icons for display
const GOAL_ICONS = {
  strength: Flame,
  hypertrophy: Target,
  power: Zap,
  balanced: TrendingUp,
  athleticism: TrendingUp,
}

/**
 * GymOnboarding - First-time setup for gym mode
 * Step 0: Welcome with features
 * Step 1: Experience Level - shows recommended program
 * Step 2: Program Selection - shows all programs for selected level
 */
const GymOnboarding = ({ onComplete, onSwitchToHome, theme = 'dark' }) => {
  const [step, setStep] = useState(0)
  const [experienceLevel, setExperienceLevel] = useState(null)

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const backButtonClass = theme === 'light'
    ? 'text-slate-600 hover:text-slate-900'
    : 'text-slate-400 hover:text-white'

  // Get programs for each level using helper functions
  const programsByLevel = useMemo(() => ({
    beginner: getGymProgramsByDifficulty('beginner'),
    intermediate: getGymProgramsByDifficulty('intermediate'),
    advanced: getGymProgramsByDifficulty('advanced')
  }), [])

  // Handle experience selection - go to program selection
  const handleSelectExperience = (level) => {
    setExperienceLevel(level)
    setStep(2)
  }

  // Handle program selection
  const handleSelectProgram = (program) => {
    onComplete({
      experienceLevel,
      programId: program.id,
      currentWeek: 1,
      currentDay: 1,
      startDate: new Date().toISOString()
    })
  }

  // Step 0: Welcome with feature highlights
  if (step === 0) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col overflow-y-auto`}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
          {/* Animated Logo */}
          <div className="mb-4 animate-bounce">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className={`text-3xl font-bold ${textPrimary} mb-2 text-center animate-fadeIn`}>
            Welcome to Gym Mode
          </h1>
          <p className={`${textSecondary} mb-8 text-center animate-fadeIn`}>
            Professional weight training with smart progression
          </p>

          {/* Feature highlights - matching Home mode style */}
          <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-sm animate-fadeIn">
            <div className={`${cardBg} rounded-xl p-3 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-1" />
              <p className={`text-xs ${textSecondary}`}>Track Weights</p>
            </div>
            <div className={`${cardBg} rounded-xl p-3 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <p className={`text-xs ${textSecondary}`}>Build Streaks</p>
            </div>
            <div className={`${cardBg} rounded-xl p-3 text-center border ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className={`text-xs ${textSecondary}`}>Earn Badges</p>
            </div>
          </div>

          {/* What's included */}
          <div className="space-y-3 text-left max-w-sm w-full mb-8 animate-fadeIn">
            {[
              { icon: Calendar, text: 'Pre-built training programs for all levels' },
              { icon: Target, text: 'Progressive overload tracking' },
              { icon: Clock, text: 'Smart rest timers between sets' },
              { icon: TrendingUp, text: 'Detailed progress analytics' }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-purple-400" />
                </div>
                <span className={textSecondary}>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Get Started Button */}
          <button
            onClick={() => setStep(1)}
            className="w-full max-w-sm py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:from-purple-400 hover:to-pink-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
          >
            Get Started
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Switch to Home mode */}
          {onSwitchToHome && (
            <button
              onClick={onSwitchToHome}
              className={`mt-4 flex items-center gap-2 ${textSecondary} hover:text-white transition-colors`}
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Switch to Home Mode</span>
            </button>
          )}

          {/* Mode switch note */}
          <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'} mt-4 text-center`}>
            You can switch between Home and Gym anytime in settings
          </p>
        </div>
      </div>
    )
  }

  // Step 1: Experience Level Selection
  if (step === 1) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(0)}
            className={`flex items-center gap-1 ${backButtonClass}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={0} totalSteps={2} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 flex flex-col">
          <h2 className={`text-2xl font-bold ${textPrimary} mb-2 text-center`}>
            What's your experience level?
          </h2>
          <p className={`${textSecondary} mb-8 text-center`}>
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
                  className={`w-full ${cardBg} rounded-xl p-5 text-left transition-all hover:ring-2 ${level.ringClass} ${level.bgClass.replace('/10', '/5')} hover:scale-[1.01] active:scale-[0.99]`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${level.iconBgClass}`}>
                      <Icon className={`w-7 h-7 ${level.textClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold ${textPrimary} text-lg`}>{level.name}</h3>
                        <span className={`text-xs px-2 py-0.5 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'} rounded-full ${textSecondary}`}>
                          {programs.length} programs
                        </span>
                      </div>
                      <p className={`text-sm ${textSecondary} mb-2`}>{level.desc}</p>
                      {recommended && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className={level.textClass}>Recommended:</span>
                          <span className={theme === 'light' ? 'text-slate-700' : 'text-slate-300'}>{recommended.name}</span>
                          <span className={textSecondary}>•</span>
                          <span className={textSecondary}>{recommended.daysPerWeek}x/week</span>
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
    const difficultyLabel = GYM_DIFFICULTY_LABELS[experienceLevel] || GYM_DIFFICULTY_LABELS.beginner

    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-1 ${backButtonClass}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <StepIndicator currentStep={1} totalSteps={2} />
          <div className="w-8" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto pb-24">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <span className="text-2xl">{difficultyLabel.icon}</span>
            <h2 className={`text-2xl font-bold ${textPrimary}`}>
              {levelInfo?.name} Programs
            </h2>
          </div>
          <p className={`${textSecondary} mb-6 text-center`}>
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
                  className={`w-full ${cardBg} rounded-xl p-4 text-left transition-all hover:ring-2 hover:scale-[1.01] active:scale-[0.99] ${
                    isRecommended
                      ? `ring-2 ${levelInfo?.ringClass || 'ring-purple-500'} ${levelInfo?.bgClass || 'bg-purple-500/10'}`
                      : theme === 'light' ? 'hover:ring-slate-300' : 'hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isRecommended ? levelInfo?.iconBgClass || 'bg-purple-500/20' : theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                    }`}>
                      <GoalIcon className={`w-5 h-5 ${
                        isRecommended ? levelInfo?.textClass || 'text-purple-400' : textSecondary
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${textPrimary}`}>{program.name}</h3>
                        {isRecommended && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            levelInfo?.bgClass || 'bg-purple-500/20'
                          } ${levelInfo?.textClass || 'text-purple-400'}`}>
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${textSecondary} mb-3`}>{program.desc}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-1 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'} rounded ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                          {program.daysPerWeek}x/week
                        </span>
                        <span className={`text-xs px-2 py-1 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'} rounded ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          ~{program.estimatedDuration || 45}min
                        </span>
                        <span className={`text-xs ${textSecondary} capitalize`}>
                          {program.difficulty}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-5 h-5 ${textSecondary} flex-shrink-0`} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Option to see other levels */}
          <div className={`mt-6 pt-6 border-t ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'} text-center mb-3`}>
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

export default GymOnboarding
