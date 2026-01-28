import { useState, useMemo } from 'react'
import {
  X,
  Plus,
  Trash2,
  LayoutGrid,
  Wrench,
  List,
  Copy,
  Edit3,
  Dumbbell,
  Clock,
  Target,
  Play
} from 'lucide-react'
import { GYM_PROGRAMS, GYM_EXERCISES, GYM_DIFFICULTY_LABELS } from '../../data/gymExercises'
import { vibrate } from '../../utils/device'
import GymProgramBuilder from './GymProgramBuilder'

/**
 * GymProgramManager - Manage gym programs (view, browse templates, build custom)
 */
const GymProgramManager = ({
  currentProgram,       // { programId, currentWeek, currentDay }
  customGymPrograms,    // Array of custom programs
  onSelectProgram,      // (programId, programData) => void
  onSaveCustomProgram,  // (program) => void
  onDeleteCustomProgram,// (programId) => void
  onClose,
  theme = 'dark'
}) => {
  const [activeTab, setActiveTab] = useState('current') // 'current' | 'templates' | 'custom'
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [confirmSelect, setConfirmSelect] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const cardBg = theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'

  // Get current program details
  const currentProgramDetails = useMemo(() => {
    if (!currentProgram?.programId) return null

    // Check custom programs first
    const customMatch = customGymPrograms?.find(p => p.id === currentProgram.programId)
    if (customMatch) return { ...customMatch, isCustom: true }

    // Check built-in programs
    const builtIn = GYM_PROGRAMS[currentProgram.programId]
    if (builtIn) return { id: currentProgram.programId, ...builtIn, isBuiltIn: true }

    return null
  }, [currentProgram, customGymPrograms])

  // Filter programs by difficulty
  const filteredTemplates = useMemo(() => {
    return Object.entries(GYM_PROGRAMS)
      .filter(([, program]) => difficultyFilter === 'all' || program.difficulty === difficultyFilter)
      .map(([id, program]) => ({ id, ...program }))
      .sort((a, b) => {
        if (a.recommended && !b.recommended) return -1
        if (!a.recommended && b.recommended) return 1
        return (a.daysPerWeek || 3) - (b.daysPerWeek || 3)
      })
  }, [difficultyFilter])

  // Handle program selection
  const handleSelectProgram = (program) => {
    vibrate(30)
    // Show confirmation if switching from current program
    if (currentProgram?.programId && currentProgram.programId !== program.id) {
      setConfirmSelect(program)
    } else {
      onSelectProgram(program.id, program)
      onClose()
    }
  }

  const confirmProgramSelect = () => {
    if (confirmSelect) {
      onSelectProgram(confirmSelect.id, confirmSelect)
      setConfirmSelect(null)
      onClose()
    }
  }

  // Handle program deletion
  const handleDeleteProgram = (program) => {
    vibrate(30)
    setConfirmDelete(program)
  }

  const confirmProgramDelete = () => {
    if (confirmDelete && onDeleteCustomProgram) {
      onDeleteCustomProgram(confirmDelete.id)
      setConfirmDelete(null)
    }
  }

  // Handle custom program save
  const handleSaveCustomProgram = (program) => {
    onSaveCustomProgram(program)
    setShowBuilder(false)
    setEditingProgram(null)
  }

  // Clone a program for editing
  const handleCloneProgram = (program) => {
    vibrate(30)
    const cloned = {
      ...program,
      id: null, // Will get new ID on save
      name: `${program.name} (Custom)`,
      isCustom: true,
      isBuiltIn: false
    }
    setEditingProgram(cloned)
    setShowBuilder(true)
  }

  // Tab configuration
  const tabs = [
    { id: 'current', label: 'Current', icon: List },
    { id: 'templates', label: 'Templates', icon: LayoutGrid },
    { id: 'custom', label: 'My Programs', icon: Wrench },
  ]

  // Program card component
  const ProgramCard = ({ program, isCurrentProgram = false, showActions = true }) => {
    const diffLabel = GYM_DIFFICULTY_LABELS[program.difficulty] || GYM_DIFFICULTY_LABELS.beginner

    return (
      <div className={`${cardBg} rounded-xl overflow-hidden border ${
        isCurrentProgram ? 'border-purple-500' : borderColor
      }`}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-bold ${textPrimary}`}>{program.name}</h4>
                {program.isCustom && (
                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                    Custom
                  </span>
                )}
                {program.recommended && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                    Recommended
                  </span>
                )}
                {isCurrentProgram && (
                  <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className={`text-sm ${textSecondary} mt-1`}>{program.desc}</p>
            </div>
          </div>

          {/* Program stats */}
          <div className="flex items-center gap-4 text-xs mb-3">
            <div className="flex items-center gap-1">
              <span className={diffLabel.color === 'emerald' ? 'text-emerald-400' : diffLabel.color === 'blue' ? 'text-blue-400' : 'text-purple-400'}>
                {diffLabel.icon}
              </span>
              <span className={textSecondary}>{diffLabel.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target size={12} className={textSecondary} />
              <span className={textSecondary}>{program.daysPerWeek}x/week</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} className={textSecondary} />
              <span className={textSecondary}>~{program.sessionDuration || 45}min</span>
            </div>
          </div>

          {/* Split preview */}
          <div className="flex flex-wrap gap-1 mb-4">
            {program.split?.slice(0, 4).map((day, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-1 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-lg ${textSecondary}`}
              >
                {day.name}
              </span>
            ))}
            {program.split?.length > 4 && (
              <span className={`text-xs px-2 py-1 ${textSecondary}`}>
                +{program.split.length - 4} more
              </span>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2">
              {!isCurrentProgram && (
                <button
                  onClick={() => handleSelectProgram(program)}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={16} />
                  {program.isCustom ? 'Use' : 'Start'}
                </button>
              )}
              <button
                onClick={() => handleCloneProgram(program)}
                className={`py-2 px-3 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-lg hover:bg-slate-600 transition-colors`}
                title="Clone & Edit"
              >
                <Copy size={16} className={textSecondary} />
              </button>
              {program.isCustom && (
                <>
                  <button
                    onClick={() => { setEditingProgram(program); setShowBuilder(true) }}
                    className={`py-2 px-3 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded-lg hover:bg-slate-600 transition-colors`}
                    title="Edit"
                  >
                    <Edit3 size={16} className={textSecondary} />
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(program)}
                    className="py-2 px-3 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className={`fixed inset-0 ${bgClass} md:inset-4 md:rounded-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Gym Programs</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className={textSecondary} size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`px-4 py-2 border-b ${borderColor} bg-slate-900/50`}>
          <div className="flex bg-slate-800 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : `${textSecondary} hover:text-white`
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Current Tab */}
          {activeTab === 'current' && (
            <div className="space-y-4">
              {currentProgramDetails ? (
                <>
                  <ProgramCard
                    program={currentProgramDetails}
                    isCurrentProgram={true}
                    showActions={false}
                  />

                  {/* Workout days detail */}
                  <div>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-3`}>Workout Schedule</h3>
                    <div className="space-y-2">
                      {currentProgramDetails.split?.map((day, index) => {
                        const isToday = index === ((currentProgram.currentDay - 1) % currentProgramDetails.split.length)
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-xl border ${
                              isToday
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : `${cardBg} ${borderColor}`
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-medium ${isToday ? 'text-purple-400' : textPrimary}`}>
                                {day.name}
                                {isToday && <span className="ml-2 text-xs">(Today)</span>}
                              </h4>
                              <span className={`text-xs ${textSecondary}`}>
                                {day.exercises?.length || 0} exercises
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {day.exercises?.map(exId => {
                                const ex = GYM_EXERCISES[exId]
                                return ex ? (
                                  <span
                                    key={exId}
                                    className={`text-xs px-2 py-1 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'} rounded ${textSecondary}`}
                                  >
                                    {ex.shortName || ex.name}
                                  </span>
                                ) : null
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Change program button */}
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`w-full py-3 border ${borderColor} ${textSecondary} rounded-xl hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-2`}
                  >
                    <LayoutGrid size={18} />
                    Browse Other Programs
                  </button>
                </>
              ) : (
                <div className={`text-center py-12 ${cardBg} rounded-xl border ${borderColor}`}>
                  <Dumbbell className={`w-16 h-16 mx-auto mb-4 ${textSecondary}`} />
                  <h3 className={`font-bold ${textPrimary} mb-2`}>No Program Selected</h3>
                  <p className={`text-sm ${textSecondary} mb-4`}>
                    Choose a program template or create your own
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600"
                    >
                      Browse Templates
                    </button>
                    <button
                      onClick={() => setShowBuilder(true)}
                      className={`px-4 py-2 ${cardBg} border ${borderColor} ${textPrimary} rounded-lg hover:border-purple-500`}
                    >
                      Create Custom
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Difficulty filter */}
              <div className="flex gap-2 flex-wrap">
                {['all', 'beginner', 'intermediate', 'advanced'].map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficultyFilter(level)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      difficultyFilter === level
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : `${cardBg} ${textSecondary} hover:bg-slate-700`
                    }`}
                  >
                    {level === 'all' ? 'All' : GYM_DIFFICULTY_LABELS[level]?.icon + ' ' + GYM_DIFFICULTY_LABELS[level]?.name}
                  </button>
                ))}
              </div>

              {/* Program list */}
              <div className="space-y-3">
                {filteredTemplates.map(program => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    isCurrentProgram={currentProgram?.programId === program.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Programs Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              {/* Create new button */}
              <button
                onClick={() => { setEditingProgram(null); setShowBuilder(true) }}
                className={`w-full p-4 rounded-xl border-2 border-dashed ${borderColor} hover:border-purple-500 transition-colors flex items-center justify-center gap-3 group`}
              >
                <Plus className={`${textSecondary} group-hover:text-purple-400`} size={24} />
                <span className={`font-medium ${textSecondary} group-hover:text-purple-400`}>
                  Create New Program
                </span>
              </button>

              {/* Custom programs list */}
              {customGymPrograms && customGymPrograms.length > 0 ? (
                <div className="space-y-3">
                  {customGymPrograms.map(program => (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      isCurrentProgram={currentProgram?.programId === program.id}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${cardBg} rounded-xl border ${borderColor}`}>
                  <Wrench className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
                  <p className={textSecondary}>No custom programs yet</p>
                  <p className={`text-sm ${textSecondary} mt-1`}>
                    Create your own or clone a template
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Program Builder Modal */}
      {showBuilder && (
        <GymProgramBuilder
          existingProgram={editingProgram}
          onSave={handleSaveCustomProgram}
          onCancel={() => { setShowBuilder(false); setEditingProgram(null) }}
          theme={theme}
        />
      )}

      {/* Confirm Select Modal */}
      {confirmSelect && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className={`${bgClass} rounded-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                <Dumbbell className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>Switch Program?</h3>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Switch to <span className="text-purple-400 font-semibold">{confirmSelect.name}</span>
              </p>
              <p className={`text-xs ${textSecondary}`}>
                Your progress will be saved and you can switch back anytime.
              </p>
            </div>
            <div className={`p-4 border-t ${borderColor} flex gap-3`}>
              <button
                onClick={() => setConfirmSelect(null)}
                className={`flex-1 py-2 border ${borderColor} ${textSecondary} rounded-lg hover:bg-slate-800`}
              >
                Cancel
              </button>
              <button
                onClick={confirmProgramSelect}
                className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className={`${bgClass} rounded-2xl w-full max-w-sm overflow-hidden`}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>Delete Program?</h3>
              <p className={`text-sm ${textSecondary} mb-2`}>
                Delete <span className="text-red-400 font-semibold">{confirmDelete.name}</span>?
              </p>
              <p className={`text-xs ${textSecondary}`}>
                This action cannot be undone.
              </p>
            </div>
            <div className={`p-4 border-t ${borderColor} flex gap-3`}>
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 py-2 border ${borderColor} ${textSecondary} rounded-lg hover:bg-slate-800`}
              >
                Cancel
              </button>
              <button
                onClick={confirmProgramDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GymProgramManager
