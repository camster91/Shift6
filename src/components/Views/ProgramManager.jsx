import { useState, useMemo } from 'react'
import { X, Plus, Trash2, Settings, LayoutGrid, Wrench, List } from 'lucide-react'
import NeoIcon from '../Visuals/NeoIcon'
import TemplateCard from '../Visuals/TemplateCard'
import CustomProgramBuilder from './CustomProgramBuilder'
import { EXERCISE_LIBRARY, GOAL_ICONS } from '../../data/exerciseLibrary.js'
import { EXERCISE_PLANS } from '../../data/exercises.jsx'
import { EXERCISES } from '../../data/exerciseDatabase.js'

const ProgramManager = ({
    allExercises,
    activeProgram,
    programMode,
    userEquipment,
    templates,
    equipment,
    programModes,
    onApplyTemplate,
    onApplyCustomProgram,
    onRemoveFromProgram,
    onChangeProgramMode,
    onSetEquipment,
    onShowLibrary,
    onClose,
    completedDays = {}
}) => {
    const [activeTab, setActiveTab] = useState('current') // 'current' | 'templates' | 'custom'
    const [showSettings, setShowSettings] = useState(false)
    const [tempMode, setTempMode] = useState(programMode)
    const [tempEquipment, setTempEquipment] = useState(userEquipment)
    const [goalFilter, setGoalFilter] = useState('all')
    const [customExercises, setCustomExercises] = useState([])
    const [confirmApply, setConfirmApply] = useState(null) // Template ID to confirm
    const [confirmCustom, setConfirmCustom] = useState(false) // Confirm custom program apply

    // Combine all exercises
    const combinedExercises = useMemo(() => {
        return { ...EXERCISE_PLANS, ...EXERCISE_LIBRARY, ...EXERCISES, ...allExercises }
    }, [allExercises])

    const handleEquipmentToggle = (equipId) => {
        if (equipId === 'none') return
        setTempEquipment(prev => {
            if (prev.includes(equipId)) {
                return prev.filter(e => e !== equipId)
            }
            return [...prev, equipId]
        })
    }

    const handleSaveSettings = () => {
        if (tempMode !== programMode) {
            onChangeProgramMode(tempMode)
        }
        onSetEquipment(tempEquipment)
        setShowSettings(false)
    }

    const handleApplyTemplate = (templateId) => {
        // Check if user has progress
        const hasProgress = Object.values(completedDays).some(days => days?.length > 0)
        if (hasProgress) {
            setConfirmApply(templateId)
        } else {
            onApplyTemplate(templateId)
            setActiveTab('current')
        }
    }

    const confirmTemplateApply = () => {
        if (confirmApply) {
            onApplyTemplate(confirmApply)
            setConfirmApply(null)
            setActiveTab('current')
        }
    }

    const handleApplyCustom = () => {
        if (customExercises.length >= 3) {
            // Check if user has progress
            const hasProgress = Object.values(completedDays).some(days => days?.length > 0)
            if (hasProgress) {
                setConfirmCustom(true)
            } else {
                onApplyCustomProgram(customExercises)
                setActiveTab('current')
                setCustomExercises([])
            }
        }
    }

    const confirmCustomApply = () => {
        onApplyCustomProgram(customExercises)
        setConfirmCustom(false)
        setActiveTab('current')
        setCustomExercises([])
    }

    // Get templates for current mode
    const availableTemplates = Object.entries(templates)
        .filter(([, t]) => t.mode === programMode)
        .filter(([, t]) => goalFilter === 'all' || t.goal === goalFilter)

    // Tab configuration
    const tabs = [
        { id: 'current', label: 'Current', icon: List },
        { id: 'templates', label: 'Templates', icon: LayoutGrid },
        { id: 'custom', label: 'Build', icon: Wrench },
    ]

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
            <div className="fixed inset-0 bg-slate-950 md:inset-4 md:rounded-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">My Program</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <Settings className="w-5 h-5 text-slate-400" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'bg-cyan-500 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode indicator */}
                <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{programModes[programMode]?.icon}</span>
                        <div>
                            <p className="text-white font-medium">{programModes[programMode]?.name}</p>
                            <p className="text-xs text-slate-500">{activeProgram.length} exercises</p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {/* Current Tab */}
                    {activeTab === 'current' && (
                        <div className="p-4 space-y-2">
                            {activeProgram.map((key, index) => {
                                const exercise = allExercises[key]
                                if (!exercise) return null
                                const dayNum = (completedDays[key]?.length || 0) + 1
                                const isComplete = dayNum > 18

                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center gap-3 p-3 rounded-lg ${
                                            isComplete
                                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                                : 'bg-slate-800/50'
                                        }`}
                                    >
                                        <span className="text-slate-500 text-sm w-6">{index + 1}.</span>
                                        <div className="w-10 h-10 flex-shrink-0">
                                            <NeoIcon
                                                exerciseKey={key}
                                                color={exercise.color}
                                                size={40}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{exercise.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {isComplete ? (
                                                    <span className="text-emerald-400">Complete</span>
                                                ) : (
                                                    `Day ${dayNum}/18`
                                                )}
                                                <span className="capitalize ml-2">{exercise.category}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onRemoveFromProgram(key)}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            })}

                            {activeProgram.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">No exercises in your program</p>
                                    <p className="text-sm text-slate-600 mt-1">Add some from the library or pick a template!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Templates Tab */}
                    {activeTab === 'templates' && (
                        <div className="p-4 space-y-4">
                            {/* Goal Filter */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setGoalFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        goalFilter === 'all'
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    All
                                </button>
                                {Object.entries(GOAL_ICONS).map(([goal, icon]) => (
                                    <button
                                        key={goal}
                                        onClick={() => setGoalFilter(goal)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                            goalFilter === goal
                                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        <span>{icon}</span>
                                        <span className="capitalize">{goal}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Template List */}
                            <div className="space-y-3">
                                {availableTemplates.map(([id, template]) => (
                                    <TemplateCard
                                        key={id}
                                        template={template}
                                        selected={false}
                                        onApply={handleApplyTemplate}
                                        showPreview={true}
                                        allExercises={combinedExercises}
                                    />
                                ))}
                                {availableTemplates.length === 0 && (
                                    <p className="text-center text-slate-500 py-4">
                                        No templates match this filter
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom Builder Tab */}
                    {activeTab === 'custom' && (
                        <div className="p-4">
                            <CustomProgramBuilder
                                selectedExercises={customExercises}
                                onExercisesChange={setCustomExercises}
                                programMode={programMode}
                                userEquipment={userEquipment}
                                allExercises={combinedExercises}
                                maxExercises={15}
                                minExercises={3}
                                onDone={handleApplyCustom}
                            />
                        </div>
                    )}
                </div>

                {/* Footer - only show for Current tab */}
                {activeTab === 'current' && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex gap-3">
                            <button
                                onClick={onShowLibrary}
                                className="flex-1 py-3 px-4 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Exercises
                            </button>
                            <button
                                onClick={onClose}
                                className="py-3 px-6 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Confirmation Modal */}
            {confirmApply && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Switch Template?</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Your progress will be preserved for exercises that exist in both programs.
                            </p>
                            <p className="text-slate-500 text-xs">
                                Switching to: {templates[confirmApply]?.name}
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setConfirmApply(null)}
                                className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmTemplateApply}
                                className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
                            >
                                Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Program Confirmation Modal */}
            {confirmCustom && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Apply Custom Program?</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Your progress will be preserved for exercises that exist in both programs.
                            </p>
                            <p className="text-slate-500 text-xs">
                                New program: {customExercises.length} exercises
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setConfirmCustom(false)}
                                className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCustomApply}
                                className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Program Settings</h3>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 rounded-lg hover:bg-slate-800"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Mode Selection */}
                            <div>
                                <p className="text-sm text-slate-400 mb-3">Training Style</p>
                                <div className="space-y-2">
                                    {Object.entries(programModes).map(([id, mode]) => (
                                        <button
                                            key={id}
                                            onClick={() => setTempMode(id)}
                                            className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                                tempMode === id
                                                    ? 'border-cyan-500 bg-cyan-500/10'
                                                    : 'border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <span className="text-xl">{mode.icon}</span>
                                            <div>
                                                <p className="text-white font-medium">{mode.name}</p>
                                                <p className="text-xs text-slate-400">{mode.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Equipment Selection (only for gym modes) */}
                            {tempMode !== 'bodyweight' && (
                                <div>
                                    <p className="text-sm text-slate-400 mb-3">Your Equipment</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(equipment).filter(([id]) => id !== 'none').map(([id, equip]) => (
                                            <button
                                                key={id}
                                                onClick={() => handleEquipmentToggle(id)}
                                                className={`p-3 rounded-lg border transition-all text-center ${
                                                    tempEquipment.includes(id)
                                                        ? 'border-cyan-500 bg-cyan-500/10'
                                                        : 'border-slate-700 hover:border-slate-600'
                                                }`}
                                            >
                                                <span className="text-xl block mb-1">{equip.icon}</span>
                                                <span className="text-xs text-slate-300">{equip.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 flex gap-3">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="flex-1 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProgramManager
