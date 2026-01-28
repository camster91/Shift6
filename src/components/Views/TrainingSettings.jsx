import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Save, RotateCcw, Sparkles, Target, Timer, Flame } from 'lucide-react'
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
    PROGRAM_DURATION_OPTIONS,
    DAILY_GOAL_OPTIONS,
    REST_TIMER_OPTIONS
} from '../../utils/constants.js'
import { applyFitnessLevelPreset } from '../../utils/preferences.js'
import { getThemeClasses, getModeAccentClasses } from '../../utils/colors'

const TrainingSettings = ({
    preferences,
    onSave,
    onClose,
    hasProgress = false,
    theme = 'dark',
    mode = 'home',
    // New settings
    dailyGoal = 1,
    onDailyGoalChange,
    restTimerOverride = null,
    onRestTimerChange,
    warmupEnabled = true,
    onWarmupChange
}) => {
    const [tempPrefs, setTempPrefs] = useState({ ...preferences })
    const [tempDailyGoal, setTempDailyGoal] = useState(dailyGoal)
    const [tempRestTimer, setTempRestTimer] = useState(restTimerOverride)
    const [tempWarmup, setTempWarmup] = useState(warmupEnabled)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        // Check if preferences have changed (handles arrays like preferredDays)
        const prefsChanged = Object.keys(tempPrefs).some(key => {
            const tempVal = tempPrefs[key]
            const prefVal = preferences[key]
            // Handle array comparison
            if (Array.isArray(tempVal) && Array.isArray(prefVal)) {
                return JSON.stringify(tempVal) !== JSON.stringify(prefVal)
            }
            return tempVal !== prefVal
        })

        // Check if other settings changed
        const goalChanged = tempDailyGoal !== dailyGoal
        const restChanged = tempRestTimer !== restTimerOverride
        const warmupChanged = tempWarmup !== warmupEnabled

        setHasChanges(prefsChanged || goalChanged || restChanged || warmupChanged)
    }, [tempPrefs, preferences, tempDailyGoal, dailyGoal, tempRestTimer, restTimerOverride, tempWarmup, warmupEnabled])

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
        setTempDailyGoal(1)
        setTempRestTimer(null)
        setTempWarmup(true)
    }

    const handleSave = () => {
        onSave(tempPrefs)
        // Save other settings if handlers provided
        if (onDailyGoalChange) onDailyGoalChange(tempDailyGoal)
        if (onRestTimerChange) onRestTimerChange(tempRestTimer)
        if (onWarmupChange) onWarmupChange(tempWarmup)
        onClose()
    }

    // Theme and mode-specific styling
    const themeClasses = getThemeClasses(theme)
    const accent = getModeAccentClasses(mode)

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
            <div className={`w-full max-w-lg ${themeClasses.cardBg} rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${themeClasses.borderColor}`}>
                    <h2 className={`text-xl font-bold ${themeClasses.textPrimary}`}>Training Settings</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg ${themeClasses.hoverBg} ${themeClasses.textSecondary}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Quick Apply - Fitness Level */}
                    <div className={`${accent.accentBg} rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className={`w-4 h-4 ${accent.accentText}`} />
                            <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>Quick Setup</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(FITNESS_LEVEL_PRESETS).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => handleFitnessLevelSelect(key)}
                                    className={`p-3 rounded-lg text-center transition-all ${
                                        tempPrefs.fitnessLevel === key
                                            ? `${accent.accentSolid} text-white`
                                            : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                    }`}
                                >
                                    <span className="text-xl block">{preset.icon}</span>
                                    <span className="text-xs">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Daily Goal */}
                    <div className={`${themeClasses.cardBg} rounded-xl p-4 border ${themeClasses.borderColor}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Target className={`w-4 h-4 ${accent.accentText}`} />
                            <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>Daily Workout Goal</span>
                        </div>
                        <p className={`text-xs ${themeClasses.textSecondary} mb-3`}>
                            How many workouts do you aim to complete each day?
                        </p>
                        <div className="flex gap-2">
                            {DAILY_GOAL_OPTIONS.map(num => (
                                <button
                                    key={num}
                                    onClick={() => setTempDailyGoal(num)}
                                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                        tempDailyGoal === num
                                            ? `${accent.accentSolid} text-white`
                                            : `${themeClasses.hoverBg} ${themeClasses.textSecondary}`
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rest Timer & Warmup Settings */}
                    <div className={`${themeClasses.cardBg} rounded-xl p-4 border ${themeClasses.borderColor}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Timer className={`w-4 h-4 ${accent.accentText}`} />
                            <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>Workout Settings</span>
                        </div>

                        {/* Rest Timer Override */}
                        <div className="mb-4">
                            <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>
                                Rest Timer Between Sets
                            </label>
                            <div className="grid grid-cols-6 gap-1">
                                {REST_TIMER_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setTempRestTimer(opt.value === 'auto' ? null : opt.value)}
                                        className={`py-2 rounded-lg text-xs transition-all ${
                                            (opt.value === 'auto' && tempRestTimer === null) || tempRestTimer === opt.value
                                                ? `${accent.accentSolid} text-white`
                                                : `${themeClasses.hoverBg} ${themeClasses.textSecondary}`
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Warmup Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Flame className={`w-4 h-4 ${tempWarmup ? accent.accentText : themeClasses.textSecondary}`} />
                                    <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>
                                        Warmup Routine
                                    </span>
                                </div>
                                <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                                    Show warmup before workouts
                                </p>
                            </div>
                            <button
                                onClick={() => setTempWarmup(!tempWarmup)}
                                className={`relative w-12 h-7 rounded-full transition-colors ${
                                    tempWarmup ? accent.accentSolid : 'bg-slate-600'
                                }`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                    tempWarmup ? 'left-6' : 'left-1'
                                }`} />
                            </button>
                        </div>
                    </div>

                    {/* Training Goal */}
                    <div>
                        <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Training Goal</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(REP_SCHEME_CONFIGS).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handleChange('repScheme', key)}
                                    className={`p-3 rounded-lg text-left transition-all ${
                                        tempPrefs.repScheme === key
                                            ? `${accent.accentBg} border-2 ${accent.accentBorder}`
                                            : `${themeClasses.cardBg} border-2 border-transparent ${themeClasses.hoverBg}`
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{config.icon}</span>
                                        <span className={`font-medium ${themeClasses.textPrimary} text-sm`}>{config.name}</span>
                                    </div>
                                    <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                                        {config.repRange[0]}-{config.repRange[1]} reps
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Training Days per Week</label>
                        <div className="flex gap-2">
                            {TRAINING_DAYS_OPTIONS.map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleChange('trainingDaysPerWeek', num)}
                                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                        tempPrefs.trainingDaysPerWeek === num
                                            ? `${accent.accentSolid} text-white`
                                            : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferred Days */}
                    <div>
                        <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Preferred Days (optional)</label>
                        <div className="flex gap-1">
                            {daysOfWeek.map((day, idx) => (
                                <button
                                    key={day}
                                    onClick={() => togglePreferredDay(idx)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                        tempPrefs.preferredDays?.includes(idx)
                                            ? `${accent.accentSolid} text-white`
                                            : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progression Rate */}
                    <div>
                        <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Progression Speed</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(PROGRESSION_RATES).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handleChange('progressionRate', key)}
                                    className={`p-3 rounded-lg text-center transition-all ${
                                        tempPrefs.progressionRate === key
                                            ? `${accent.accentSolid} text-white`
                                            : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
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
                        className={`w-full flex items-center justify-between py-3 px-4 ${themeClasses.cardBg} rounded-lg ${themeClasses.textSecondary} ${themeClasses.hoverBg}`}
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
                                <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Program Duration (weeks)</label>
                                <div className="flex gap-2">
                                    {PROGRAM_DURATION_OPTIONS.map(weeks => (
                                        <button
                                            key={weeks}
                                            onClick={() => handleChange('programDuration', weeks)}
                                            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                                tempPrefs.programDuration === weeks
                                                    ? `${accent.accentSolid} text-white`
                                                    : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                            }`}
                                        >
                                            {weeks}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sets per Exercise */}
                            <div>
                                <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Sets per Exercise</label>
                                <div className="flex gap-2">
                                    {SETS_PER_EXERCISE_OPTIONS.map(sets => (
                                        <button
                                            key={sets}
                                            onClick={() => handleChange('setsPerExercise', sets)}
                                            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                                tempPrefs.setsPerExercise === sets
                                                    ? `${accent.accentSolid} text-white`
                                                    : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                            }`}
                                        >
                                            {sets}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Session Duration */}
                            <div>
                                <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Target Session Length</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {SESSION_DURATION_OPTIONS.map(mins => (
                                        <button
                                            key={mins}
                                            onClick={() => handleChange('targetSessionDuration', mins)}
                                            className={`py-2 rounded-lg text-sm transition-all ${
                                                tempPrefs.targetSessionDuration === mins
                                                    ? `${accent.accentSolid} text-white`
                                                    : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
                                            }`}
                                        >
                                            {mins}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rest Between Sets */}
                            <div>
                                <label className={`text-sm ${themeClasses.textSecondary} block mb-2`}>Rest Between Sets</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {restOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleChange('restBetweenSets', opt.value)}
                                            className={`py-2 rounded-lg text-sm transition-all ${
                                                tempPrefs.restBetweenSets === opt.value
                                                    ? `${accent.accentSolid} text-white`
                                                    : `${themeClasses.cardBg} ${themeClasses.textSecondary} ${themeClasses.hoverBg}`
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
                <div className={`p-4 border-t ${themeClasses.borderColor} flex gap-3`}>
                    <button
                        onClick={handleReset}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border ${themeClasses.borderColor} ${themeClasses.textSecondary} ${themeClasses.hoverBg} transition-colors`}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all ${
                            hasChanges
                                ? `${accent.accentSolid} text-white ${accent.gradientHover}`
                                : `${themeClasses.cardBg} ${themeClasses.textMuted} cursor-not-allowed`
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
