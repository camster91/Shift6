import { useState, useMemo } from 'react'
import { X, Plus, Check, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from 'lucide-react'
import { EXERCISE_LIBRARY } from '../../data/exerciseLibrary.js'
import NeoIcon from '../Visuals/NeoIcon'

// Color classes for exercise display
const colorClasses = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
}

// Category info
const CATEGORIES = {
  push: { name: 'Push', icon: '💪', desc: 'Chest, shoulders, triceps' },
  pull: { name: 'Pull', icon: '🔙', desc: 'Back, biceps' },
  legs: { name: 'Legs', icon: '🦵', desc: 'Quads, hamstrings, glutes' },
  core: { name: 'Core', icon: '🎯', desc: 'Abs, obliques, lower back' },
  full: { name: 'Full Body', icon: '🏃', desc: 'Compound movements' },
}

// Quick presets
const QUICK_PRESETS = [
  {
    name: 'Upper Body Basics',
    exercises: ['pushups', 'pullups', 'dips'],
    icon: '💪',
  },
  {
    name: 'Lower Body Basics',
    exercises: ['squats', 'lunges', 'glutebridge'],
    icon: '🦵',
  },
  {
    name: 'Core Essentials',
    exercises: ['plank', 'vups', 'supermans'],
    icon: '🎯',
  },
]

/**
 * Component for building custom programs
 * Used in Onboarding and ProgramManager
 */
