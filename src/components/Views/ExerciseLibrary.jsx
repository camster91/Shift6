import { useState, useMemo } from 'react'
import { X, Search, Plus, Check, Filter, Home, Building2 } from 'lucide-react'
import { EXERCISE_CATEGORIES } from '../../data/exercises.jsx'
import NeoIcon from '../Visuals/NeoIcon'

// Location filter options
const LOCATION_FILTERS = [
    { id: 'all', label: 'All', icon: null },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gym', label: 'Gym', icon: Building2 }
]

const ExerciseLibrary = ({
    allExercises,
    activeProgram,
    // eslint-disable-next-line no-unused-vars
    programMode,
    // eslint-disable-next-line no-unused-vars
    userEquipment,
    onAddToProgram,
    onRemoveFromProgram,
    onClose
}) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [locationFilter, setLocationFilter] = useState('all')
    const [showFilters, setShowFilters] = useState(false)

    // Helper to determine exercise location compatibility
    const getExerciseLocation = (exercise) => {
        // Check if exercise has explicit mode setting
        if (exercise.modes) {
            if (exercise.modes.includes('gym') && !exercise.modes.includes('bodyweight')) {
                return 'gym'
            }
            if (exercise.modes.includes('bodyweight') && !exercise.modes.includes('gym')) {
                return 'home'
            }
        }
        // Check equipment requirements
        if (exercise.equipment) {
            if (exercise.equipment.includes('none') || exercise.equipment.length === 0) {
                return 'home'
            }
            // Has equipment requirements - likely gym
            return 'gym'
        }
        // Default: bodyweight exercises are home-compatible
        if (exercise.progressionType === 'bodyweight' || exercise.isBuiltIn) {
            return 'home'
        }
        return 'both'
    }

    // Filter exercises - show ALL by default, apply user filters
    const filteredExercises = useMemo(() => {
        return Object.entries(allExercises).filter(([, exercise]) => {
            // Filter by location preference
            if (locationFilter !== 'all') {
                const exerciseLocation = getExerciseLocation(exercise)
                if (exerciseLocation !== 'both' && exerciseLocation !== locationFilter) {
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
    }, [allExercises, locationFilter, categoryFilter, searchQuery, activeProgram])

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
                    {/* Location Filter - Prominent */}
                    <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                        {LOCATION_FILTERS.map((loc) => {
                            const Icon = loc.icon
                            const isActive = locationFilter === loc.id
                            return (
                                <button
                                    key={loc.id}
                                    onClick={() => setLocationFilter(loc.id)}
                                    className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                        isActive
                                            ? loc.id === 'home'
                                                ? 'bg-emerald-500 text-white'
                                                : loc.id === 'gym'
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-cyan-500 text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                                >
                                    {Icon && <Icon size={16} />}
                                    {loc.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Search */}
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
                    {showFilters && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <button
                                onClick={() => setCategoryFilter('all')}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    categoryFilter === 'all'
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                All Categories
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
                    )}
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
                                const exerciseLocation = getExerciseLocation(exercise)
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
                                        {/* Location badge */}
                                        <div className="absolute top-2 left-2">
                                            {exerciseLocation === 'home' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    <Home size={10} />
                                                </span>
                                            )}
                                            {exerciseLocation === 'gym' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                    <Building2 size={10} />
                                                </span>
                                            )}
                                            {exerciseLocation === 'both' && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                                    <Home size={10} />
                                                    <Building2 size={10} />
                                                </span>
                                            )}
                                        </div>

                                        {/* Icon */}
                                        <div className="w-12 h-12 mb-3 mt-2 flex items-center justify-center">
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
