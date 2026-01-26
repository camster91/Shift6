import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, Check, Dumbbell, ChevronLeft, Sparkles, LayoutGrid, Wrench, Shuffle, Clock, Home } from 'lucide-react'
import {
    REP_SCHEME_CONFIGS,
    FITNESS_LEVEL_PRESETS,
    DEFAULT_TRAINING_PREFERENCES,
    EXERCISE_PLANS
} from '../../data/exercises.jsx'
import {
    TRAINING_DAYS_OPTIONS,
    EXPRESS_MODE_CONFIG
} from '../../utils/constants.js'
import { applyFitnessLevelPreset } from '../../utils/preferences.js'
import { EXERCISE_LIBRARY, GOAL_ICONS } from '../../data/exerciseLibrary.js'
import { generateSmartProgram } from '../../utils/smartProgramGenerator.js'
import { detectPersona, getPersonaDefaults } from '../../utils/personas.js'
import TemplateCard from '../Visuals/TemplateCard'
import CustomProgramBuilder from './CustomProgramBuilder'

// Time options for the first question
const TIME_OPTIONS = [
    { id: 'express', label: '10-15 minutes', sublabel: 'Quick & efficient', icon: '⚡', duration: 10 },
    { id: 'short', label: '20-30 minutes', sublabel: 'Focused sessions', icon: '🎯', duration: 25 },
    { id: 'medium', label: '30-45 minutes', sublabel: 'Balanced workout', icon: '💪', duration: 35 },
    { id: 'long', label: '45+ minutes', sublabel: 'Comprehensive training', icon: '🏆', duration: 50 }
]

// Training setup options - Calisthenics focused
const SETUP_OPTIONS = [
    { id: 'minimal', label: 'Minimal Setup', sublabel: 'No equipment needed', icon: Home, equipment: ['none'] },
    { id: 'basic', label: 'Basic Setup', sublabel: 'Pull-up bar + dip station', icon: Dumbbell, equipment: ['pullupBar', 'dipBars'] },
]

