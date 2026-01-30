import {
  X, Youtube, Droplets, Wind,
  Target, Dumbbell, Info, Plus, Minus, Trophy,
  Clock, Flame, CheckCircle2, Zap
} from 'lucide-react'
import { vibrate } from '../../utils/device'

/**
 * Large Progress Ring for hero timer display
 */
const HeroProgressRing = ({ progress, size = 200, stroke = 12, color = "#a855f7", children }) => {
  const radius = (size / 2) - (stroke * 2)
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.max(0, Math.min(1, progress)) * circumference)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          stroke="rgba(100,100,100,0.15)"
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease-out' }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          filter={`drop-shadow(0 0 20px ${color}40)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/**
 * StatPill - Compact stat display
 */
const StatPill = ({ icon: Icon, value, label, color = "purple" }) => {
  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colorClasses[color]}`}>
      <Icon className="w-4 h-4" />
      <span className="font-bold">{value}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  )
}

/**
 * EnhancedRestScreen - Rich rest experience that fills the screen
 */
const EnhancedRestScreen = ({
  timeLeft,
  totalTime,
  onSkip,
  onExit,
  onAdjustTime,
  onPlayVideo,
  exercise = {},
  currentSet = 1,
  totalSets = 4,
  nextReps,
  stats = {},
  personalRecord,
  upcomingExercises = [],
  accentColor = "#a855f7",
  theme = 'dark'
}) => {
  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  const progress = totalTime > 0 ? timeLeft / totalTime : 0
  const isLastSet = currentSet >= totalSets

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, '0')}`
      : `${secs}`
  }

  return (
    <div className={`fixed inset-0 ${bgClass} z-50 overflow-y-auto`}>
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          <button
            onClick={onExit}
            className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center hover:bg-slate-700/50 transition-colors"
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
          <div className="text-center">
            <p className={`text-sm font-semibold ${textPrimary}`}>{exercise.name || exercise.shortName || 'Rest'}</p>
            <p className={`text-xs ${textSecondary}`}>Set {currentSet - 1} complete</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Hero Timer Section - Takes up available space */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
          <HeroProgressRing
            progress={progress}
            size={220}
            stroke={12}
            color={accentColor}
          >
            <span className={`text-7xl font-bold ${textPrimary} tabular-nums`}>
              {formatTime(timeLeft)}
            </span>
            <span className={`text-sm ${textSecondary} uppercase tracking-wider mt-1`}>Rest</span>
          </HeroProgressRing>

          {/* Time Adjustment */}
          {onAdjustTime && (
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => { vibrate(20); onAdjustTime(-15); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 transition-colors active:scale-95"
              >
                <Minus className="w-4 h-4" />
                <span className="text-sm font-medium">15s</span>
              </button>
              <button
                onClick={() => { vibrate(20); onAdjustTime(15); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 transition-colors active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">15s</span>
              </button>
            </div>
          )}

          {/* Skip Button */}
          <button
            onClick={() => { vibrate(30); onSkip(); }}
            className="mt-5 px-10 py-3.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 font-semibold text-lg hover:bg-purple-500/30 transition-colors active:scale-95"
          >
            Skip Rest
          </button>
        </div>

        {/* Bottom Section - Fixed height content */}
        <div className="flex-shrink-0 px-4 pb-6 space-y-4">
          {/* Up Next Banner */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-500/30 flex items-center justify-center">
                {isLastSet ? (
                  <Zap className="w-7 h-7 text-purple-400 fill-purple-400" />
                ) : (
                  <Target className="w-7 h-7 text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-xs ${textSecondary} uppercase tracking-wider`}>Up Next</p>
                <p className={`text-xl font-bold ${textPrimary}`}>
                  {isLastSet ? 'Final Set - Max Effort!' : `Set ${currentSet} of ${totalSets}`}
                </p>
                {nextReps && <p className={`text-sm ${textSecondary}`}>{nextReps}</p>}
              </div>
            </div>
          </div>

          {/* Session Stats Row */}
          {(stats.setsCompleted !== undefined || stats.totalReps !== undefined) && (
            <div className="flex flex-wrap gap-2 justify-center">
              {stats.setsCompleted !== undefined && (
                <StatPill icon={CheckCircle2} value={stats.setsCompleted} label="sets" color="emerald" />
              )}
              {stats.totalReps !== undefined && (
                <StatPill icon={Flame} value={stats.totalReps} label="reps" color="amber" />
              )}
              {stats.totalVolume !== undefined && stats.totalVolume > 0 && (
                <StatPill icon={Dumbbell} value={stats.totalVolume.toLocaleString()} label="vol" color="purple" />
              )}
              {stats.elapsedTime !== undefined && (
                <StatPill icon={Clock} value={`${Math.floor(stats.elapsedTime / 60)}m`} label="" color="cyan" />
              )}
            </div>
          )}

          {/* Quick Actions Row */}
          <div className="flex gap-3">
            {/* Video Button */}
            {(exercise.videoId || exercise.youtubeId) && (
              <button
                onClick={onPlayVideo}
                className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 transition-colors active:scale-[0.98]"
              >
                <Youtube className="w-5 h-5 text-red-500" />
                <span className={`font-medium ${textPrimary}`}>Form Guide</span>
              </button>
            )}

            {/* Tips Button */}
            {(exercise.tips?.length > 0 || exercise.cue || exercise.instructions) && (
              <button
                onClick={() => {/* Could open a modal */}}
                className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 transition-colors active:scale-[0.98]"
              >
                <Info className="w-5 h-5 text-cyan-400" />
                <span className={`font-medium ${textPrimary}`}>Form Tips</span>
              </button>
            )}
          </div>

          {/* Recovery Reminders */}
          {timeLeft > 15 && (
            <div className="flex items-center justify-center gap-8 pt-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Wind className="w-5 h-5 text-cyan-400/60 animate-pulse" />
                <span className="text-sm">Breathe deep</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Droplets className="w-5 h-5 text-blue-400/60" />
                <span className="text-sm">Stay hydrated</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnhancedRestScreen
