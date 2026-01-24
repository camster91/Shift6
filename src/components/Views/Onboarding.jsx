import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, Check, Dumbbell, ChevronLeft, Sparkles, LayoutGrid, Wrench, Shuffle } from 'lucide-react'
import {
    REP_SCHEME_CONFIGS,
    FITNESS_LEVEL_PRESETS,
    DEFAULT_TRAINING_PREFERENCES,
    EXERCISE_PLANS
} from '../../data/exercises.jsx'
import {
    TRAINING_DAYS_OPTIONS,
    SESSION_DURATION_OPTIONS
} from '../../utils/constants.js'
import { applyFitnessLevelPreset } from '../../utils/preferences.js'
import { EXERCISE_LIBRARY, GOAL_ICONS } from '../../data/exerciseLibrary.js'
import { EXERCISES } from '../../data/exerciseDatabase.js'
import { generateSmartProgram } from '../../utils/smartProgramGenerator.js'
import TemplateCard from '../Visuals/TemplateCard'
import CustomProgramBuilder from './CustomProgramBuilder'

const Onboarding = ({ programModes, equipment, templates, onComplete }) => {
    const [step, setStep] = useState(1)
    const [selectedMode, setSelectedMode] = useState(null)
    const [selectedEquipment, setSelectedEquipment] = useState(['none'])
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [trainingPreferences, setTrainingPreferences] = useState({ ...DEFAULT_TRAINING_PREFERENCES })
    // Program selection UI state
    const [programTab, setProgramTab] = useState('generated') // 'generated' | 'templates' | 'custom'
    const [customExercises, setCustomExercises] = useState([])
    const [goalFilter, setGoalFilter] = useState('all')
    // Generated program state
    const [generatedProgram, setGeneratedProgram] = useState(null)
    const [showProgramDetails, setShowProgramDetails] = useState(false)

    // Combine all exercises for the builder
    const allExercises = useMemo(() => {
        return { ...EXERCISE_PLANS, ...EXERCISE_LIBRARY, ...EXERCISES }
    }, [])

    // Generate program when reaching step 6 or when relevant preferences change
    useEffect(() => {
        if (step === 6 && selectedMode && trainingPreferences.fitnessLevel && trainingPreferences.repScheme) {
            const program = generateSmartProgram({
                mode: selectedMode,
                equipment: selectedEquipment,
                fitnessLevel: trainingPreferences.fitnessLevel,
                goal: trainingPreferences.repScheme,
                trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek,
                sessionDuration: trainingPreferences.targetSessionDuration,
            })
            setGeneratedProgram(program)
        }
    }, [step, selectedMode, selectedEquipment, trainingPreferences])

    // Handler to regenerate with variation
    const handleRegenerateProgram = () => {
        if (!selectedMode) return
        // Generate a new program - the smart generator uses randomization internally
        const program = generateSmartProgram({
            mode: selectedMode,
            equipment: selectedEquipment,
            fitnessLevel: trainingPreferences.fitnessLevel,
            goal: trainingPreferences.repScheme,
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek,
            sessionDuration: trainingPreferences.targetSessionDuration,
        })
        setGeneratedProgram(program)
    }

    // Steps: 1=Mode, 2=Equipment (skipped for bodyweight), 3=Fitness, 4=Goal, 5=Schedule, 6=Template, 7=Confirm
    // Fitness Level now comes BEFORE Goal/Schedule so presets set the starting point
    const getStepConfig = () => {
        if (selectedMode === 'bodyweight') {
            // Skip equipment step for bodyweight
            return {
                steps: [1, 3, 4, 5, 6, 7],
                total: 6
            }
        }
        return {
            steps: [1, 2, 3, 4, 5, 6, 7],
            total: 7
        }
    }

    const stepConfig = getStepConfig()
    const displayStep = stepConfig.steps.indexOf(step) + 1
    const totalSteps = stepConfig.total

    const handleModeSelect = (mode) => {
        setSelectedMode(mode)
        if (mode === 'bodyweight') {
            setSelectedEquipment(['none'])
        }
        // Set default template for the selected mode
        const modeTemplates = Object.entries(templates).filter(([, t]) => t.mode === mode)
        if (modeTemplates.length > 0) {
            const recommended = modeTemplates.find(([, t]) => t.recommended)
            setSelectedTemplate(recommended ? recommended[0] : modeTemplates[0][0])
        }
    }

    const handleEquipmentToggle = (equipId) => {
        if (equipId === 'none') return
        setSelectedEquipment(prev => {
            if (prev.includes(equipId)) {
                return prev.filter(e => e !== equipId)
            }
            return [...prev, equipId]
        })
    }

    const handlePreferenceChange = (key, value) => {
        setTrainingPreferences(prev => ({ ...prev, [key]: value }))
    }

    const handleFitnessLevelSelect = (level) => {
        const updated = applyFitnessLevelPreset(level, trainingPreferences)
        setTrainingPreferences(updated)
    }

    const togglePreferredDay = (dayIndex) => {
        setTrainingPreferences(prev => {
            const days = prev.preferredDays || []
            if (days.includes(dayIndex)) {
                return { ...prev, preferredDays: days.filter(d => d !== dayIndex) }
            }
            return { ...prev, preferredDays: [...days, dayIndex].sort((a, b) => a - b) }
        })
    }

    const handleNext = () => {
        const nextStepIndex = stepConfig.steps.indexOf(step) + 1
        if (nextStepIndex < stepConfig.steps.length) {
            const nextStep = stepConfig.steps[nextStepIndex]
            // Ensure template is valid for mode when reaching template step
            if (nextStep === 6) {
                const modeTemplates = Object.entries(templates).filter(([, t]) => t.mode === selectedMode)
                if (modeTemplates.length > 0 && templates[selectedTemplate]?.mode !== selectedMode) {
                    const recommended = modeTemplates.find(([, t]) => t.recommended)
                    setSelectedTemplate(recommended ? recommended[0] : modeTemplates[0][0])
                }
            }
            setStep(nextStep)
        } else {
            // Final step - complete onboarding
            try {
                if (programTab === 'generated' && generatedProgram?.exercises?.length > 0) {
                    // Use AI-generated program
                    onComplete(selectedMode, selectedEquipment, null, trainingPreferences, generatedProgram.exercises)
                } else if (programTab === 'custom' && customExercises.length > 0) {
                    // Use custom-built program
                    onComplete(selectedMode, selectedEquipment, null, trainingPreferences, customExercises)
                } else if (selectedTemplate) {
                    // Use template
                    onComplete(selectedMode, selectedEquipment, selectedTemplate, trainingPreferences)
                } else {
                    // Fallback - use default template
                    onComplete(selectedMode, selectedEquipment, 'shift6-classic', trainingPreferences)
                }
            } catch (error) {
                console.error('Onboarding completion error:', error)
                // Fallback to default
                onComplete(selectedMode, selectedEquipment, 'shift6-classic', trainingPreferences)
            }
        }
    }

    const handleBack = () => {
        const currentIndex = stepConfig.steps.indexOf(step)
        if (currentIndex > 0) {
            setStep(stepConfig.steps[currentIndex - 1])
        }
    }

    const canProceed = () => {
        switch (step) {
            case 1: return selectedMode !== null
            case 2: return true // Equipment is optional
            case 3: return trainingPreferences.fitnessLevel !== null // Fitness Level
            case 4: return trainingPreferences.repScheme !== null // Training Goal
            case 5: return trainingPreferences.trainingDaysPerWeek >= 2 // Schedule
            case 6: {
                if (programTab === 'generated') {
                    return generatedProgram?.exercises?.length >= 3
                }
                if (programTab === 'custom') {
                    return customExercises.length >= 3
                }
                return selectedTemplate !== null
            }
            case 7: return true
            default: return false
        }
    }

    // Get the final program exercises
    const getFinalExercises = () => {
        if (programTab === 'generated') {
            return generatedProgram?.exercises || []
        }
        if (programTab === 'custom') {
            return customExercises
        }
        return templates[selectedTemplate]?.exercises || []
    }

    // Get final program name
    const getFinalProgramName = () => {
        if (programTab === 'generated') {
            return generatedProgram?.name || 'Custom Program'
        }
        if (programTab === 'custom') {
            return 'Custom Program'
        }
        return templates[selectedTemplate]?.name || 'Selected Template'
    }

    // Get templates for current mode
    const availableTemplates = Object.entries(templates).filter(([, t]) => t.mode === selectedMode)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
            {/* Progress Bar */}
            <div className="p-4">
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${(displayStep / totalSteps) * 100}%` }}
                    />
                </div>
                <div className="text-center text-slate-500 text-sm mt-2">
                    Step {displayStep} of {totalSteps}
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 flex flex-col items-center p-6 overflow-y-auto ${step === 6 && programTab === 'custom' ? 'justify-start pt-4' : 'justify-center'
                }`}>
                {/* Step 1: Welcome & Mode Selection */}
                {step === 1 && (
                    <div className="w-full max-w-md space-y-8 animate-fadeIn">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                                <Dumbbell className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Welcome to Shift6</h1>
                            <p className="text-slate-400">6 weeks to transform your fitness</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-slate-300 text-center mb-4">Choose your training style:</p>

                            {Object.entries(programModes).map(([id, mode]) => (
                                <button
                                    key={id}
                                    onClick={() => handleModeSelect(id)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedMode === id
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">{mode.icon}</span>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{mode.name}</h3>
                                            <p className="text-sm text-slate-400">{mode.desc}</p>
                                        </div>
                                        {selectedMode === id && (
                                            <Check className="w-5 h-5 text-cyan-500" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Equipment Selection */}
                {step === 2 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">What equipment do you have?</h2>
                            <p className="text-slate-400">Select all that apply (you can change this later)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(equipment).filter(([id]) => id !== 'none').map(([id, equip]) => (
                                <button
                                    key={id}
                                    onClick={() => handleEquipmentToggle(id)}
                                    className={`p-4 rounded-xl border-2 transition-all relative ${selectedEquipment.includes(id)
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="text-center">
                                        <span className="text-2xl block mb-1">{equip.icon}</span>
                                        <span className="text-sm text-slate-300">{equip.name}</span>
                                    </div>
                                    {selectedEquipment.includes(id) && (
                                        <Check className="w-4 h-4 text-cyan-500 absolute top-2 right-2" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <p className="text-center text-slate-500 text-sm">
                            No equipment? No problem - bodyweight exercises work great too!
                        </p>
                    </div>
                )}

                {/* Step 3: Fitness Level (comes first to set smart defaults) */}
                {step === 3 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Your Fitness Level</h2>
                            <p className="text-slate-400">We will set smart defaults based on your experience</p>
                        </div>

                        <div className="space-y-3">
                            {Object.entries(FITNESS_LEVEL_PRESETS).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => handleFitnessLevelSelect(key)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${trainingPreferences.fitnessLevel === key
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">{preset.icon}</span>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{preset.name}</h3>
                                            <p className="text-sm text-slate-400">{preset.desc}</p>
                                        </div>
                                        {trainingPreferences.fitnessLevel === key && (
                                            <Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-2">
                                <Sparkles className="w-4 h-4" />
                                <span>This sets recommended defaults you can customize next</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Training Goal (Rep Scheme) */}
                {step === 4 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">What is Your Goal?</h2>
                            <p className="text-slate-400">We will customize your rep ranges and rest times</p>
                        </div>

                        <div className="space-y-3">
                            {Object.entries(REP_SCHEME_CONFIGS).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => handlePreferenceChange('repScheme', key)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${trainingPreferences.repScheme === key
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">{config.icon}</span>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{config.name}</h3>
                                            <p className="text-sm text-slate-400">{config.desc}</p>
                                            <p className="text-xs text-cyan-400 mt-1">
                                                {config.repRange[0]}-{config.repRange[1]} reps • {config.restSeconds}s rest
                                            </p>
                                        </div>
                                        {trainingPreferences.repScheme === key && (
                                            <Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5: Schedule Configuration */}
                {step === 5 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Your Schedule</h2>
                            <p className="text-slate-400">How often can you train?</p>
                        </div>

                        {/* Days per week */}
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">Training Days per Week</label>
                            <div className="flex justify-between gap-2">
                                {TRAINING_DAYS_OPTIONS.map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handlePreferenceChange('trainingDaysPerWeek', num)}
                                        className={`flex-1 py-3 rounded-lg font-semibold transition-all ${trainingPreferences.trainingDaysPerWeek === num
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preferred days */}
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">Preferred Days (optional)</label>
                            <div className="flex gap-2">
                                {daysOfWeek.map((day, idx) => (
                                    <button
                                        key={day}
                                        onClick={() => togglePreferredDay(idx)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${trainingPreferences.preferredDays?.includes(idx)
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Leave empty to train any day (except Sunday)</p>
                        </div>

                        {/* Session duration */}
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">Target Session Length</label>
                            <div className="grid grid-cols-5 gap-2">
                                {SESSION_DURATION_OPTIONS.map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => handlePreferenceChange('targetSessionDuration', mins)}
                                        className={`py-2 rounded-lg text-sm transition-all ${trainingPreferences.targetSessionDuration === mins
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 6: Program Selection - Generated, Templates, or Custom */}
                {step === 6 && (
                    <div className="w-full max-w-lg space-y-4 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Your Program</h2>
                            <p className="text-slate-400">Personalized based on your preferences</p>
                        </div>

                        {/* Tab Toggle */}
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setProgramTab('generated')}
                                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${programTab === 'generated'
                                        ? 'bg-cyan-500 text-white'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Sparkles className="w-3 h-3" />
                                For You
                            </button>
                            <button
                                onClick={() => setProgramTab('templates')}
                                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${programTab === 'templates'
                                        ? 'bg-cyan-500 text-white'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <LayoutGrid className="w-3 h-3" />
                                Templates
                            </button>
                            <button
                                onClick={() => setProgramTab('custom')}
                                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${programTab === 'custom'
                                        ? 'bg-cyan-500 text-white'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Wrench className="w-3 h-3" />
                                Custom
                            </button>
                        </div>

                        {/* Generated Program Tab */}
                        {programTab === 'generated' && (
                            generatedProgram ? (
                                <div className="space-y-4">
                                    {/* Program Summary Card */}
                                    <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{generatedProgram.name}</h3>
                                                <p className="text-cyan-300 text-sm">{generatedProgram.metadata?.splitName} Split</p>
                                            </div>
                                            <button
                                                onClick={handleRegenerateProgram}
                                                className="p-2 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                                                title="Generate different exercises"
                                            >
                                                <Shuffle className="w-4 h-4 text-cyan-400" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                                <div className="text-lg font-bold text-white">{generatedProgram.exercises?.length || 0}</div>
                                                <div className="text-xs text-slate-400">Exercises</div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                                <div className="text-lg font-bold text-white">{trainingPreferences.trainingDaysPerWeek}x</div>
                                                <div className="text-xs text-slate-400">Per Week</div>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                                <div className="text-lg font-bold text-white">~{generatedProgram.metadata?.estimatedSessionDuration || trainingPreferences.targetSessionDuration}m</div>
                                                <div className="text-xs text-slate-400">Per Session</div>
                                            </div>
                                        </div>

                                        {/* Exercise Preview */}
                                        <div>
                                            <button
                                                onClick={() => setShowProgramDetails(!showProgramDetails)}
                                                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 mb-2"
                                            >
                                                <span>{showProgramDetails ? 'Hide' : 'Show'} Exercises</span>
                                                <ChevronRight className={`w-4 h-4 transition-transform ${showProgramDetails ? 'rotate-90' : ''}`} />
                                            </button>

                                            {showProgramDetails && (
                                                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                                                    {generatedProgram.exercises?.map((exKey, index) => {
                                                        const exercise = allExercises[exKey]
                                                        return (
                                                            <div
                                                                key={exKey}
                                                                className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2"
                                                            >
                                                                <span className="text-xs text-slate-500 w-5">{index + 1}.</span>
                                                                <span className="flex-1 text-sm text-white">{exercise?.name || exKey}</span>
                                                                <span className="text-xs text-slate-400 capitalize">{exercise?.category}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Why these exercises */}
                                    <div className="bg-slate-800/50 rounded-xl p-4">
                                        <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-cyan-400" />
                                            Why these exercises?
                                        </h4>
                                        <ul className="text-sm text-slate-400 space-y-1">
                                            <li>Matched to your {trainingPreferences.fitnessLevel} fitness level</li>
                                            <li>Optimized for {REP_SCHEME_CONFIGS[trainingPreferences.repScheme]?.name?.toLowerCase() || 'your goals'}</li>
                                            <li>Balanced across all major muscle groups</li>
                                            <li>Fits your {trainingPreferences.targetSessionDuration} minute sessions</li>
                                        </ul>
                                    </div>

                                    <p className="text-center text-slate-500 text-xs">
                                        Not quite right? Try the shuffle button or build your own
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center animate-fadeIn">
                                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wrench className="w-6 h-6 text-red-400" />
                                    </div>
                                    <h3 className="text-red-400 font-bold mb-2">Unable to Generate Program</h3>
                                    <p className="text-slate-400 text-sm mb-4">
                                        We couldn't find enough exercises with your current settings. This usually happens when 'Gym' mode is selected without available equipment.
                                    </p>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-sm transition-colors border border-slate-700"
                                        >
                                            Update Equipment
                                        </button>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-sm transition-colors border border-slate-700"
                                        >
                                            Change Mode
                                        </button>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Templates Tab */}
                        {programTab === 'templates' && (
                            <div className="space-y-4">
                                {/* Goal Filter */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setGoalFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${goalFilter === 'all'
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
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${goalFilter === goal
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
                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                                    {/* Always show selected template first if it doesn't match filter */}
                                    {selectedTemplate &&
                                        goalFilter !== 'all' &&
                                        templates[selectedTemplate]?.goal !== goalFilter && (
                                            <div className="pb-2 mb-2 border-b border-slate-700">
                                                <p className="text-xs text-slate-500 mb-2">Currently selected:</p>
                                                <TemplateCard
                                                    template={templates[selectedTemplate]}
                                                    selected={true}
                                                    onSelect={setSelectedTemplate}
                                                    showPreview={true}
                                                    allExercises={allExercises}
                                                />
                                            </div>
                                        )}
                                    {availableTemplates
                                        .filter(([, t]) => goalFilter === 'all' || t.goal === goalFilter)
                                        .map(([id, template]) => (
                                            <TemplateCard
                                                key={id}
                                                template={template}
                                                selected={selectedTemplate === id}
                                                onSelect={setSelectedTemplate}
                                                showPreview={true}
                                                allExercises={allExercises}
                                            />
                                        ))}
                                    {availableTemplates.filter(([, t]) => goalFilter === 'all' || t.goal === goalFilter).length === 0 && (
                                        <p className="text-center text-slate-500 py-4">
                                            No templates match this filter
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Custom Builder Tab */}
                        {programTab === 'custom' && (
                            <CustomProgramBuilder
                                selectedExercises={customExercises}
                                onExercisesChange={setCustomExercises}
                                programMode={selectedMode}
                                userEquipment={selectedEquipment}
                                allExercises={allExercises}
                                maxExercises={15}
                                minExercises={3}
                            />
                        )}
                    </div>
                )}

                {/* Step 7: Confirmation */}
                {step === 7 && (
                    <div className="w-full max-w-md space-y-8 animate-fadeIn">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">You are all set!</h2>
                            <p className="text-slate-400">Your personalized program is ready</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Mode</span>
                                <span className="text-white font-medium">
                                    {programModes[selectedMode]?.name}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Program</span>
                                <span className="text-white font-medium">
                                    {getFinalProgramName()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Training Goal</span>
                                <span className="text-white font-medium">
                                    {REP_SCHEME_CONFIGS[trainingPreferences.repScheme]?.name}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Schedule</span>
                                <span className="text-white font-medium">
                                    {trainingPreferences.trainingDaysPerWeek}x/week • {trainingPreferences.programDuration} weeks
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Exercises</span>
                                <span className="text-white font-medium">
                                    {getFinalExercises().length}
                                </span>
                            </div>
                        </div>

                        <p className="text-center text-slate-500 text-sm">
                            You can adjust all settings anytime in the app
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex gap-3 max-w-md mx-auto">
                    {displayStep > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 py-3 px-6 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${canProceed()
                                ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        {displayStep === totalSteps ? 'Start Training' : 'Continue'}
                        {displayStep < totalSteps && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}

export default Onboarding
