import { useState, useMemo } from 'react'
import {
  X,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Edit3,
  Save,
  Dumbbell
} from 'lucide-react'
import { GYM_EXERCISES, MUSCLE_GROUPS } from '../../data/gymExercises'
import { vibrate } from '../../utils/device'

// Color classes for muscle groups
const muscleGroupColors = {
  chest: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500' },
  back: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500' },
  shoulders: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500' },
  biceps: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500' },
  triceps: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500' },
  quads: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500' },
  hamstrings: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500' },
  glutes: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500' },
  calves: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500' },
  core: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', solid: 'bg-amber-500' },
}

// Preset split templates
const SPLIT_TEMPLATES = [
  { name: 'Push/Pull/Legs', days: ['Push', 'Pull', 'Legs'] },
  { name: 'Upper/Lower', days: ['Upper Body', 'Lower Body'] },
  { name: 'Full Body', days: ['Full Body A', 'Full Body B', 'Full Body C'] },
  { name: 'Bro Split', days: ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms'] },
  { name: 'Custom', days: [] },
]

/**
 * GymProgramBuilder - Create custom gym workout programs
 */
const GymProgramBuilder = ({
  existingProgram = null, // For editing existing program
  onSave,
  onCancel,
  theme = 'dark'
}) => {
  // Program metadata
  const [programName, setProgramName] = useState(existingProgram?.name || '')
  const [programDesc, setProgramDesc] = useState(existingProgram?.desc || '')
  const [difficulty, setDifficulty] = useState(existingProgram?.difficulty || 'beginner')

  // Workout days/split
  const [days, setDays] = useState(existingProgram?.split || [
    { name: 'Day 1', exercises: [], muscleGroups: [] }
  ])

  // Current editing state
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [expandedMuscle, setExpandedMuscle] = useState(null)
  const [editingDayName, setEditingDayName] = useState(null)

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-700'
  const inputBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'

  // Group exercises by muscle group
  const exercisesByMuscle = useMemo(() => {
    const grouped = {}
    Object.entries(GYM_EXERCISES).forEach(([id, ex]) => {
      const muscle = ex.muscleGroup
      if (!grouped[muscle]) grouped[muscle] = []
      grouped[muscle].push({ id, ...ex })
    })
    return grouped
  }, [])

  // Get current day
  const currentDay = days[activeDayIndex] || { name: '', exercises: [] }

  // Add a new day
  const addDay = () => {
    vibrate(20)
    setDays([...days, {
      name: `Day ${days.length + 1}`,
      exercises: [],
      muscleGroups: []
    }])
    setActiveDayIndex(days.length)
  }

  // Remove a day
  const removeDay = (index) => {
    if (days.length <= 1) return
    vibrate(30)
    const newDays = days.filter((_, i) => i !== index)
    setDays(newDays)
    if (activeDayIndex >= newDays.length) {
      setActiveDayIndex(newDays.length - 1)
    }
  }

  // Update day name
  const updateDayName = (index, name) => {
    const newDays = [...days]
    newDays[index] = { ...newDays[index], name }
    setDays(newDays)
  }

  // Apply a split template
  const applyTemplate = (template) => {
    vibrate(30)
    if (template.name === 'Custom') {
      setDays([{ name: 'Day 1', exercises: [], muscleGroups: [] }])
    } else {
      setDays(template.days.map((name) => ({
        name,
        exercises: [],
        muscleGroups: []
      })))
    }
    setActiveDayIndex(0)
  }

  // Add exercise to current day
  const addExercise = (exerciseId) => {
    vibrate(20)
    const exercise = GYM_EXERCISES[exerciseId]
    if (!exercise) return

    const newDays = [...days]
    const currentExercises = newDays[activeDayIndex].exercises || []

    // Check if already added
    if (currentExercises.includes(exerciseId)) return

    newDays[activeDayIndex] = {
      ...newDays[activeDayIndex],
      exercises: [...currentExercises, exerciseId],
      muscleGroups: [...new Set([
        ...(newDays[activeDayIndex].muscleGroups || []),
        exercise.muscleGroup
      ])]
    }
    setDays(newDays)
  }

  // Remove exercise from current day
  const removeExercise = (exerciseId) => {
    vibrate(20)
    const newDays = [...days]
    const currentExercises = newDays[activeDayIndex].exercises || []
    newDays[activeDayIndex] = {
      ...newDays[activeDayIndex],
      exercises: currentExercises.filter(id => id !== exerciseId)
    }
    // Recalculate muscle groups
    const remainingMuscles = new Set()
    newDays[activeDayIndex].exercises.forEach(id => {
      const ex = GYM_EXERCISES[id]
      if (ex) remainingMuscles.add(ex.muscleGroup)
    })
    newDays[activeDayIndex].muscleGroups = Array.from(remainingMuscles)
    setDays(newDays)
  }

  // Move exercise up/down
  const moveExercise = (exerciseId, direction) => {
    const newDays = [...days]
    const exercises = [...(newDays[activeDayIndex].exercises || [])]
    const index = exercises.indexOf(exerciseId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= exercises.length) return

    exercises.splice(index, 1)
    exercises.splice(newIndex, 0, exerciseId)
    newDays[activeDayIndex] = { ...newDays[activeDayIndex], exercises }
    setDays(newDays)
    vibrate(10)
  }

  // Duplicate day
  const duplicateDay = (index) => {
    vibrate(20)
    const dayToCopy = days[index]
    const newDay = {
      ...dayToCopy,
      name: `${dayToCopy.name} (Copy)`,
      exercises: [...dayToCopy.exercises],
      muscleGroups: [...dayToCopy.muscleGroups]
    }
    const newDays = [...days]
    newDays.splice(index + 1, 0, newDay)
    setDays(newDays)
    setActiveDayIndex(index + 1)
  }

  // Validate program
  const isValid = useMemo(() => {
    if (!programName.trim()) return false
    if (days.length === 0) return false
    // At least one day must have exercises
    return days.some(day => day.exercises?.length > 0)
  }, [programName, days])

  // Save program
  const handleSave = () => {
    if (!isValid) return

    vibrate(50)
    const program = {
      id: existingProgram?.id || `custom-${Date.now()}`,
      name: programName.trim(),
      desc: programDesc.trim() || `Custom ${days.length}-day program`,
      difficulty,
      daysPerWeek: days.length,
      sessionDuration: 45,
      goal: 'custom',
      isCustom: true,
      split: days.map(day => ({
        name: day.name,
        muscleGroups: day.muscleGroups || [],
        exercises: day.exercises || []
      })),
      tags: ['custom'],
      createdAt: existingProgram?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onSave(program)
  }

  // Exercise selector modal
  const ExerciseSelector = () => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className={`${bgClass} rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col`}>
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
          <h3 className={`font-bold ${textPrimary}`}>Add Exercises</h3>
          <button
            onClick={() => setShowExerciseSelector(false)}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            <X className={textSecondary} size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.entries(MUSCLE_GROUPS).map(([muscleId, muscleInfo]) => {
            const exercises = exercisesByMuscle[muscleId] || []
            if (exercises.length === 0) return null

            const colors = muscleGroupColors[muscleId] || muscleGroupColors.core
            const isExpanded = expandedMuscle === muscleId
            const selectedCount = exercises.filter(ex =>
              currentDay.exercises?.includes(ex.id)
            ).length

            return (
              <div key={muscleId} className={`border ${borderColor} rounded-xl overflow-hidden`}>
                <button
                  onClick={() => setExpandedMuscle(isExpanded ? null : muscleId)}
                  className={`w-full p-3 flex items-center justify-between ${
                    theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                      <Dumbbell className={colors.text} size={14} />
                    </div>
                    <span className={`font-medium ${textPrimary}`}>{muscleInfo.name}</span>
                    {selectedCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {selectedCount} selected
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className={textSecondary} size={18} />
                  ) : (
                    <ChevronDown className={textSecondary} size={18} />
                  )}
                </button>

                {isExpanded && (
                  <div className={`p-3 pt-0 space-y-2 ${theme === 'light' ? 'bg-slate-50' : 'bg-slate-800/50'}`}>
                    {exercises.map(ex => {
                      const isSelected = currentDay.exercises?.includes(ex.id)
                      return (
                        <button
                          key={ex.id}
                          onClick={() => isSelected ? removeExercise(ex.id) : addExercise(ex.id)}
                          className={`w-full p-3 rounded-lg border flex items-center justify-between transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.border}`
                              : `${theme === 'light' ? 'bg-white' : 'bg-slate-900'} ${borderColor} hover:border-purple-500/50`
                          }`}
                        >
                          <div className="text-left">
                            <p className={`font-medium ${isSelected ? colors.text : textPrimary}`}>
                              {ex.shortName || ex.name}
                            </p>
                            <p className={`text-xs ${textSecondary}`}>
                              {ex.defaultSets} sets × {ex.defaultReps?.[0] || 8} reps
                            </p>
                          </div>
                          {isSelected ? (
                            <Check className={colors.text} size={18} />
                          ) : (
                            <Plus className={textSecondary} size={18} />
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

        <div className={`p-4 border-t ${borderColor}`}>
          <button
            onClick={() => setShowExerciseSelector(false)}
            className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
          >
            Done ({currentDay.exercises?.length || 0} exercises)
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className={`fixed inset-0 ${bgClass} md:inset-4 md:rounded-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>
            {existingProgram ? 'Edit Program' : 'Create Program'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className={textSecondary} size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Program Info */}
          <div className="space-y-4">
            <div>
              <label className={`text-sm ${textSecondary} block mb-2`}>Program Name *</label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g., My PPL Split"
                className={`w-full px-4 py-3 ${inputBg} ${textPrimary} rounded-xl border ${borderColor} focus:border-purple-500 outline-none`}
              />
            </div>

            <div>
              <label className={`text-sm ${textSecondary} block mb-2`}>Description (optional)</label>
              <input
                type="text"
                value={programDesc}
                onChange={(e) => setProgramDesc(e.target.value)}
                placeholder="Brief description of your program"
                className={`w-full px-4 py-3 ${inputBg} ${textPrimary} rounded-xl border ${borderColor} focus:border-purple-500 outline-none`}
              />
            </div>

            <div>
              <label className={`text-sm ${textSecondary} block mb-2`}>Difficulty</label>
              <div className="flex gap-2">
                {['beginner', 'intermediate', 'advanced'].map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-2 px-3 rounded-lg border capitalize transition-all ${
                      difficulty === level
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : `${inputBg} ${borderColor} ${textSecondary}`
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split Templates */}
          <div>
            <label className={`text-sm ${textSecondary} block mb-2`}>Start from template</label>
            <div className="flex flex-wrap gap-2">
              {SPLIT_TEMPLATES.map(template => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className={`px-3 py-2 rounded-lg border ${borderColor} ${textSecondary} hover:border-purple-500 hover:text-purple-400 transition-all text-sm`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Days/Split */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm ${textSecondary}`}>Workout Days ({days.length})</label>
              <button
                onClick={addDay}
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
              >
                <Plus size={16} />
                Add Day
              </button>
            </div>

            {/* Day tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setActiveDayIndex(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                    activeDayIndex === index
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                      : `${inputBg} ${borderColor} ${textSecondary}`
                  }`}
                >
                  <span className="font-medium">{day.name}</span>
                  {day.exercises?.length > 0 && (
                    <span className="ml-2 text-xs opacity-60">
                      ({day.exercises.length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Current Day Editor */}
            {currentDay && (
              <div className={`${inputBg} rounded-xl p-4 border ${borderColor}`}>
                {/* Day name editor */}
                <div className="flex items-center gap-2 mb-4">
                  {editingDayName === activeDayIndex ? (
                    <input
                      type="text"
                      value={currentDay.name}
                      onChange={(e) => updateDayName(activeDayIndex, e.target.value)}
                      onBlur={() => setEditingDayName(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingDayName(null)}
                      autoFocus
                      className={`flex-1 px-3 py-2 ${bgClass} rounded-lg border ${borderColor} ${textPrimary} outline-none`}
                    />
                  ) : (
                    <h4 className={`flex-1 font-bold ${textPrimary}`}>{currentDay.name}</h4>
                  )}

                  <button
                    onClick={() => setEditingDayName(activeDayIndex)}
                    className={`p-2 rounded-lg hover:bg-slate-700 ${textSecondary}`}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => duplicateDay(activeDayIndex)}
                    className={`p-2 rounded-lg hover:bg-slate-700 ${textSecondary}`}
                    title="Duplicate day"
                  >
                    <Copy size={16} />
                  </button>
                  {days.length > 1 && (
                    <button
                      onClick={() => removeDay(activeDayIndex)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                      title="Delete day"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Exercises list */}
                {currentDay.exercises?.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {currentDay.exercises.map((exerciseId, index) => {
                      const exercise = GYM_EXERCISES[exerciseId]
                      if (!exercise) return null
                      const colors = muscleGroupColors[exercise.muscleGroup] || muscleGroupColors.core

                      return (
                        <div
                          key={exerciseId}
                          className={`flex items-center gap-3 p-3 ${bgClass} rounded-lg border ${borderColor}`}
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveExercise(exerciseId, 'up')}
                              disabled={index === 0}
                              className={`p-1 rounded hover:bg-slate-700 ${index === 0 ? 'opacity-30' : ''}`}
                            >
                              <ChevronUp size={14} className={textSecondary} />
                            </button>
                            <button
                              onClick={() => moveExercise(exerciseId, 'down')}
                              disabled={index === currentDay.exercises.length - 1}
                              className={`p-1 rounded hover:bg-slate-700 ${index === currentDay.exercises.length - 1 ? 'opacity-30' : ''}`}
                            >
                              <ChevronDown size={14} className={textSecondary} />
                            </button>
                          </div>

                          <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                            <span className={`text-xs font-bold ${colors.text}`}>{index + 1}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${textPrimary} truncate`}>
                              {exercise.shortName || exercise.name}
                            </p>
                            <p className={`text-xs ${textSecondary}`}>
                              {exercise.defaultSets} sets • {MUSCLE_GROUPS[exercise.muscleGroup]?.name}
                            </p>
                          </div>

                          <button
                            onClick={() => removeExercise(exerciseId)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className={`text-center py-6 ${textSecondary}`}>
                    No exercises added yet
                  </p>
                )}

                {/* Add exercise button */}
                <button
                  onClick={() => setShowExerciseSelector(true)}
                  className={`w-full py-3 rounded-xl border-2 border-dashed ${borderColor} ${textSecondary} hover:border-purple-500 hover:text-purple-400 transition-all flex items-center justify-center gap-2`}
                >
                  <Plus size={18} />
                  Add Exercises
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderColor} bg-slate-900/50`}>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`flex-1 py-3 border ${borderColor} ${textSecondary} rounded-xl font-medium hover:bg-slate-800 transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                isValid
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Save size={18} />
              Save Program
            </button>
          </div>
        </div>
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && <ExerciseSelector />}
    </div>
  )
}

export default GymProgramBuilder