const CustomProgramBuilder = ({
  selectedExercises = [],
  onExercisesChange,
  programMode = 'bodyweight',
  userEquipment = ['none'],
  allExercises = {},
  onDone,
  onCancel,
  maxExercises = 20,
  minExercises = 3,
}) => {
  const [expandedCategory, setExpandedCategory] = useState('push')
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  // Get available exercises based on mode and equipment
  const availableExercises = useMemo(() => {
    const exercises = {}

    // Add exercises from EXERCISE_LIBRARY
    Object.entries(EXERCISE_LIBRARY).forEach(([key, ex]) => {
      if (!ex.modes?.includes(programMode)) return
      const hasEquipment = ex.equipment?.every(eq =>
        eq === 'none' || userEquipment.includes(eq)
      )
      if (hasEquipment) {
        exercises[key] = ex
      }
    })

    // Also include exercises from allExercises that might not be in EXERCISE_LIBRARY
    Object.entries(allExercises).forEach(([key, ex]) => {
      if (!exercises[key] && ex.modes?.includes(programMode)) {
        exercises[key] = ex
      }
    })

    return exercises
  }, [programMode, userEquipment, allExercises])

  // Group exercises by category
  const exercisesByCategory = useMemo(() => {
    const grouped = { push: [], pull: [], legs: [], core: [], full: [] }

    Object.entries(availableExercises).forEach(([key, ex]) => {
      const category = ex.category || 'full'
      if (grouped[category]) {
        grouped[category].push({ key, ...ex })
      }
    })

    return grouped
  }, [availableExercises])

  // Calculate balance stats
  const balanceStats = useMemo(() => {
    const stats = { push: 0, pull: 0, legs: 0, core: 0, full: 0 }
    selectedExercises.forEach(key => {
      const ex = availableExercises[key] || allExercises[key]
      if (ex) {
        const category = ex.category || 'full'
        stats[category]++
      }
    })
    return stats
  }, [selectedExercises, availableExercises, allExercises])

  // Check for balance warnings
  const balanceWarnings = useMemo(() => {
    const warnings = []
    if (selectedExercises.length >= 4) {
      if (balanceStats.push > 0 && balanceStats.pull === 0) {
        warnings.push('Add pull exercises for balance')
      }
      if (balanceStats.pull > 0 && balanceStats.push === 0) {
        warnings.push('Add push exercises for balance')
      }
      if (balanceStats.legs === 0 && selectedExercises.length >= 6) {
        warnings.push('Consider adding leg exercises')
      }
    }
    return warnings
  }, [selectedExercises, balanceStats])

  const toggleExercise = (exerciseKey) => {
    if (selectedExercises.includes(exerciseKey)) {
      onExercisesChange(selectedExercises.filter(k => k !== exerciseKey))
    } else if (selectedExercises.length < maxExercises) {
      onExercisesChange([...selectedExercises, exerciseKey])
    }
  }

  const handleQuickPreset = (preset) => {
    const newExercises = [...selectedExercises]
    preset.exercises.forEach(ex => {
      if (!newExercises.includes(ex) && newExercises.length < maxExercises) {
        newExercises.push(ex)
      }
    })
    onExercisesChange(newExercises)
    setShowQuickAdd(false)
  }

  const removeExercise = (exerciseKey) => {
    onExercisesChange(selectedExercises.filter(k => k !== exerciseKey))
  }

  const canProceed = selectedExercises.length >= minExercises

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Selected Exercises */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">
            Your Program ({selectedExercises.length}/{maxExercises})
          </h3>
          {selectedExercises.length > 0 && (
            <button
              onClick={() => onExercisesChange([])}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedExercises.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Select exercises below to build your program
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedExercises.map(key => {
              const ex = availableExercises[key] || allExercises[key]
              if (!ex) return null
              const colors = colorClasses[ex.color] || colorClasses.cyan

              return (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  {ex.image?.startsWith('neo:') && (
                    <NeoIcon
                      name={ex.image.replace('neo:', '')}
                      size={14}
                      className={colors.text}
                    />
                  )}
                  <span className={`text-xs ${colors.text}`}>{ex.name}</span>
                  <button
                    onClick={() => removeExercise(key)}
                    className="ml-1 text-slate-400 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Balance Warnings */}
        {balanceWarnings.length > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-400">
                {balanceWarnings.map((warning, i) => (
                  <p key={i}>{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Presets */}
      <div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Quick Add Presets</span>
          {showQuickAdd ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showQuickAdd && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {QUICK_PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleQuickPreset(preset)}
                className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-sm text-white font-medium">{preset.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {preset.exercises.length} exercises
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exercise Categories */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white">Add Exercises</h3>

        {Object.entries(CATEGORIES).map(([catKey, catInfo]) => {
          const exercises = exercisesByCategory[catKey] || []
          if (exercises.length === 0) return null

          const isExpanded = expandedCategory === catKey
          const selectedInCategory = exercises.filter(ex => selectedExercises.includes(ex.key)).length

          return (
            <div key={catKey} className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                className="w-full p-3 bg-slate-800/50 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{catInfo.icon}</span>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">{catInfo.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {selectedInCategory > 0 && `${selectedInCategory} selected • `}
                      {exercises.length} available
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-3 space-y-2 bg-slate-900/50">
                  {exercises.map(ex => {
                    const isSelected = selectedExercises.includes(ex.key)
                    const colors = colorClasses[ex.color] || colorClasses.cyan
                    const atLimit = selectedExercises.length >= maxExercises && !isSelected

                    return (
                      <button
                        key={ex.key}
                        onClick={() => toggleExercise(ex.key)}
                        disabled={atLimit}
                        className={`w-full p-3 rounded-lg border flex items-center gap-3 transition-all ${
                          isSelected
                            ? `${colors.bg} ${colors.border}`
                            : atLimit
                            ? 'bg-slate-800/30 border-slate-800 opacity-50 cursor-not-allowed'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                          {ex.image?.startsWith('neo:') ? (
                            <NeoIcon
                              name={ex.image.replace('neo:', '')}
                              size={16}
                              className={colors.text}
                            />
                          ) : (
                            <span className={colors.text}>•</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${isSelected ? colors.text : 'text-white'}`}>
                            {ex.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ex.unit === 'seconds' ? 'Hold' : 'Reps'} • {ex.finalGoal} goal
                          </p>
                        </div>
                        {isSelected ? (
                          <Check className={`w-5 h-5 ${colors.text}`} />
                        ) : (
                          <Plus className="w-5 h-5 text-slate-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      {(onDone || onCancel) && (
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-slate-600 text-slate-300 rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          {onDone && (
            <button
              onClick={onDone}
              disabled={!canProceed}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                canProceed
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {canProceed
                ? `Continue with ${selectedExercises.length} exercises`
                : `Select at least ${minExercises} exercises`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomProgramBuilder
