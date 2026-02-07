import { useState, useEffect, memo } from 'react'
import { Trophy, TrendingUp, Zap, X, ArrowRight } from 'lucide-react'
import ShareButton from '../Visuals/ShareButton'
import { buildWorkoutShareText } from '../../utils/sharing'
import { ConfettiBurst } from '../Visuals/Confetti'

/**
 * WorkoutSummary - Post-workout celebration and stats summary.
 * Shows total volume, set count, personal records, and share option.
 */
const WorkoutSummary = memo(({ summary, onClose, theme = 'dark' }) => {
    const [showConfetti, setShowConfetti] = useState(false)
    const [animStage, setAnimStage] = useState(0)

    useEffect(() => {
        if (!summary) return
        const timers = [
            setTimeout(() => setAnimStage(1), 100),
            setTimeout(() => setAnimStage(2), 400),
            setTimeout(() => setAnimStage(3), 700),
            setTimeout(() => setShowConfetti(true), 200),
        ]
        return () => timers.forEach(t => clearTimeout(t))
    }, [summary])

    if (!summary) return null

    const bgColor = theme === 'light' ? 'bg-white' : 'bg-slate-900'
    const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
    const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
    const cardBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800'

    const shareData = buildWorkoutShareText({
        exerciseName: summary.exerciseName,
        volume: summary.totalVolume,
        unit: summary.unit,
        sets: summary.setsCompleted
    })

    return (
        <>
            <ConfettiBurst active={showConfetti} onComplete={() => setShowConfetti(false)} />

            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className={`w-full max-w-sm ${bgColor} rounded-2xl shadow-2xl border ${
                        theme === 'light' ? 'border-slate-200' : 'border-cyan-500/20'
                    } overflow-hidden transform transition-all duration-500 ${
                        animStage > 0 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                    }`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-center relative">
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/20 transition-colors"
                            aria-label="Close summary"
                        >
                            <X size={18} className="text-white/80" />
                        </button>
                        <div className={`transform transition-all duration-500 ${
                            animStage >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                        }`}>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trophy size={32} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Workout Complete!</h2>
                            <p className="text-cyan-100 text-sm mt-1">{summary.exerciseName}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className={`p-5 space-y-4 transform transition-all duration-500 delay-200 ${
                        animStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                        <div className="grid grid-cols-3 gap-3">
                            <div className={`${cardBg} rounded-xl p-3 text-center`}>
                                <p className="text-2xl font-bold text-cyan-400">{summary.totalVolume}</p>
                                <p className={`text-[10px] ${textSecondary} uppercase`}>
                                    {summary.unit === 'seconds' ? 'Seconds' : 'Reps'}
                                </p>
                            </div>
                            <div className={`${cardBg} rounded-xl p-3 text-center`}>
                                <p className="text-2xl font-bold text-emerald-400">{summary.setsCompleted}</p>
                                <p className={`text-[10px] ${textSecondary} uppercase`}>Sets</p>
                            </div>
                            <div className={`${cardBg} rounded-xl p-3 text-center`}>
                                <p className="text-2xl font-bold text-orange-400">
                                    {summary.dayNumber}/{summary.totalDays}
                                </p>
                                <p className={`text-[10px] ${textSecondary} uppercase`}>Progress</p>
                            </div>
                        </div>

                        {/* Personal Record indicator */}
                        {summary.isPersonalRecord && (
                            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                                <TrendingUp size={18} className="text-yellow-400" />
                                <p className="text-sm font-bold text-yellow-400">New Personal Record!</p>
                            </div>
                        )}

                        {/* AMRAP bonus */}
                        {summary.amrapReps > 0 && (
                            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-4 py-3">
                                <Zap size={18} className="text-cyan-400" />
                                <p className={`text-sm ${textPrimary}`}>
                                    <span className="font-bold text-cyan-400">+{summary.amrapReps}</span> bonus reps on final set
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className={`px-5 pb-5 flex gap-3 transform transition-all duration-500 delay-400 ${
                        animStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                        <ShareButton
                            shareData={shareData}
                            theme={theme}
                            size="md"
                            className="flex-1 justify-center"
                        />
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                            Continue <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
})

WorkoutSummary.displayName = 'WorkoutSummary'

export default WorkoutSummary
