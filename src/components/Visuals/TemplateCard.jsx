import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { GOAL_ICONS, DIFFICULTY_LABELS } from '../../data/exerciseLibrary.js'
import NeoIcon from './NeoIcon'

// Color classes for exercise display
const colorClasses = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
}

/**
 * Reusable template card for program selection
 * Used in Onboarding and ProgramManager
 */
const TemplateCard = ({
  template,
  selected = false,
  onSelect,
  onApply,
  showPreview = true,
  allExercises = {},
  compact = false
}) => {
  const [expanded, setExpanded] = useState(false)

  const goalIcon = template.goal ? GOAL_ICONS[template.goal] : '⚖️'
  const difficultyInfo = template.difficulty ? DIFFICULTY_LABELS[template.difficulty] : null

  const handleClick = () => {
    if (onSelect) {
      onSelect(template.id)
    }
  }

  const handlePreviewToggle = (e) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  const handleApply = (e) => {
    e.stopPropagation()
    if (onApply) {
      onApply(template.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`w-full rounded-xl border-2 transition-all text-left cursor-pointer ${
        selected
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-white ${compact ? 'text-sm' : ''}`}>
              {template.name}
            </h3>
            {template.recommended && (
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                Recommended
              </span>
            )}
          </div>
          <p className={`text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>
            {template.desc}
          </p>

          {/* Tags Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Goal Badge */}
            {template.goal && (
              <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300 flex items-center gap-1">
                <span>{goalIcon}</span>
                <span className="capitalize">{template.goal}</span>
              </span>
            )}

            {/* Difficulty Badge */}
            {difficultyInfo && (
              <span className={`text-xs px-2 py-1 rounded bg-${difficultyInfo.color}-500/20 text-${difficultyInfo.color}-400`}>
                {difficultyInfo.name}
              </span>
            )}

            {/* Days Per Week */}
            {template.daysPerWeek && (
              <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400">
                {template.daysPerWeek}x/week
              </span>
            )}

            {/* Session Duration */}
            {template.sessionDuration && (
              <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400">
                ~{template.sessionDuration} min
              </span>
            )}

            {/* Exercise Count */}
            <span className="text-xs text-slate-500">
              {template.exercises.length} exercises
            </span>
          </div>
        </div>

        {/* Selection/Action Area */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onApply && (
            <button
              onClick={handleApply}
              className="px-3 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-medium transition-colors"
            >
              Apply
            </button>
          )}
          {selected && !onApply && (
            <Check className="w-5 h-5 text-cyan-500" />
          )}
        </div>
      </div>

      {/* Preview Toggle */}
      {showPreview && (
        <button
          onClick={handlePreviewToggle}
          className="flex items-center gap-1 text-cyan-400 text-sm mt-3 hover:text-cyan-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Hide exercises</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>View exercises</span>
            </>
          )}
        </button>
      )}

      {/* Expanded Exercise List */}
      {expanded && showPreview && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            {template.exercises.map((exKey) => {
              const exercise = allExercises[exKey]
              if (!exercise) {
                return (
                  <span
                    key={exKey}
                    className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-400"
                  >
                    {exKey}
                  </span>
                )
              }

              const colorClass = colorClasses[exercise.color] || colorClasses.cyan

              return (
                <span
                  key={exKey}
                  className={`text-xs px-2 py-1 rounded border flex items-center gap-1.5 ${colorClass}`}
                >
                  {exercise.image?.startsWith('neo:') && (
                    <NeoIcon
                      name={exercise.image.replace('neo:', '')}
                      size={12}
                      className="opacity-70"
                    />
                  )}
                  {exercise.name}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateCard
