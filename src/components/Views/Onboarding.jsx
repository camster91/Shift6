import { useState } from 'react'
import { ChevronRight, Check, Dumbbell } from 'lucide-react'

const Onboarding = ({ programModes, equipment, templates, onComplete }) => {
    const [step, setStep] = useState(1)
    const [selectedMode, setSelectedMode] = useState(null)
    const [selectedEquipment, setSelectedEquipment] = useState(['none'])
    const [selectedTemplate, setSelectedTemplate] = useState(null)

    const totalSteps = selectedMode === 'bodyweight' ? 3 : 4

    // Calculate display step for bodyweight mode (skips step 2)
    const getDisplayStep = () => {
        if (selectedMode === 'bodyweight') {
            if (step === 1) return 1
            if (step === 3) return 2
            if (step === 4) return 3
        }
        return step
    }
    const displayStep = getDisplayStep()

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
        if (equipId === 'none') return // Can't toggle 'none'
        setSelectedEquipment(prev => {
            if (prev.includes(equipId)) {
                return prev.filter(e => e !== equipId)
            }
            return [...prev, equipId]
        })
    }

    const handleNext = () => {
        if (step === 1 && selectedMode) {
            if (selectedMode === 'bodyweight') {
                setStep(3) // Skip equipment for bodyweight
            } else {
                setStep(2)
            }
        } else if (step === 2) {
            setStep(3)
        } else if (step === 3) {
            // Find appropriate template for mode and ensure selection is valid
            const modeTemplates = Object.entries(templates).filter(([, t]) => t.mode === selectedMode)
            if (modeTemplates.length > 0 && templates[selectedTemplate]?.mode !== selectedMode) {
                // Find recommended template or use first one
                const recommended = modeTemplates.find(([, t]) => t.recommended)
                setSelectedTemplate(recommended ? recommended[0] : modeTemplates[0][0])
            }
            setStep(4)
        } else if (step === 4) {
            onComplete(selectedMode, selectedEquipment, selectedTemplate)
        }
    }

    const handleBack = () => {
        if (step === 3 && selectedMode === 'bodyweight') {
            setStep(1)
        } else {
            setStep(prev => Math.max(1, prev - 1))
        }
    }

    const canProceed = () => {
        if (step === 1) return selectedMode !== null
        if (step === 2) return true // Equipment is optional
        if (step === 3) return true
        if (step === 4) return selectedTemplate !== null
        return false
    }

    // Get templates for current mode
    const availableTemplates = Object.entries(templates).filter(([, t]) => t.mode === selectedMode)

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
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
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
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                        selectedMode === id
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
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        selectedEquipment.includes(id)
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

                {/* Step 3: Template Selection */}
                {step === 3 && (
                    <div className="w-full max-w-md space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Choose Your Program</h2>
                            <p className="text-slate-400">Start with a template or build your own</p>
                        </div>

                        <div className="space-y-3">
                            {availableTemplates.map(([id, template]) => (
                                <button
                                    key={id}
                                    onClick={() => setSelectedTemplate(id)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                        selectedTemplate === id
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-white">{template.name}</h3>
                                                {template.recommended && (
                                                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-400">{template.desc}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {template.exercises.length} exercises
                                            </p>
                                        </div>
                                        {selectedTemplate === id && (
                                            <Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && (
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
                                    {templates[selectedTemplate]?.name}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Exercises</span>
                                <span className="text-white font-medium">
                                    {templates[selectedTemplate]?.exercises.length}
                                </span>
                            </div>
                        </div>

                        <p className="text-center text-slate-500 text-sm">
                            You can always add more exercises or change your program later
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex gap-3 max-w-md mx-auto">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 py-3 px-6 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                            canProceed()
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
