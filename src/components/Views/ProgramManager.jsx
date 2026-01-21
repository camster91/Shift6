import { useState } from 'react'
import { X, Plus, Trash2, ChevronRight, Settings } from 'lucide-react'
import NeoIcon from '../Visuals/NeoIcon'

const ProgramManager = ({
    allExercises,
    activeProgram,
    programMode,
    userEquipment,
    templates,
    equipment,
    programModes,
    onApplyTemplate,
    onRemoveFromProgram,
    onChangeProgramMode,
    onSetEquipment,
    onShowLibrary,
    onClose
}) => {
    const [showTemplates, setShowTemplates] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [tempMode, setTempMode] = useState(programMode)
    const [tempEquipment, setTempEquipment] = useState(userEquipment)

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

    // Get templates for current mode
    const availableTemplates = Object.entries(templates).filter(([, t]) => t.mode === programMode)

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

                {/* Mode indicator */}
                <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{programModes[programMode]?.icon}</span>
                            <div>
                                <p className="text-white font-medium">{programModes[programMode]?.name}</p>
                                <p className="text-xs text-slate-500">{activeProgram.length} exercises</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            Use Template
                        </button>
                    </div>
                </div>

                {/* Templates Panel */}
                {showTemplates && (
                    <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 space-y-2">
                        <p className="text-sm text-slate-400 mb-2">Quick-start templates:</p>
                        {availableTemplates.map(([id, template]) => (
                            <button
                                key={id}
                                onClick={() => {
                                    onApplyTemplate(id)
                                    setShowTemplates(false)
                                }}
                                className="w-full p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-left flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-white font-medium">{template.name}</p>
                                    <p className="text-xs text-slate-400">{template.exercises.length} exercises - {template.desc}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Exercise List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {activeProgram.map((key, index) => {
                            const exercise = allExercises[key]
                            if (!exercise) return null

                            return (
                                <div
                                    key={key}
                                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
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
                                        <p className="text-xs text-slate-500 capitalize">{exercise.category}</p>
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
                                <p className="text-sm text-slate-600 mt-1">Add some from the library!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
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
            </div>

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
