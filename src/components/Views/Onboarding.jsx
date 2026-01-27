import { useState } from 'react'
import { ChevronRight, Check, Home, ChevronLeft, Zap, Trophy, Target, Clock } from 'lucide-react'
import { FITNESS_LEVEL_PRESETS } from '../../data/exercises.jsx'

// Step progress indicator component
const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 py-4">
    {Array.from({ length: totalSteps }).map((_, idx) => (
      <div key={idx} className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
          idx < currentStep
            ? 'bg-cyan-500 text-white'
            : idx === currentStep
              ? 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500'
              : 'bg-slate-800 text-slate-500'
        }`}>
          {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
        </div>
        {idx < totalSteps - 1 && (
          <div className={`w-8 h-0.5 ${idx < currentStep ? 'bg-cyan-500' : 'bg-slate-800'}`} />
        )}
      </div>
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

// Program recommendations based on experience
const PROGRAM_RECOMMENDATIONS = {
  beginner: ['shift6-beginner', 'shift6-classic', 'minimal-start'],
  intermediate: ['shift6-classic', 'push-pull', 'upper-lower'],
  advanced: ['shift6-classic', 'push-pull', 'full-body']
}

// Home mode programs with descriptions and duration estimates
const HOME_PROGRAMS = {
  'shift6-classic': {
    id: 'shift6-classic',
    name: 'Shift6 Classic',
    desc: 'The original 9-exercise full body program',
    exercises: ['pushups', 'squats', 'pullups', 'dips', 'vups', 'glutebridge', 'plank', 'lunges', 'supermans'],
    daysPerWeek: 3,
    duration: 30,
    difficulty: 'All levels'
  },
  'shift6-beginner': {
    id: 'shift6-beginner',
    name: 'Beginner Start',
    desc: 'Simplified program to build your foundation',
    exercises: ['pushups', 'squats', 'plank', 'lunges', 'glutebridge'],
    daysPerWeek: 3,
    duration: 20,
    difficulty: 'Beginner'
  },
  'minimal-start': {
    id: 'minimal-start',
    name: 'Minimal Start',
    desc: 'Just 3 exercises to get started',
    exercises: ['pushups', 'squats', 'plank'],
    daysPerWeek: 2,
    duration: 10,
    difficulty: 'Beginner'
  },
  'push-pull': {
    id: 'push-pull',
    name: 'Push/Pull Split',
    desc: 'Alternate pushing and pulling movements',
    exercises: ['pushups', 'pullups', 'dips', 'squats', 'lunges', 'vups'],
    daysPerWeek: 4,
    duration: 25,
    difficulty: 'Intermediate'
  },
  'upper-lower': {
    id: 'upper-lower',
    name: 'Upper/Lower Split',
    desc: 'Focus on upper or lower body each session',
    exercises: ['pushups', 'pullups', 'dips', 'squats', 'lunges', 'glutebridge', 'vups'],
    daysPerWeek: 4,
    duration: 30,
    difficulty: 'Intermediate'
  },
  'full-body': {
    id: 'full-body',
    name: 'Full Body Daily',
    desc: 'Hit all muscle groups every session',
    exercises: ['pushups', 'squats', 'pullups', 'dips', 'vups', 'glutebridge', 'plank', 'lunges', 'supermans'],
    daysPerWeek: 5,
    duration: 35,
    difficulty: 'Advanced'
  }
}

/**
 * Onboarding - Simplified first-time setup for home mode
 * 3 steps: Welcome → Experience Level → Program Selection
 */
const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0)
  const [experienceLevel, setExperienceLevel] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)

  const handleComplete = () => {
    const program = HOME_PROGRAMS[selectedProgram] || HOME_PROGRAMS['shift6-classic']
    const fitnessPreset = FITNESS_LEVEL_PRESETS[experienceLevel] || FITNESS_LEVEL_PRESETS.beginner

    const trainingPreferences = {
      fitnessLevel: experienceLevel,
      trainingDaysPerWeek: program.daysPerWeek,
      repScheme: fitnessPreset.defaultRepScheme || 'balanced',
      targetSessionDuration: 30
    }

    // Pass program mode, equipment (bodyweight = none), template, preferences, and exercises
    onComplete('bodyweight', ['none'], null, trainingPreferences, program.exercises)
  }

  // Get recommended programs based on experience
  const recommendedPrograms = experienceLevel
    ? PROGRAM_RECOMMENDATIONS[experienceLevel]
    : Object.keys(HOME_PROGRAMS)

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center mb-8">
            <Home className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to Shift6
          </h1>
          <p className="text-slate-400 max-w-sm mb-8">
            Build strength anywhere with progressive bodyweight training that adapts to your level.
          </p>

          <div className="space-y-3 text-left max-w-sm w-full">
            {[
              'No equipment needed',
              '6-week progressive programs',
              'Track reps and personal records',
              'Automatic progression'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-slate-400">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <button
            onClick={() => setStep(1)}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold text-lg flex items-center justify-center gap-2"
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
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <StepIndicator currentStep={1} totalSteps={3} />
          <div className="w-12" />
        </div>

        <div className="flex-1 p-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            What is your experience level?
          </h2>
          <p className="text-slate-400 mb-6">
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
                  className={`w-full bg-slate-900 rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? `ring-2 ${level.ringClass} ${level.bgClass}`
                      : 'hover:ring-2 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? level.iconBgClass : 'bg-slate-800'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSelected ? level.textClass : 'text-slate-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{level.name}</h3>
                      <p className="text-sm text-slate-400">{level.desc}</p>
                    </div>
                    {isSelected && (
                      <Check className={`w-5 h-5 ${level.textClass}`} />
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
                ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white'
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
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <StepIndicator currentStep={2} totalSteps={3} />
          <div className="w-12" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold text-white mb-2">
            Choose Your Program
          </h2>
          <p className="text-slate-400 mb-6">
            Select a training program that fits your goals.
          </p>

          <div className="space-y-3">
            {Object.entries(HOME_PROGRAMS).map(([id, program]) => {
              const isSelected = selectedProgram === id
              const isRecommended = recommendedPrograms.includes(id)

              return (
                <button
                  key={id}
                  onClick={() => setSelectedProgram(id)}
                  className={`w-full bg-slate-900 rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'ring-2 ring-cyan-500 bg-cyan-500/10'
                      : 'hover:ring-2 hover:ring-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{program.name}</h3>
                        {isRecommended && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{program.desc}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    )}
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
                    <span className="text-xs text-slate-500">
                      {program.difficulty}
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
                ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Start Training
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default Onboarding