const Onboarding = ({ equipment, templates, onComplete }) => {
    // Steps: 1=Time, 2=Location, 3=Equipment (conditional), 4=Fitness, 5=Goal, 6=Schedule, 7=Program, 8=Confirm
    const [step, setStep] = useState(1)

    // User selections
    const [selectedTime, setSelectedTime] = useState(null)
    const [selectedMode, setSelectedMode] = useState('bodyweight') // Always bodyweight for calisthenics
    const [selectedSetup, setSelectedSetup] = useState(null)
    const [selectedEquipment, setSelectedEquipment] = useState(['none'])
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [trainingPreferences, setTrainingPreferences] = useState({ ...DEFAULT_TRAINING_PREFERENCES })

    // Program selection UI state
    const [programTab, setProgramTab] = useState('generated')
    const [customExercises, setCustomExercises] = useState([])
    const [goalFilter, setGoalFilter] = useState('all')

    // Generated program state
    const [generatedProgram, setGeneratedProgram] = useState(null)
    const [showProgramDetails, setShowProgramDetails] = useState(false)

    // Combine all exercises for the builder
    const allExercises = useMemo(() => {
        return { ...EXERCISE_PLANS, ...EXERCISE_LIBRARY }
    }, [])

    // Auto-detect persona based on user selections
    const detectedPersona = useMemo(() => {
        return detectPersona({
            programMode: selectedMode,
            targetSessionDuration: selectedTime ? TIME_OPTIONS.find(t => t.id === selectedTime)?.duration : 30,
            fitnessLevel: trainingPreferences.fitnessLevel,
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek,
            repScheme: trainingPreferences.repScheme,
            expressMode: selectedTime === 'express'
        })
    }, [selectedMode, selectedTime, trainingPreferences.fitnessLevel, trainingPreferences.trainingDaysPerWeek, trainingPreferences.repScheme])

    // Determine which steps to show based on selections
    const getSteps = () => {
        // Express mode users get a shortened flow
        if (selectedTime === 'express') {
            return [1, 6, 7, 8] // Time → Schedule → Program → Confirm
        }
        // Minimal setup skips equipment selection, basic setup shows it to customize
        if (selectedSetup === 'minimal') {
            return [1, 2, 4, 5, 6, 7, 8]
        }
        // Basic setup shows equipment step to let users customize
        return [1, 2, 3, 4, 5, 6, 7, 8]
    }

    const steps = getSteps()
    const currentStepIndex = steps.indexOf(step)
    const totalSteps = steps.length
    const displayStep = currentStepIndex + 1

    // Generate program when reaching step 7
    useEffect(() => {
        if (step === 7 && selectedMode) {
            const timeOption = TIME_OPTIONS.find(t => t.id === selectedTime)
            const program = generateSmartProgram({
                mode: selectedMode,
                equipment: selectedEquipment,
                fitnessLevel: trainingPreferences.fitnessLevel || 'beginner',
                goal: trainingPreferences.repScheme || 'balanced',
                trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek,
                sessionDuration: timeOption?.duration || 30,
            })
            setGeneratedProgram(program)
        }
    }, [step, selectedMode, selectedEquipment, trainingPreferences, selectedTime])

    // Handler to regenerate with variation
    const handleRegenerateProgram = () => {
        if (!selectedMode) return
        const timeOption = TIME_OPTIONS.find(t => t.id === selectedTime)
        const program = generateSmartProgram({
            mode: selectedMode,
            equipment: selectedEquipment,
            fitnessLevel: trainingPreferences.fitnessLevel || 'beginner',
            goal: trainingPreferences.repScheme || 'balanced',
            trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek,
            sessionDuration: timeOption?.duration || 30,
        })
        setGeneratedProgram(program)
    }

    const handleTimeSelect = (timeId) => {
        setSelectedTime(timeId)
        const timeOption = TIME_OPTIONS.find(t => t.id === timeId)

        // Set session duration
        setTrainingPreferences(prev => ({
            ...prev,
            targetSessionDuration: timeOption?.duration || 30
        }))

        // Express mode auto-configures many settings
        if (timeId === 'express') {
            setSelectedMode('bodyweight')
            setSelectedEquipment(['none'])
            setTrainingPreferences(prev => ({
                ...prev,
                expressMode: true,
                setsPerExercise: EXPRESS_MODE_CONFIG.sets,
                restBetweenSets: EXPRESS_MODE_CONFIG.restBetweenSets,
                targetSessionDuration: EXPRESS_MODE_CONFIG.targetDuration,
                fitnessLevel: 'beginner',
                repScheme: 'endurance'
            }))
        }
    }

    const handleSetupSelect = (setupId) => {
        setSelectedSetup(setupId)
        // Set equipment based on selected setup
        const setupOption = SETUP_OPTIONS.find(o => o.id === setupId)
        if (setupOption?.equipment) {
            setSelectedEquipment(setupOption.equipment)
        } else {
            setSelectedEquipment(['none'])
        }
        // Set default template for bodyweight
        const modeTemplates = Object.entries(templates).filter(([, t]) => t.mode === 'bodyweight')
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
        const nextIndex = currentStepIndex + 1
        if (nextIndex < steps.length) {
            const nextStep = steps[nextIndex]
            // Ensure template is valid for mode when reaching template step
            if (nextStep === 7) {
                const modeTemplates = Object.entries(templates).filter(([, t]) => t.mode === selectedMode)
                if (modeTemplates.length > 0 && templates[selectedTemplate]?.mode !== selectedMode) {
                    const recommended = modeTemplates.find(([, t]) => t.recommended)
                    setSelectedTemplate(recommended ? recommended[0] : modeTemplates[0][0])
                }
            }
            setStep(nextStep)
        } else {
            // Final step - complete onboarding
            const timeOption = TIME_OPTIONS.find(t => t.id === selectedTime)

            // Apply persona defaults for detected persona
            const personaDefaults = getPersonaDefaults(detectedPersona)

            const finalPreferences = {
                ...trainingPreferences,
                ...personaDefaults,
                // Override with user selections
                targetSessionDuration: timeOption?.duration || trainingPreferences.targetSessionDuration,
                fitnessLevel: trainingPreferences.fitnessLevel || personaDefaults.fitnessLevel,
                repScheme: trainingPreferences.repScheme || personaDefaults.repScheme,
                trainingDaysPerWeek: trainingPreferences.trainingDaysPerWeek,
                preferredDays: trainingPreferences.preferredDays,
                persona: detectedPersona,
                expressMode: selectedTime === 'express'
            }

            try {
                if (programTab === 'generated' && generatedProgram?.exercises?.length > 0) {
                    onComplete(selectedMode, selectedEquipment, null, finalPreferences, generatedProgram.exercises)
                } else if (programTab === 'custom' && customExercises.length > 0) {
                    onComplete(selectedMode, selectedEquipment, null, finalPreferences, customExercises)
                } else if (selectedTemplate) {
                    onComplete(selectedMode, selectedEquipment, selectedTemplate, finalPreferences)
                } else {
                    onComplete(selectedMode, selectedEquipment, 'shift6-classic', finalPreferences)
                }
            } catch (error) {
                console.error('Onboarding completion error:', error)
                onComplete(selectedMode, selectedEquipment, 'shift6-classic', finalPreferences)
            }
        }
    }

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setStep(steps[currentStepIndex - 1])
        }
    }

    const canProceed = () => {
        switch (step) {
            case 1: return selectedTime !== null
            case 2: return selectedMode !== null
            case 3: return true // Equipment is optional
            case 4: return trainingPreferences.fitnessLevel !== null
            case 5: return trainingPreferences.repScheme !== null
            case 6: return trainingPreferences.trainingDaysPerWeek >= 2
            case 7: {
                const minExercises = selectedTime === 'express' ? 2 : 3
                if (programTab === 'generated') {
                    return generatedProgram?.exercises?.length >= minExercises
                }
                if (programTab === 'custom') {
                    return customExercises.length >= minExercises
                }
                return selectedTemplate !== null
            }
            case 8: return true
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
            <div className={`flex-1 flex flex-col items-center p-6 overflow-y-auto ${step === 7 && programTab === 'custom' ? 'justify-start pt-4' : 'justify-center'}`}>

                {/* Step 1: How much time do you have? */}
                {step === 1 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                                <Dumbbell className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Welcome to Shift6</h1>
                            <p className="text-slate-400">How much time do you have for workouts?</p>
                        </div>

                        <div className="space-y-3">
                            {TIME_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => handleTimeSelect(option.id)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedTime === option.id
                                        ? 'border-cyan-500 bg-cyan-500/10'
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl">{option.icon}</span>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-white">{option.label}</h3>
                                            <p className="text-sm text-slate-400">{option.sublabel}</p>
                                        </div>
                                        {selectedTime === option.id && (
                                            <Check className="w-5 h-5 text-cyan-500" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <p className="text-center text-slate-500 text-xs">
                            Your program will be customized based on your available time
                        </p>
                    </div>
                )}

                {/* Step 2: Where will you work out? */}
                {step === 2 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">What equipment do you have?</h2>
                            <p className="text-slate-400">Select your training setup</p>
                        </div>

                        <div className="space-y-3">
                            {SETUP_OPTIONS.map((option) => {
                                const Icon = option.icon
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleSetupSelect(option.id)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedSetup === option.id
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedSetup === option.id ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
                                                <Icon className={`w-6 h-6 ${selectedSetup === option.id ? 'text-cyan-400' : 'text-slate-400'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-white">{option.label}</h3>
                                                <p className="text-sm text-slate-400">{option.sublabel}</p>
                                            </div>
                                            {selectedSetup === option.id && (
                                                <Check className="w-5 h-5 text-cyan-500" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Equipment Selection */}
                {step === 3 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">What equipment do you have?</h2>
                            <p className="text-slate-400">Select all that apply</p>
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
                            Don't have equipment yet? No problem - we'll include bodyweight alternatives
                        </p>
                    </div>
                )}

                {/* Step 4: Fitness Level */}
                {step === 4 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">What's your experience level?</h2>
                            <p className="text-slate-400">Be honest - we'll scale everything appropriately</p>
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
                    </div>
                )}

                {/* Step 5: Training Goal */}
                {step === 5 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">What's your main goal?</h2>
                            <p className="text-slate-400">This affects your rep ranges and rest times</p>
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

                {/* Step 6: Schedule Configuration */}
                {step === 6 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Your Training Schedule</h2>
                            <p className="text-slate-400">How often can you train?</p>
                        </div>

                        {/* Days per week */}
                        <div>
                            <label className="text-sm text-slate-400 block mb-2">Days per week</label>
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
                            <label className="text-sm text-slate-400 block mb-2">Which days work best? (optional)</label>
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
                            <p className="text-xs text-slate-500 mt-2">Leave empty to train any day</p>
                        </div>

                        {/* Express mode indicator */}
                        {selectedTime === 'express' && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
                                <Clock className="w-5 h-5 text-yellow-400" />
                                <div>
                                    <p className="text-yellow-400 font-medium text-sm">Express Mode Active</p>
                                    <p className="text-slate-400 text-xs">Quick 10-15 minute workouts optimized for your schedule</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 7: Program Selection */}
                {step === 7 && (
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
                                                <div className="text-lg font-bold text-white">~{TIME_OPTIONS.find(t => t.id === selectedTime)?.duration || 30}m</div>
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
                                </div>
                            ) : (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Wrench className="w-6 h-6 text-red-400" />
                                    </div>
                                    <h3 className="text-red-400 font-bold mb-2">Unable to Generate Program</h3>
                                    <p className="text-slate-400 text-sm mb-4">
                                        Try selecting different equipment or changing your workout location.
                                    </p>
                                </div>
                            )
                        )}

                        {/* Templates Tab */}
                        {programTab === 'templates' && (
                            <div className="space-y-4">
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

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
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

                {/* Step 8: Confirmation */}
                {step === 8 && (
                    <div className="w-full max-w-md space-y-8 animate-fadeIn">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">You're all set!</h2>
                            <p className="text-slate-400">Your personalized program is ready</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Session Length</span>
                                <span className="text-white font-medium">
                                    {TIME_OPTIONS.find(t => t.id === selectedTime)?.label}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Setup</span>
                                <span className="text-white font-medium">
                                    {SETUP_OPTIONS.find(o => o.id === selectedSetup)?.label || 'Minimal Setup'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Program</span>
                                <span className="text-white font-medium">
                                    {getFinalProgramName()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Goal</span>
                                <span className="text-white font-medium">
                                    {REP_SCHEME_CONFIGS[trainingPreferences.repScheme]?.name || 'Balanced'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Schedule</span>
                                <span className="text-white font-medium">
                                    {trainingPreferences.trainingDaysPerWeek}x per week
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
                            You can adjust all settings anytime in the menu
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
