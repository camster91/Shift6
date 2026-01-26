import { useState } from 'react'
import { Dumbbell, ChevronRight, ChevronLeft, Check, Zap, Trophy, Target } from 'lucide-react'
import { GYM_PROGRAMS } from '../../data/gymExercises'

const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    desc: 'New to weight training or less than 6 months experience',
    icon: Zap,
    color: 'emerald'
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    desc: '6 months to 2 years of consistent training',
    icon: Target,
    color: 'blue'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    desc: '2+ years of structured weight training',
    icon: Trophy,
    color: 'purple'
  }
]

const PROGRAM_RECOMMENDATIONS = {
  beginner: ['full-body-3day', 'ppl-beginner', 'strength-5x5'],
  intermediate: ['upper-lower', 'ppl-6day', 'ppl-beginner'],
  advanced: ['ppl-6day', 'upper-lower', 'bro-split']
}

/**
 * GymOnboarding - First-time setup for gym mode
 * Collects experience level and program selection
 */
const GymOnboarding = ({ onComplete, theme = 'dark' }) => {
  const [step, setStep] = useState(0)
  const [experienceLevel, setExperienceLevel] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  const handleComplete = () => {
    onComplete({
      experienceLevel,
      programId: selectedProgram,
      currentWeek: 1,
      currentDay: 1,
      startDate: new Date().toISOString()
    })
  }

  // Get recommended programs based on experience
  const recommendedPrograms = experienceLevel
    ? PROGRAM_RECOMMENDATIONS[experienceLevel]
    : Object.keys(GYM_PROGRAMS)

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-8">
            <Dumbbell className="w-12 h-12 text-white" />
          </div>

          <h1 className={`text-3xl font-bold ${textPrimary} mb-4`}>
            Welcome to Gym Mode
          </h1>
          <p className={`${textSecondary} max-w-sm mb-8`}>
            Track your weight training with smart programming, progressive overload, and detailed analytics.
          </p>

          <div className="space-y-3 text-left max-w-sm w-full">
            {[
              'Pre-built training programs',
              'Weight & rep tracking',
              'Rest timers between sets',
              'Progress analytics'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-purple-400" />
                </div>
                <span className={textSecondary}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={() => setStep(1)}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg flex items-center justify-center gap-2"
          >
            Get Started
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Step 1: Experience Level
  if (step === 1) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        <div className="p-4">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="flex-1 p-6">
          <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            What is your experience level?
          </h2>
          <p className={`${textSecondary} mb-6`}>
            This helps us recommend the right program for you.
          </p>

          <div className="space-y-3">
            {EXPERIENCE_LEVELS.map((level) => {
              const Icon = level.icon
              const isSelected = experienceLevel === level.id

              return (
                <button
                  key={level.id}
                  onClick={() => setExperienceLevel(level.id)}
                  className={`w-full ${cardBg} rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? `ring-2 ring-${level.color}-500 bg-${level.color}-500/10`
                      : 'hover:ring-2 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? `bg-${level.color}-500/20` : 'bg-slate-800'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? `text-${level.color}-400` : 'text-slate-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${textPrimary}`}>{level.name}</h3>
                      <p className={`text-sm ${textSecondary}`}>{level.desc}</p>
                    </div>
                    {isSelected && (
                      <Check className={`w-5 h-5 text-${level.color}-400`} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={() => setStep(2)}
            disabled={!experienceLevel}
            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              experienceLevel
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Program Selection
  if (step === 2) {
    return (
      <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
        <div className="p-4">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
            Choose Your Program
          </h2>
          <p className={`${textSecondary} mb-6`}>
            Select a training split that fits your schedule.
          </p>

          <div className="space-y-3">
            {Object.entries(GYM_PROGRAMS).map(([id, program]) => {
              const isSelected = selectedProgram === id
              const isRecommended = recommendedPrograms.includes(id)

              return (
                <button
                  key={id}
                  onClick={() => setSelectedProgram(id)}
                  className={`w-full ${cardBg} rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'ring-2 ring-purple-500 bg-purple-500/10'
                      : 'hover:ring-2 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${textPrimary}`}>{program.name}</h3>
                        {isRecommended && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${textSecondary} mt-1`}>{program.desc}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400">
                      {program.daysPerWeek}x/week
                    </span>
                    <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400">
                      {program.level}
                    </span>
                    <span className="text-xs text-slate-500">
                      {program.schedule.filter(d => !d.isRest).length} training days
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={handleComplete}
            disabled={!selectedProgram}
            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              selectedProgram
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Start Training
            <Dumbbell className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default GymOnboarding
