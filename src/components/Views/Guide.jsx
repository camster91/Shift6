import { useState } from 'react'
import { Info, Clock, Target, Zap, TrendingUp, Play, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { EXERCISE_PLANS } from '../../data/exercises.jsx'
import NeoIcon from '../Visuals/NeoIcon'

// Color mapping for exercise themes
const colorClasses = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', hover: 'hover:border-blue-500/50' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', hover: 'hover:border-orange-500/50' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', hover: 'hover:border-cyan-500/50' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', hover: 'hover:border-emerald-500/50' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', hover: 'hover:border-yellow-500/50' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', hover: 'hover:border-teal-500/50' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:border-purple-500/50' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', hover: 'hover:border-pink-500/50' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', hover: 'hover:border-indigo-500/50' },
}

const VideoModal = ({ exercise, onClose }) => {
    if (!exercise) return null

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">{exercise.name} - Form Guide</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="aspect-video bg-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${exercise.youtubeId}?rel=0`}
                        title={`${exercise.name} form guide`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
                <div className="p-4 space-y-3">
                    <p className="text-sm text-slate-300">{exercise.instructions || exercise.cue}</p>
                    {exercise.tips && (
                        <div className="flex flex-wrap gap-2">
                            {exercise.tips.map((tip, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                                    {tip}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const ExerciseCard = ({ exercise, onWatchVideo }) => {
    const [expanded, setExpanded] = useState(false)
    const colors = colorClasses[exercise.color] || colorClasses.cyan

    return (
        <div className={`bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden ${colors.hover} transition-all`}>
            {/* Header with icon and name */}
            <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${colors.bg} border ${colors.border} rounded-xl flex items-center justify-center`}>
                        {exercise.image?.startsWith('neo:') ? (
                            <NeoIcon name={exercise.image.replace('neo:', '')} size={24} className={colors.text} />
                        ) : (
                            <span className={colors.text}>{exercise.icon}</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white">{exercise.name}</h3>
                        <p className="text-xs text-slate-400">{exercise.unit} | Goal: {exercise.finalGoal}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onWatchVideo(exercise) }}
                            className={`p-2 ${colors.bg} border ${colors.border} rounded-lg ${colors.hover} transition-colors`}
                            title="Watch form video"
                        >
                            <Play size={16} className={colors.text} />
                        </button>
                        {expanded ? (
                            <ChevronUp size={20} className="text-slate-400" />
                        ) : (
                            <ChevronDown size={20} className="text-slate-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                    <p className="text-sm text-slate-300">{exercise.instructions || exercise.cue}</p>

                    {exercise.tips && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tips</p>
                            <ul className="space-y-1">
                                {exercise.tips.map((tip, i) => (
                                    <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('/10', '')} mt-1.5 flex-shrink-0`} />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <a
                        href={`https://www.youtube.com/watch?v=${exercise.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 text-xs ${colors.text} hover:underline`}
                    >
                        <ExternalLink size={12} />
                        Open in YouTube
                    </a>
                </div>
            )}
        </div>
    )
}

const Guide = () => {
    const [videoExercise, setVideoExercise] = useState(null)
    const [showProtocols, setShowProtocols] = useState(false)

    return (
        <div className="space-y-6 pb-24">
            {/* Header Section */}
            <div className="relative bg-slate-900 border border-cyan-500/20 rounded-xl p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
                <div className="relative flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                        <Info size={24} className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Exercise Guide</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Form tutorials and training tips
                        </p>
                    </div>
                </div>
            </div>

            {/* Exercise Library */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider px-1">
                    All Exercises
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(EXERCISE_PLANS).map(([key, exercise]) => (
                        <ExerciseCard
                            key={key}
                            exercise={exercise}
                            onWatchVideo={setVideoExercise}
                        />
                    ))}
                </div>
            </section>

            {/* Training Protocols - Collapsible */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowProtocols(!showProtocols)}
                    className="w-full border-b border-slate-800 px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <Target size={14} />
                        Training Protocols
                    </h3>
                    {showProtocols ? (
                        <ChevronUp size={18} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                    )}
                </button>

                {showProtocols && (
                    <div className="p-6 space-y-6">
                        {[
                            { icon: <Zap size={16} />, t: "Frequency Protocol", d: "3 sessions per week per muscle group. Maintain 48-hour recovery between sessions." },
                            { icon: <TrendingUp size={16} />, t: "Five-Set Structure", d: "Each session has 5 sets. Final set is AMRAP (As Many Reps As Possible) to test your limit." },
                            { icon: <Target size={16} />, t: "Progressive Overload", d: "If you can't complete the target, repeat the session after 48 hours before advancing." },
                            { icon: <Clock size={16} />, t: "Rest Periods", d: "60 seconds rest in weeks 1-3, 90 seconds in weeks 4-6. Adjust in settings if needed." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="flex-shrink-0 w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-colors">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm mb-1">{item.t}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">{item.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Terminology Section - Collapsible */}
            <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowProtocols(p => !p)}
                    className="w-full border-b border-slate-800 px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Terminology</h3>
                    {showProtocols ? (
                        <ChevronUp size={18} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                    )}
                </button>
                {showProtocols && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { t: "Volume History", d: "Total work (reps x sets) over time. Tracks consistency and capacity." },
                                { t: "Daily Stack", d: "Exercises scheduled for today. Complete them in order." },
                                { t: "AMRAP", d: "As Many Reps As Possible. Final set to judge strength reserve." },
                                { t: "Course Progress", d: "Your journey through the 18-day program for each exercise." },
                                { t: "Baseline Test", d: "Initial assessment that sets your starting difficulty level." }
                            ].map((item, i) => (
                                <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500/30 transition-colors">
                                    <p className="font-semibold text-white text-sm mb-2">{item.t}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">{item.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Video Modal */}
            {videoExercise && (
                <VideoModal exercise={videoExercise} onClose={() => setVideoExercise(null)} />
            )}
        </div>
    )
}

export default Guide
