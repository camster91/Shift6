import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Save, RotateCcw, Sparkles } from 'lucide-react'
import {
    REP_SCHEME_CONFIGS,
    PROGRESSION_RATES,
    FITNESS_LEVEL_PRESETS,
    DEFAULT_TRAINING_PREFERENCES
} from '../../data/exercises.jsx'
import {
    TRAINING_DAYS_OPTIONS,
    SESSION_DURATION_OPTIONS,
    SETS_PER_EXERCISE_OPTIONS,
    PROGRAM_DURATION_OPTIONS
} from '../../utils/constants.js'
import { applyFitnessLevelPreset } from '../../utils/preferences.js'

const TrainingSettings = ({
    preferences,
    onSave,
    onClose,
    hasProgress = false
}) => {
    const [tempPrefs, setTempPrefs] = useState({ ...preferences })
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        // Check if preferences have changed (handles arrays like preferredDays)
        const changed = Object.keys(tempPrefs).some(key => {
            const tempVal = tempPrefs[key]
            const prefVal = preferences[key]
            // Handle array comparison
            if (Array.isArray(tempVal) && Array.isArray(prefVal)) {
                return JSON.stringify(tempVal) !== JSON.stringify(prefVal)
            }
            return tempVal !== prefVal
        })
        setHasChanges(changed)
    }, [tempPrefs, preferences])

    const handleChange = (key, value) => {
        setTempPrefs(prev => ({ ...prev, [key]: value }))
    }

    const handleFitnessLevelSelect = (level) => {
        const updated = applyFitnessLevelPreset(level, tempPrefs)
        setTempPrefs(updated)
    }

    const togglePreferredDay = (dayIndex) => {
        setTempPrefs(prev => {
            const days = prev.preferredDays || []
            if (days.includes(dayIndex)) {
                return { ...prev, preferredDays: days.filter(d => d !== dayIndex) }
            }
            return { ...prev, preferredDays: [...days, dayIndex].sort((a, b) => a - b) }
        })
    }

    const handleReset = () => {
        setTempPrefs({ ...DEFAULT_TRAINING_PREFERENCES })
    }

    const handleSave = () => {
        onSave(tempPrefs)
        onClose()
    }

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const restOptions = [
        { value: 'auto', label: 'Auto' },
        { value: 30, label: '30s' },
        { value: 45, label: '45s' },
        { value: 60, label: '60s' },
        { value: 90, label: '90s' },
        { value: 120, label: '2min' }
    ]

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center">
            <div className="w-full max-w-lg bg-slate-950 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Training Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Quick Apply - Fitness Level */}
                    <div className="bg-slate-900/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-white">Quick Setup</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(FITNESS_LEVEL_PRESETS).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => handleFitnessLevelSelect(key)}
                                    className={`p-3 rounded-lg text-center transition-all ${
                                        tempPrefs.fitnessLevel === key
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="text-xl block">{preset.icon}</span>
                                    <span className="text-xs">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Training Goal */}
                    <div>
                        <label className="text-sm text-slate-400 block mb-2">Training Goal</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(REP_SCHEME_CONFIGS).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handleChange('repScheme', key)}
                                    className={`p-3 rounded-lg text-left transition-all ${
                                        tempPrefs.repScheme === key
                                            ? 'bg-cyan-500/20 border-2 border-cyan-500'
                                            : 'bg-slate-800 border-2 border-transparent hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{config.icon}</span>
                                        <span className="font-medium text-white text-sm">{config.name}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {config.repRange[0]}-{config.repRange[1]} reps
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="text-sm text-slate-400 block mb-2">Training Days per Week</label>
                        <div className="flex gap-2">
                            {TRAINING_DAYS_OPTIONS.map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleChange('trainingDaysPerWeek', num)}
                                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                        tempPrefs.trainingDaysPerWeek === num
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferred Days */}
                    <div>
                        <label className="text-sm text-slate-400 block mb-2">Preferred Days (optional)</label>
                        <div className="flex gap-1">
                            {daysOfWeek.map((day, idx) => (
                                <button
                                    key={day}
                                    onClick={() => togglePreferredDay(idx)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                        tempPrefs.preferredDays?.includes(idx)
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progression Rate */}
                    <div>
                        <label className="text-sm text-slate-400 block mb-2">Progression Speed</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(PROGRESSION_RATES).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handleChange('progressionRate', key)}
                                    className={`p-3 rounded-lg text-center transition-all ${
                                        tempPrefs.progressionRate === key
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="text-lg block">{config.icon}</span>
                                    <span className="text-xs">{config.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-lg text-slate-400 hover:bg-slate-800"
                    >
                        <span className="text-sm font-medium">Advanced Settings</span>
                        {showAdvanced ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>

                    {/* Advanced Settings */}
                    {showAdvanced && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Program Duration */}
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">Program Duration (weeks)</label>
                                <div className="flex gap-2">
                                    {PROGRAM_DURATION_OPTIONS.map(weeks => (
                                        <button
                                            key={weeks}
                                            onClick={() => handleChange('programDuration', weeks)}
                                            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                                tempPrefs.programDuration === weeks
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {weeks}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sets per Exercise */}
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">Sets per Exercise</label>
                                <div className="flex gap-2">
                                    {SETS_PER_EXERCISE_OPTIONS.map(sets => (
                                        <button
                                            key={sets}
                                            onClick={() => handleChange('setsPerExercise', sets)}
                                            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                                tempPrefs.setsPerExercise === sets
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {sets}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Session Duration */}
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">Target Session Length</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {SESSION_DURATION_OPTIONS.map(mins => (
                                        <button
                                            key={mins}
                                            onClick={() => handleChange('targetSessionDuration', mins)}
                                            className={`py-2 rounded-lg text-sm transition-all ${
                                                tempPrefs.targetSessionDuration === mins
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {mins}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rest Between Sets */}
                            <div>
                                <label className="text-sm text-slate-400 block mb-2">Rest Between Sets</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {restOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleChange('restBetweenSets', opt.value)}
                                            className={`py-2 rounded-lg text-sm transition-all ${
                                                tempPrefs.restBetweenSets === opt.value
                                                    ? 'bg-cyan-500 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warning for existing progress */}
                    {hasProgress && hasChanges && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                            <p className="text-amber-400 text-sm">
                                Changing these settings will recalculate your program. Your completed workouts will be preserved.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all ${
                            hasChanges
                                ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </div>
    )
}

export default TrainingSettings
