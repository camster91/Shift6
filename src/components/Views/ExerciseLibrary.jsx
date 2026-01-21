import { useState, useMemo } from 'react'
import { X, Search, Plus, Check, Filter } from 'lucide-react'
import { EXERCISE_CATEGORIES } from '../../data/exercises.jsx'
import NeoIcon from '../Visuals/NeoIcon'

const ExerciseLibrary = ({
    allExercises,
    activeProgram,
    programMode,
    userEquipment,
    onAddToProgram,
    onRemoveFromProgram,
    onClose
}) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [showFilters, setShowFilters] = useState(false)

    // Filter exercises based on program mode, equipment, category, and search
    const filteredExercises = useMemo(() => {
        return Object.entries(allExercises).filter(([, exercise]) => {
            // Filter by program mode
            if (exercise.modes && !exercise.modes.includes(programMode)) {
                return false
            }

            // Filter by equipment (user must have at least one required equipment)
            if (exercise.equipment && programMode !== 'bodyweight') {
                const hasEquipment = exercise.equipment.every(eq =>
                    eq === 'none' || userEquipment.includes(eq)
                )
                if (!hasEquipment) return false
            }

            // For bodyweight mode, only show exercises that require no equipment
            if (programMode === 'bodyweight' && exercise.equipment) {
                if (!exercise.equipment.includes('none') && !exercise.isBuiltIn) {
                    return false
                }
            }

            // Filter by category
            if (categoryFilter !== 'all' && exercise.category !== categoryFilter) {
                return false
            }

            // Filter by search
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const nameMatch = exercise.name.toLowerCase().includes(query)
                const categoryMatch = exercise.category?.toLowerCase().includes(query)
                if (!nameMatch && !categoryMatch) return false
            }

            return true
        }).sort((a, b) => {
            // Sort: in-program first, then alphabetically
            const aInProgram = activeProgram.includes(a[0])
            const bInProgram = activeProgram.includes(b[0])
            if (aInProgram && !bInProgram) return -1
            if (!aInProgram && bInProgram) return 1
            return a[1].name.localeCompare(b[1].name)
        })
    }, [allExercises, programMode, userEquipment, categoryFilter, searchQuery, activeProgram])

    const isInProgram = (key) => activeProgram.includes(key)

    const handleToggle = (key) => {
        if (isInProgram(key)) {
            onRemoveFromProgram(key)
        } else {
            onAddToProgram(key)
        }
    }

    const getColorClass = (color) => {
        const colors = {
            blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
            orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
            yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
            cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
            emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
            teal: 'from-teal-500/20 to-teal-600/10 border-teal-500/30',
            purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
            pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
            indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
            red: 'from-red-500/20 to-red-600/10 border-red-500/30',
        }
        return colors[color] || colors.cyan
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
            <div className="fixed inset-0 bg-slate-950 md:inset-4 md:rounded-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Exercise Library</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="p-4 border-b border-slate-800 space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search exercises..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg border transition-colors ${
                                showFilters || categoryFilter !== 'all'
                                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                                    : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Category Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button
                            onClick={() => setCategoryFilter('all')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                categoryFilter === 'all'
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            All
                        </button>
                        {Object.entries(EXERCISE_CATEGORIES).map(([id, cat]) => (
                            <button
                                key={id}
                                onClick={() => setCategoryFilter(id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    categoryFilter === id
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Exercise Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredExercises.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">No exercises found</p>
                            <p className="text-slate-600 text-sm mt-1">
                                Try adjusting your filters or search
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredExercises.map(([key, exercise]) => {
                                const inProgram = isInProgram(key)
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleToggle(key)}
                                        className={`relative p-4 rounded-xl border bg-gradient-to-br transition-all text-left ${
                                            inProgram
                                                ? 'border-cyan-500 ring-1 ring-cyan-500/50'
                                                : 'border-slate-700 hover:border-slate-600'
                                        } ${getColorClass(exercise.color)}`}
                                    >
                                        {/* Icon */}
                                        <div className="w-12 h-12 mb-3 flex items-center justify-center">
                                            <NeoIcon
                                                exerciseKey={key}
                                                color={exercise.color}
                                                size={48}
                                            />
                                        </div>

                                        {/* Name */}
                                        <h3 className="font-semibold text-white text-sm leading-tight mb-1">
                                            {exercise.name}
                                        </h3>

                                        {/* Category */}
                                        <p className="text-xs text-slate-400 capitalize">
                                            {exercise.category}
                                        </p>

                                        {/* Equipment badge */}
                                        {exercise.equipment && !exercise.equipment.includes('none') && (
                                            <div className="text-xs text-slate-500 mt-1 truncate">
                                                {exercise.equipment.length} equipment
                                            </div>
                                        )}

                                        {/* In Program indicator */}
                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                            inProgram
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-700 text-slate-400'
                                        }`}>
                                            {inProgram ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">
                            {activeProgram.length} exercises in your program
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExerciseLibrary
