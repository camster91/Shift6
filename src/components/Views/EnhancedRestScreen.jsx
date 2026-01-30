import { useState } from 'react'
import {
  X, Play, ChevronRight, Youtube, Droplets, Wind,
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
 * VideoThumbnail - Shows YouTube video thumbnail with play button
 */
const VideoThumbnail = ({ videoId, exerciseName, onPlay, theme }) => {
  if (!videoId) return null

  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-800/80'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'

  return (
    <button
      onClick={onPlay}
      className={`w-full ${cardBg} rounded-2xl overflow-hidden border border-slate-700/30 hover:border-red-500/50 transition-all group active:scale-[0.98]`}
    >
      <div className="relative aspect-video bg-slate-900">
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={`${exerciseName} form guide`}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <span className={`text-sm font-semibold ${textPrimary}`}>Watch Form Guide</span>
        </div>
      </div>
    </button>
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
 * TipsSection - Expandable tips for the exercise
 */
const TipsSection = ({ tips, cue, theme }) => {
  const [expanded, setExpanded] = useState(false)

  if (!tips?.length && !cue) return null

  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-800/80'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  return (
    <div className={`${cardBg} rounded-2xl border border-slate-700/30 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between active:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Info className="w-5 h-5 text-cyan-400" />
          </div>
          <span className={`font-semibold ${textPrimary}`}>Form Tips</span>
        </div>
        <ChevronRight className={`w-5 h-5 ${textSecondary} transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {cue && (
            <p className={`text-sm ${textSecondary} italic border-l-2 border-cyan-500/50 pl-3`}>"{cue}"</p>
          )}
          {tips?.length > 0 && (
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className={`text-sm ${textSecondary}`}>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * UpcomingExercisesList - Shows next exercises
 */
const UpcomingExercisesList = ({ exercises, theme }) => {
  if (!exercises?.length) return null

  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-800/80'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  return (
    <div className={`${cardBg} rounded-2xl border border-slate-700/30 overflow-hidden`}>
      <div className="p-4 border-b border-slate-700/30">
        <p className={`text-xs ${textSecondary} uppercase tracking-wider font-semibold`}>Coming Up</p>
      </div>
      <div className="divide-y divide-slate-700/20">
        {exercises.slice(0, 3).map((ex, i) => (
          <div key={i} className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${textPrimary} truncate`}>{ex.name || ex.shortName || ex}</p>
              {ex.defaultSets && <p className={`text-xs ${textSecondary}`}>{ex.defaultSets} sets</p>}
            </div>
            <ChevronRight className={`w-4 h-4 ${textSecondary} flex-shrink-0`} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * EnhancedRestScreen - Rich rest experience with scrollable content
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
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col min-h-screen`}>
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
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col min-h-full">

          {/* Hero Timer Section */}
          <div className="flex flex-col items-center justify-center py-6 px-4">
            <HeroProgressRing
              progress={progress}
              size={200}
              stroke={10}
              color={accentColor}
            >
              <span className={`text-6xl font-bold ${textPrimary} tabular-nums`}>
                {formatTime(timeLeft)}
              </span>
              <span className={`text-sm ${textSecondary} uppercase tracking-wider mt-1`}>Rest</span>
            </HeroProgressRing>

            {/* Time Adjustment */}
            {onAdjustTime && (
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={() => { vibrate(20); onAdjustTime(-15); }}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 transition-colors active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-medium">15s</span>
                </button>
                <button
                  onClick={() => { vibrate(20); onAdjustTime(15); }}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 transition-colors active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">15s</span>
                </button>
              </div>
            )}

            {/* Skip Button */}
            <button
              onClick={() => { vibrate(30); onSkip(); }}
              className="mt-4 px-8 py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 font-semibold hover:bg-purple-500/30 transition-colors active:scale-95"
            >
              Skip Rest
            </button>
          </div>

          {/* Up Next Banner */}
          <div className="px-4 mb-4">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center">
                  {isLastSet ? (
                    <Zap className="w-6 h-6 text-purple-400 fill-purple-400" />
                  ) : (
                    <Target className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-xs ${textSecondary} uppercase tracking-wider`}>Up Next</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>
                    {isLastSet ? 'Final Set - Max Effort!' : `Set ${currentSet} of ${totalSets}`}
                  </p>
                  {nextReps && <p className={`text-sm ${textSecondary}`}>{nextReps}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Content Cards */}
          <div className="px-4 space-y-3 pb-6">
            {/* Session Stats */}
            {(stats.setsCompleted !== undefined || stats.totalReps !== undefined) && (
              <div className="flex flex-wrap gap-2">
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

            {/* Personal Record */}
            {personalRecord && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className={`text-sm ${textSecondary}`}>Your Best:</span>
                <span className={`font-bold ${textPrimary}`}>{personalRecord}</span>
              </div>
            )}

            {/* Video Thumbnail */}
            {(exercise.videoId || exercise.youtubeId) && (
              <VideoThumbnail
                videoId={exercise.videoId || exercise.youtubeId}
                exerciseName={exercise.name || exercise.shortName}
                onPlay={onPlayVideo}
                theme={theme}
              />
            )}

            {/* Form Tips */}
            <TipsSection
              tips={exercise.tips}
              cue={exercise.cue || exercise.instructions}
              theme={theme}
            />

            {/* Upcoming Exercises */}
            <UpcomingExercisesList exercises={upcomingExercises} theme={theme} />

            {/* Recovery Reminders */}
            {timeLeft > 20 && (
              <div className="flex items-center justify-center gap-6 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wind className="w-4 h-4 text-cyan-400/70 animate-pulse" />
                  <span className="text-xs">Breathe deep</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Droplets className="w-4 h-4 text-blue-400/70" />
                  <span className="text-xs">Stay hydrated</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedRestScreen
