import { useState, memo } from 'react'
import {
  X, Play, Youtube, Droplets, Wind, ChevronDown,
  Target, Dumbbell, Info, Plus, Minus, Trophy,
  Clock, Flame, CheckCircle2, Zap, ChevronRight
} from 'lucide-react'
import { vibrate } from '../../utils/device'

/**
 * Get theme-aware class names
 * @param {string} theme - 'light' or 'dark'
 * @returns {Object} Theme class names
 */
const getThemeClasses = (theme) => ({
  textPrimary: theme === 'light' ? 'text-slate-900' : 'text-white',
  textSecondary: theme === 'light' ? 'text-slate-600' : 'text-slate-400',
  cardBg: theme === 'light' ? 'bg-white' : 'bg-slate-800/60',
  buttonBg: theme === 'light' ? 'bg-slate-200/80' : 'bg-slate-800/50',
  buttonHover: theme === 'light' ? 'hover:bg-slate-300/80' : 'hover:bg-slate-700/50'
})

/**
 * Progress Ring for timer display
 */
const ProgressRing = memo(({ progress, size = 120, stroke = 8, color = "#a855f7", children }) => {
  const radius = (size / 2) - (stroke * 2)
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.max(0, Math.min(1, progress)) * circumference)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          stroke="rgba(100,100,100,0.2)"
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
          filter={`drop-shadow(0 0 12px ${color}50)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
})

ProgressRing.displayName = 'ProgressRing'

/**
 * Video Card - Large clickable video thumbnail
 */
const VideoCard = memo(({ videoId, exerciseName, onPlay, theme }) => {
  if (!videoId) return null

  const { textPrimary, textSecondary } = getThemeClasses(theme)

  return (
    <div className="space-y-2">
      <p className={`text-xs ${textSecondary} uppercase tracking-wider font-semibold px-1`}>Form Guide</p>
      <button
        onClick={() => { vibrate(20); onPlay(); }}
        className="w-full rounded-2xl overflow-hidden border border-slate-700/40 hover:border-red-500/50 transition-all group active:scale-[0.99]"
      >
        <div className="relative aspect-video bg-slate-900">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={`${exerciseName} form guide`}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/90 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-red-500 transition-all">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              <span className={`text-sm font-semibold ${textPrimary}`}>Watch: {exerciseName} Form</span>
            </div>
            <p className={`text-xs ${textSecondary} mt-1`}>Learn proper technique and common mistakes</p>
          </div>
        </div>
      </button>
    </div>
  )
})

VideoCard.displayName = 'VideoCard'

/**
 * Tips Card - Shows exercise tips in a nice card
 */
const TipsCard = memo(({ tips, cue, theme }) => {
  if (!tips?.length && !cue) return null

  const { textPrimary, textSecondary, cardBg } = getThemeClasses(theme)

  return (
    <div className="space-y-2">
      <p className={`text-xs ${textSecondary} uppercase tracking-wider font-semibold px-1`}>Form Tips</p>
      <div className={`${cardBg} rounded-2xl border border-slate-700/40 p-4 space-y-4`}>
        {cue && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>Key Cue</p>
              <p className={`text-sm ${textSecondary} italic`}>"{cue}"</p>
            </div>
          </div>
        )}
        {tips?.length > 0 && (
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className={`text-sm ${textSecondary}`}>{tip}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

TipsCard.displayName = 'TipsCard'

/**
 * Stats Card - Session statistics
 */
const StatsCard = memo(({ stats, theme }) => {
  const { textPrimary, textSecondary, cardBg } = getThemeClasses(theme)

  const hasStats = stats.setsCompleted !== undefined || stats.totalReps !== undefined || stats.totalVolume !== undefined

  if (!hasStats) return null

  return (
    <div className="space-y-2">
      <p className={`text-xs ${textSecondary} uppercase tracking-wider font-semibold px-1`}>This Session</p>
      <div className={`${cardBg} rounded-2xl border border-slate-700/40 p-4`}>
        <div className="grid grid-cols-3 gap-4">
          {stats.setsCompleted !== undefined && (
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>{stats.setsCompleted}</p>
              <p className={`text-xs ${textSecondary}`}>sets done</p>
            </div>
          )}
          {stats.totalReps !== undefined && (
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>{stats.totalReps}</p>
              <p className={`text-xs ${textSecondary}`}>total reps</p>
            </div>
          )}
          {stats.elapsedTime !== undefined && (
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>{Math.floor(stats.elapsedTime / 60)}m</p>
              <p className={`text-xs ${textSecondary}`}>elapsed</p>
            </div>
          )}
        </div>
        {stats.totalVolume !== undefined && stats.totalVolume > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-purple-400" />
              <span className={`text-sm ${textSecondary}`}>Total Volume</span>
            </div>
            <span className={`text-lg font-bold ${textPrimary}`}>{stats.totalVolume.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
})

StatsCard.displayName = 'StatsCard'

/**
 * Upcoming Exercises Card
 */
const UpcomingCard = memo(({ exercises, theme }) => {
  if (!exercises?.length) return null

  const { textPrimary, textSecondary, cardBg } = getThemeClasses(theme)

  return (
    <div className="space-y-2">
      <p className={`text-xs ${textSecondary} uppercase tracking-wider font-semibold px-1`}>Coming Up</p>
      <div className={`${cardBg} rounded-2xl border border-slate-700/40 divide-y divide-slate-700/30`}>
        {exercises.slice(0, 3).map((ex, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${textPrimary} truncate`}>{ex.name || ex.shortName || ex}</p>
              {ex.defaultSets && <p className={`text-xs ${textSecondary}`}>{ex.defaultSets} sets</p>}
            </div>
            <ChevronRight className={`w-5 h-5 ${textSecondary}`} />
          </div>
        ))}
      </div>
    </div>
  )
})

UpcomingCard.displayName = 'UpcomingCard'

/**
 * Personal Record Card
 */
const PRCard = memo(({ personalRecord, theme }) => {
  if (!personalRecord) return null

  const { textPrimary, textSecondary } = getThemeClasses(theme)

  return (
    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className={`text-xs ${textSecondary} uppercase tracking-wider`}>Your Personal Best</p>
          <p className={`text-xl font-bold ${textPrimary}`}>{personalRecord}</p>
        </div>
      </div>
    </div>
  )
})

PRCard.displayName = 'PRCard'

/**
 * EnhancedRestScreen - Bottom sheet style with scrollable feed content
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
  const [showContent, setShowContent] = useState(true)

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const { textPrimary, textSecondary, cardBg, buttonBg, buttonHover } = getThemeClasses(theme)
  const headerBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'

  const progress = totalTime > 0 ? timeLeft / totalTime : 0
  const isLastSet = currentSet >= totalSets

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, '0')}`
      : `${secs}`
  }

  return (
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
      {/* Sticky Header with Timer */}
      <div className={`${headerBg} border-b border-slate-700/50 flex-shrink-0`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={onExit}
            aria-label="Exit workout"
            className={`w-10 h-10 rounded-xl ${buttonBg} flex items-center justify-center ${buttonHover} transition-colors`}
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
          <div className="text-center">
            <p className={`font-semibold ${textPrimary}`}>{exercise.name || exercise.shortName || 'Rest'}</p>
          </div>
          <button
            onClick={() => setShowContent(!showContent)}
            aria-label={showContent ? 'Collapse content' : 'Expand content'}
            aria-expanded={showContent}
            className={`w-10 h-10 rounded-xl ${buttonBg} flex items-center justify-center ${buttonHover} transition-colors`}
          >
            <ChevronDown className={`w-5 h-5 ${textSecondary} transition-transform ${showContent ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Timer Section */}
        <div className="flex items-center justify-center gap-4 py-4">
          {/* Minus Button */}
          {onAdjustTime && (
            <button
              onClick={() => { vibrate(20); onAdjustTime(-15); }}
              aria-label="Subtract 15 seconds"
              className={`w-14 h-14 rounded-xl ${buttonBg} flex flex-col items-center justify-center ${textSecondary} ${buttonHover} transition-colors active:scale-95`}
            >
              <Minus className="w-4 h-4" />
              <span className="text-[10px] font-medium">15s</span>
            </button>
          )}

          {/* Timer Ring */}
          <ProgressRing
            progress={progress}
            size={120}
            stroke={6}
            color={accentColor}
          >
            <span className={`text-4xl font-bold ${textPrimary} tabular-nums`}>
              {formatTime(timeLeft)}
            </span>
          </ProgressRing>

          {/* Plus Button */}
          {onAdjustTime && (
            <button
              onClick={() => { vibrate(20); onAdjustTime(15); }}
              aria-label="Add 15 seconds"
              className={`w-14 h-14 rounded-xl ${buttonBg} flex flex-col items-center justify-center ${textSecondary} ${buttonHover} transition-colors active:scale-95`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-medium">15s</span>
            </button>
          )}
        </div>

        {/* Up Next + Skip Row */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <div className="flex-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                {isLastSet ? (
                  <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />
                ) : (
                  <Target className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-xs ${textSecondary}`}>Up Next</p>
                <p className={`font-bold ${textPrimary} truncate`}>
                  {isLastSet ? 'Final Set!' : `Set ${currentSet}/${totalSets}`}
                </p>
                {nextReps && <p className={`text-xs ${textSecondary} truncate`}>{nextReps}</p>}
              </div>
            </div>
          </div>
          <button
            onClick={() => { vibrate(30); onSkip(); }}
            aria-label="Skip rest timer"
            className="px-6 py-4 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 font-semibold hover:bg-purple-500/30 transition-colors active:scale-95"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Scrollable Content Feed */}
      {showContent && (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 pb-8 min-h-full flex flex-col">
            {/* Main content section */}
            <div className="space-y-6">
              {/* Video Section */}
              <VideoCard
                videoId={exercise.videoId || exercise.youtubeId}
                exerciseName={exercise.name || exercise.shortName}
                onPlay={onPlayVideo}
                theme={theme}
              />

              {/* Form Tips */}
              <TipsCard
                tips={exercise.tips}
                cue={exercise.cue || exercise.instructions}
                theme={theme}
              />

              {/* Personal Record */}
              <PRCard personalRecord={personalRecord} theme={theme} />

              {/* Session Stats */}
              <StatsCard stats={stats} theme={theme} />

              {/* Upcoming Exercises */}
              <UpcomingCard exercises={upcomingExercises} theme={theme} />
            </div>

            {/* Spacer to push recovery to bottom */}
            <div className="flex-1 min-h-6" />

            {/* Recovery Tips - anchored to bottom */}
            <div className="space-y-2 mt-6">
              <p className={`text-xs ${textSecondary} uppercase tracking-wider font-semibold px-1`}>Recovery</p>
              <div className="grid grid-cols-2 gap-3">
                <div className={`${cardBg} rounded-2xl border border-slate-700/40 p-4 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Wind className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Breathe</p>
                    <p className={`text-xs ${textSecondary}`}>Deep breaths</p>
                  </div>
                </div>
                <div className={`${cardBg} rounded-2xl border border-slate-700/40 p-4 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Hydrate</p>
                    <p className={`text-xs ${textSecondary}`}>Take a sip</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedRestScreen
