import { useState, useMemo } from 'react'
import { X, ArrowRight, Check, Undo2 } from 'lucide-react'
import { EXERCISE_PLANS } from '../../data/exercises.jsx'
import {
  EXERCISE_ALTERNATIVES,
  saveExerciseReplacement,
  clearExerciseReplacement,
} from '../../data/exerciseLibrary.js'

/**
 * ExerciseReplacementModal - Allow users to swap exercises they don't like
 * Shows alternatives categorized by difficulty (easier/same/harder)
 */
const ExerciseReplacementModal = ({
  exerciseKey,
  currentReplacement = null,
  onSelect,
  onClose,
  theme = 'dark'
}) => {
  const [filter, setFilter] = useState('all') // 'all' | 'easier' | 'sameLevel' | 'harder'
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedReplacement, setSelectedReplacement] = useState(null)

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderClass = theme === 'light' ? 'border-slate-200' : 'border-slate-700'

  // Get the original exercise details
  const originalExercise = EXERCISE_PLANS[exerciseKey]
  const altData = EXERCISE_ALTERNATIVES[exerciseKey]

  // Get all alternatives with full details
  const alternatives = useMemo(() => {
    if (!altData) return { easier: [], sameLevel: [], harder: [] }

    const getDetails = (keys) => keys.map(key => {
      const exercise = EXERCISE_PLANS[key]
      if (!exercise) return null
      return {
        key,
        name: exercise.name,
        color: exercise.color,
        category: exercise.category,
        equipment: exercise.equipment || ['none'],
        unit: exercise.unit,
        instructions: exercise.instructions,
      }
    }).filter(Boolean)

    return {
      easier: getDetails(altData.easier || []),
      sameLevel: getDetails(altData.sameLevel || []),
      harder: getDetails(altData.harder || []),
    }
  }, [altData])

  // Filter alternatives based on selected filter
  const filteredAlternatives = useMemo(() => {
    if (filter === 'all') {
      return [
        ...alternatives.easier.map(a => ({ ...a, difficulty: 'easier' })),
        ...alternatives.sameLevel.map(a => ({ ...a, difficulty: 'same' })),
        ...alternatives.harder.map(a => ({ ...a, difficulty: 'harder' })),
      ]
    }
    return alternatives[filter]?.map(a => ({ ...a, difficulty: filter })) || []
  }, [alternatives, filter])

  const handleSelectReplacement = (replacement) => {
    setSelectedReplacement(replacement)
    setShowConfirm(true)
  }

  const handleConfirmReplacement = () => {
    if (selectedReplacement) {
      saveExerciseReplacement(exerciseKey, selectedReplacement.key)
      onSelect?.(selectedReplacement.key)
    }
    onClose()
  }

  const handleRevertToOriginal = () => {
    clearExerciseReplacement(exerciseKey)
    onSelect?.(null)
    onClose()
  }

  if (!originalExercise) return null

  // Confirmation view
  if (showConfirm && selectedReplacement) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
        <div className={`${bgClass} rounded-2xl w-full max-w-md overflow-hidden`}>
          <div className="p-6">
            <h3 className={`text-lg font-bold ${textPrimary} mb-4 text-center`}>
              Confirm Replacement
            </h3>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className={`w-14 h-14 rounded-xl bg-${originalExercise.color}-500/20 border border-${originalExercise.color}-500/30 flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-2xl">❌</span>
                </div>
                <p className={`text-sm ${textSecondary}`}>{originalExercise.name}</p>
              </div>

              <ArrowRight className={`w-6 h-6 ${textSecondary}`} />

              <div className="text-center">
                <div className={`w-14 h-14 rounded-xl bg-${selectedReplacement.color}-500/20 border border-${selectedReplacement.color}-500/30 flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-2xl">✅</span>
                </div>
                <p className={`text-sm ${textSecondary}`}>{selectedReplacement.name}</p>
              </div>
            </div>

            <p className={`text-sm ${textSecondary} text-center mb-6`}>
              This change will apply to all your workouts. You can always change it back later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className={`flex-1 py-3 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'} ${textPrimary} font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReplacement}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className={`${bgClass} rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${borderClass} flex items-center justify-between`}>
          <div>
            <h3 className={`font-bold ${textPrimary}`}>Replace Exercise</h3>
            <p className={`text-sm ${textSecondary}`}>
              Swap <span className={`text-${originalExercise.color}-400`}>{originalExercise.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Current replacement indicator */}
        {currentReplacement && (
          <div className={`mx-4 mt-4 p-3 rounded-lg ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'} border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>Currently replaced with:</p>
                <p className={`font-medium ${theme === 'light' ? 'text-amber-800' : 'text-amber-300'}`}>
                  {EXERCISE_PLANS[currentReplacement]?.name || currentReplacement}
                </p>
              </div>
              <button
                onClick={handleRevertToOriginal}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${
                  theme === 'light' ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <Undo2 className="w-3 h-3" />
                Revert
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 p-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'easier', label: 'Easier', count: alternatives.easier.length },
            { id: 'sameLevel', label: 'Same', count: alternatives.sameLevel.length },
            { id: 'harder', label: 'Harder', count: alternatives.harder.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : theme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Alternatives list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredAlternatives.length === 0 ? (
            <div className={`text-center py-8 ${textSecondary}`}>
              <p>No alternatives available for this filter.</p>
              <p className="text-sm mt-1">Try selecting &quot;All&quot; to see more options.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlternatives.map(alt => {
                const difficultyBadge = {
                  easier: { text: 'Easier', color: 'emerald' },
                  same: { text: 'Same Level', color: 'blue' },
                  sameLevel: { text: 'Same Level', color: 'blue' },
                  harder: { text: 'Harder', color: 'orange' },
                }[alt.difficulty] || { text: '', color: 'slate' }

                return (
                  <button
                    key={alt.key}
                    onClick={() => handleSelectReplacement(alt)}
                    className={`w-full p-4 rounded-xl ${
                      theme === 'light' ? 'bg-slate-50 hover:bg-slate-100' : 'bg-slate-800 hover:bg-slate-700'
                    } text-left transition-colors border ${borderClass} hover:border-cyan-500/50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${alt.color}-500/20 border border-${alt.color}-500/30 flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-${alt.color}-400 text-lg`}>💪</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${textPrimary}`}>{alt.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-${difficultyBadge.color}-500/20 text-${difficultyBadge.color}-400`}>
                            {difficultyBadge.text}
                          </span>
                        </div>
                        {alt.instructions && (
                          <p className={`text-sm ${textSecondary} line-clamp-2`}>
                            {alt.instructions}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs ${textSecondary}`}>
                            {alt.equipment?.includes('none') ? 'No equipment' : alt.equipment?.join(', ')}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className={`w-5 h-5 ${textSecondary} flex-shrink-0`} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom note */}
        <div className={`p-4 border-t ${borderClass} text-center`}>
          <p className={`text-xs ${textSecondary}`}>
            Replacements apply permanently to your program. You can change them anytime in settings.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ExerciseReplacementModal
