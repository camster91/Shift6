import { useState, useMemo } from 'react'
import { X, ChevronRight, Check, Clock, Flame, ArrowLeftRight, BookOpen, Play } from 'lucide-react'
import { getAllProgramsWithProgress, getProgramProgress, STARTER_TEMPLATES } from '../../data/exerciseLibrary.js'
import { vibrate } from '../../utils/device'

/**
 * ProgramSwitcher - Allow users to switch between programs while preserving progress
 * Shows all available programs with saved progress indicators
 */
const ProgramSwitcher = ({
  currentProgramId,
  onSelectProgram,
  onClose,
  theme = 'dark'
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [confirmProgram, setConfirmProgram] = useState(null)

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderClass = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'

  // Get all programs with their progress data
  const programsWithProgress = useMemo(() => {
    return getAllProgramsWithProgress()
  }, [])

  // Categorize programs
  const categories = useMemo(() => {
    const cats = {
      all: { label: 'All', count: programsWithProgress.length },
      inProgress: { label: 'In Progress', count: 0 },
      beginner: { label: 'Beginner', count: 0 },
      intermediate: { label: 'Intermediate', count: 0 },
      advanced: { label: 'Advanced', count: 0 },
    }

    programsWithProgress.forEach(p => {
      if (p.hasProgress) cats.inProgress.count++
      if (p.difficulty === 'beginner') cats.beginner.count++
      if (p.difficulty === 'intermediate') cats.intermediate.count++
      if (p.difficulty === 'advanced') cats.advanced.count++
    })

    return cats
  }, [programsWithProgress])

  // Filter programs based on selected category
  const filteredPrograms = useMemo(() => {
    if (selectedCategory === 'all') return programsWithProgress
    if (selectedCategory === 'inProgress') {
      return programsWithProgress.filter(p => p.hasProgress)
    }
    return programsWithProgress.filter(p => p.difficulty === selectedCategory)
  }, [programsWithProgress, selectedCategory])

  // Get difficulty badge styling
  const getDifficultyBadge = (difficulty) => {
    const badges = {
      beginner: { text: 'Beginner', color: 'emerald' },
      intermediate: { text: 'Intermediate', color: 'blue' },
      advanced: { text: 'Advanced', color: 'orange' },
    }
    return badges[difficulty] || { text: difficulty, color: 'slate' }
  }

  // Format date for display
  const formatLastWorkout = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const handleSelectProgram = (program) => {
    vibrate('light')
    if (program.id === currentProgramId) {
      onClose()
      return
    }
    setConfirmProgram(program)
  }

  const handleConfirmSwitch = () => {
    if (confirmProgram) {
      vibrate('medium')
      onSelectProgram?.(confirmProgram.id, confirmProgram)
    }
    onClose()
  }

  // Confirmation modal
  if (confirmProgram) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
        <div className={`${bgClass} rounded-2xl w-full max-w-md overflow-hidden`}>
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <ArrowLeftRight className="w-8 h-8 text-white" />
              </div>
            </div>

            <h3 className={`text-lg font-bold ${textPrimary} mb-2 text-center`}>
              Switch Program
            </h3>

            <p className={`text-sm ${textSecondary} text-center mb-4`}>
              Switch to <span className="font-semibold text-cyan-400">{confirmProgram.name}</span>
            </p>

            {/* Progress preservation notice */}
            <div className={`${cardBg} rounded-xl p-4 mb-6`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${textPrimary} mb-1`}>
                    Your progress is saved
                  </p>
                  <p className={`text-xs ${textSecondary}`}>
                    All your progress in the current program will be preserved. You can switch back anytime and continue where you left off.
                  </p>
                </div>
              </div>
            </div>

            {/* Program details */}
            {confirmProgram.hasProgress && (
              <div className={`${cardBg} rounded-xl p-3 mb-6`}>
                <p className={`text-xs ${textSecondary} mb-1`}>Resume your progress:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                        style={{ width: `${Math.min((confirmProgram.progress?.totalWorkouts || 0) / 18 * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs ${textSecondary}`}>
                    {confirmProgram.progress?.totalWorkouts || 0} workouts
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmProgram(null)}
                className={`flex-1 py-3 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'} ${textPrimary} font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitch}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Switch
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
            <h3 className={`font-bold ${textPrimary}`}>Switch Program</h3>
            <p className={`text-sm ${textSecondary}`}>
              Your progress is saved for each program
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'}`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : theme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {cat.label}
              {cat.count > 0 && (
                <span className="ml-1 opacity-60">({cat.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Programs list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredPrograms.length === 0 ? (
            <div className={`text-center py-8 ${textSecondary}`}>
              <p>No programs found in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrograms.map(program => {
                const isCurrentProgram = program.id === currentProgramId
                const badge = getDifficultyBadge(program.difficulty)
                const lastWorkout = formatLastWorkout(program.progress?.lastWorkout)

                return (
                  <button
                    key={program.id}
                    onClick={() => handleSelectProgram(program)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      isCurrentProgram
                        ? `${theme === 'light' ? 'bg-cyan-50' : 'bg-cyan-500/10'} border-cyan-500/50`
                        : `${cardBg} ${borderClass} hover:border-cyan-500/30`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Program icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCurrentProgram
                          ? 'bg-gradient-to-br from-cyan-500 to-teal-500'
                          : theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'
                      }`}>
                        {program.icon ? (
                          <span className="text-2xl">{program.icon}</span>
                        ) : (
                          <BookOpen className={`w-5 h-5 ${isCurrentProgram ? 'text-white' : textSecondary}`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title and badge */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className={`font-semibold ${textPrimary} truncate`}>
                            {program.name}
                          </h4>
                          {isCurrentProgram && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                              Current
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-${badge.color}-500/20 text-${badge.color}-400`}>
                            {badge.text}
                          </span>
                        </div>

                        {/* Description */}
                        {program.description && (
                          <p className={`text-sm ${textSecondary} line-clamp-2 mb-2`}>
                            {program.description}
                          </p>
                        )}

                        {/* Progress indicator */}
                        {program.hasProgress && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-orange-400" />
                              <span className={textSecondary}>
                                {program.progress?.totalWorkouts || 0} workouts
                              </span>
                            </div>
                            {lastWorkout && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className={textSecondary}>{lastWorkout}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Not started indicator */}
                        {!program.hasProgress && !isCurrentProgram && (
                          <p className={`text-xs ${textSecondary}`}>
                            Not started yet
                          </p>
                        )}
                      </div>

                      <ChevronRight className={`w-5 h-5 ${textSecondary} flex-shrink-0`} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className={`p-4 border-t ${borderClass} text-center`}>
          <p className={`text-xs ${textSecondary}`}>
            Switch freely between programs. Your progress in each is saved automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProgramSwitcher
