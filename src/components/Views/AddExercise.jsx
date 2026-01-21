import { useState } from 'react'
import { X, Plus, Dumbbell } from 'lucide-react'
import { EXERCISE_CATEGORIES, EXERCISE_COLORS, generateProgression } from '../../data/exercises.jsx'

const AddExercise = ({ onAdd, onClose }) => {
    const [name, setName] = useState('')
    const [category, setCategory] = useState('push')
    const [color, setColor] = useState('cyan')
    const [unit, setUnit] = useState('reps')
    const [startReps, setStartReps] = useState(10)
    const [finalGoal, setFinalGoal] = useState(50)
    const [instructions, setInstructions] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim()) return

        // Generate a unique key from the name
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '')

        // Generate 6-week progression
        const weeks = generateProgression(startReps, finalGoal, unit)

        const newExercise = {
            key,
            name: name.trim(),
            color,
            unit,
            finalGoal: `${finalGoal} ${unit === 'seconds' ? 'Seconds' : 'Reps'}`,
            image: `neo:${key}`,
            instructions: instructions.trim() || `Complete ${name} with proper form.`,
            tips: [],
            category,
            variations: [],
            weeks,
            isCustom: true
        }

        onAdd(newExercise)
        onClose()
    }

    const colorClasses = {
        blue: 'bg-blue-500',
        orange: 'bg-orange-500',
        cyan: 'bg-cyan-500',
        emerald: 'bg-emerald-500',
        yellow: 'bg-yellow-500',
        teal: 'bg-teal-500',
        purple: 'bg-purple-500',
        pink: 'bg-pink-500',
        indigo: 'bg-indigo-500',
        red: 'bg-red-500',
        amber: 'bg-amber-500',
        lime: 'bg-lime-500'
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                            <Plus className="text-cyan-400" size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Add Exercise</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-5">
                    {/* Exercise Name */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Exercise Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Burpees"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Category
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {Object.entries(EXERCISE_CATEGORIES).map(([key, cat]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCategory(key)}
                                    className={`p-3 rounded-lg border text-center transition-all ${
                                        category === key
                                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                                >
                                    <span className="text-lg">{cat.icon}</span>
                                    <p className="text-xs mt-1">{cat.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {EXERCISE_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full ${colorClasses[c]} ${
                                        color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Unit */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Unit
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['reps', 'reps/leg', 'seconds'].map((u) => (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => setUnit(u)}
                                    className={`p-3 rounded-lg border text-sm transition-all ${
                                        unit === u
                                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                                >
                                    {u}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Starting Point */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                                Start {unit === 'seconds' ? 'Seconds' : 'Reps'}
                            </label>
                            <input
                                type="number"
                                value={startReps}
                                onChange={(e) => setStartReps(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                                Final Goal
                            </label>
                            <input
                                type="number"
                                value={finalGoal}
                                onChange={(e) => setFinalGoal(Math.max(startReps + 1, parseInt(e.target.value) || startReps + 1))}
                                min={startReps + 1}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    {/* Instructions (optional) */}
                    <div>
                        <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                            Instructions (optional)
                        </label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="How to perform this exercise..."
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                        />
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]}/20 border border-${color}-500/30 flex items-center justify-center`}>
                                <Dumbbell className={`text-${color}-400`} size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-white">{name || 'Exercise Name'}</p>
                                <p className="text-xs text-slate-400">
                                    {startReps} → {finalGoal} {unit} over 6 weeks
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Plus size={18} />
                        Add Exercise
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AddExercise
