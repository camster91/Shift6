import { useState } from 'react'
import {
  X, Timer, Play, ChevronRight, Youtube, Droplets, Wind,
  TrendingUp, Target, Dumbbell, Info, Plus, Minus, Trophy,
  Clock, Flame, CheckCircle2
} from 'lucide-react'
import { vibrate } from '../../utils/device'

/**
 * ProgressRing - Circular progress indicator
 */
const ProgressRing = ({ progress, size = 80, stroke = 6, color = "#a855f7" }) => {
  const radius = (size / 2) - (stroke * 2)
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.max(0, Math.min(1, progress)) * circumference)

  return (
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
        className="drop-shadow-lg"
      />
    </svg>
  )
}

/**
 * VideoThumbnail - Shows YouTube video thumbnail with play button
 */
const VideoThumbnail = ({ videoId, exerciseName, onPlay, theme }) => {
  if (!videoId) return null

  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-800/50'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'

  return (
    <button
      onClick={onPlay}
      className={`w-full ${cardBg} rounded-xl overflow-hidden border border-slate-700/30 hover:border-red-500/50 transition-colors group`}
    >
      <div className="relative aspect-video bg-slate-900">
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={`${exerciseName} form guide`}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      </div>
      <div className="p-3 flex items-center gap-2">
        <Youtube className="w-4 h-4 text-red-500" />
        <span className={`text-sm font-medium ${textPrimary}`}>Watch Form Guide</span>
      </div>
    </button>
  )
}

/**
 * StatCard - Small stat display card
 */
const StatCard = ({ icon: Icon, label, value, color = "purple", theme }) => {
  const cardBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  const colorClasses = {
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    pink: 'text-pink-400'
  }

  return (
    <div className={`${cardBg} rounded-xl p-3 border border-slate-700/20`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colorClasses[color]}`} />
        <span className={`text-xs ${textSecondary}`}>{label}</span>
      </div>
      <p className={`text-lg font-bold ${textPrimary}`}>{value}</p>
    </div>
  )
}

/**
 * UpNextCard - Shows upcoming exercise or set
 */
const UpNextCard = ({ exercise, setNumber, totalSets, reps, isLastSet, theme }) => {
  const cardBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  return (
    <div className={`${cardBg} rounded-xl p-4 border border-slate-700/20`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className={`text-xs ${textSecondary} uppercase tracking-wider`}>Up Next</p>
            <p className={`font-bold ${textPrimary}`}>
              {isLastSet ? 'Final Set!' : `Set ${setNumber} of ${totalSets}`}
            </p>
            {reps && <p className={`text-sm ${textSecondary}`}>{reps} {typeof reps === 'number' && reps > 1 ? 'reps' : ''}</p>}
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 ${textSecondary}`} />
      </div>
    </div>
  )
}

/**
 * TipsSection - Expandable tips for the exercise
 */
const TipsSection = ({ tips, cue, theme }) => {
  const [expanded, setExpanded] = useState(false)

  if (!tips?.length && !cue) return null

  const cardBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  return (
    <div className={`${cardBg} rounded-xl border border-slate-700/20 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span className={`font-medium ${textPrimary}`}>Form Tips</span>
        </div>
        <ChevronRight className={`w-5 h-5 ${textSecondary} transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {cue && (
            <p className={`text-sm ${textSecondary} italic`}>"{cue}"</p>
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
 * HydrationReminder - Subtle water reminder
 */
const HydrationReminder = ({ theme }) => {
  const textSecondary = theme === 'light' ? 'text-slate-500' : 'text-slate-500'

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Droplets className="w-4 h-4 text-blue-400" />
      <span className={`text-xs ${textSecondary}`}>Stay hydrated - take a sip!</span>
    </div>
  )
}

/**
 * BreathingGuide - Simple breathing cue
 */
const BreathingGuide = ({ theme }) => {
  const textSecondary = theme === 'light' ? 'text-slate-500' : 'text-slate-500'

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Wind className="w-4 h-4 text-cyan-400 animate-pulse" />
      <span className={`text-xs ${textSecondary}`}>Breathe deep - recover strong</span>
    </div>
  )
}

/**
 * EnhancedRestScreen - Rich rest experience with scrollable content
 *
 * @param {Object} props
 * @param {number} props.timeLeft - Seconds remaining
 * @param {number} props.totalTime - Total rest time in seconds
 * @param {function} props.onSkip - Skip rest callback
 * @param {function} props.onExit - Exit workout callback
 * @param {function} props.onAdjustTime - Adjust rest time (+/- seconds)
 * @param {function} props.onPlayVideo - Play exercise video callback
 * @param {Object} props.exercise - Current exercise data
 * @param {number} props.currentSet - Current set number (1-indexed)
 * @param {number} props.totalSets - Total sets for this exercise
 * @param {number|string} props.nextReps - Reps for next set
 * @param {Object} props.stats - Session stats (volume, setsCompleted, etc.)
 * @param {Object} props.personalRecord - PR for this exercise
 * @param {Array} props.upcomingExercises - List of remaining exercises
 * @param {string} props.accentColor - Theme accent color
 * @param {string} props.theme - 'light' or 'dark'
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
  const bgClass = theme === 'light' ? 'bg-slate-50' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800'

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
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
      {/* Sticky Header with Timer */}
      <div className={`sticky top-0 z-10 ${cardBg} border-b ${borderColor} shadow-lg`}>
        <div className="flex items-center justify-between p-3">
          <button
            onClick={onExit}
            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>

          {/* Compact Timer Display */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing
                progress={progress}
                size={56}
                stroke={4}
                color={accentColor}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${textPrimary} tabular-nums`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Time Adjustment Buttons */}
            {onAdjustTime && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => { vibrate(20); onAdjustTime(15); }}
                  className={`p-1 rounded ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} transition-colors`}
                  title="Add 15 seconds"
                >
                  <Plus className={`w-4 h-4 ${textSecondary}`} />
                </button>
                <button
                  onClick={() => { vibrate(20); onAdjustTime(-15); }}
                  className={`p-1 rounded ${theme === 'light' ? 'hover:bg-slate-200' : 'hover:bg-slate-700'} transition-colors`}
                  title="Remove 15 seconds"
                >
                  <Minus className={`w-4 h-4 ${textSecondary}`} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => { vibrate(30); onSkip(); }}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Exercise Name */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <Timer className="w-4 h-4 text-purple-400" />
          <span className={`text-sm ${textSecondary}`}>Resting</span>
          <span className={textSecondary}>•</span>
          <span className={`text-sm font-medium ${textPrimary}`}>{exercise.name || exercise.shortName || 'Exercise'}</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-8">

          {/* Up Next Card */}
          <UpNextCard
            exercise={exercise}
            setNumber={currentSet}
            totalSets={totalSets}
            reps={nextReps}
            isLastSet={isLastSet}
            theme={theme}
          />

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

          {/* Session Stats Grid */}
          <div>
            <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-2`}>This Session</p>
            <div className="grid grid-cols-2 gap-2">
              {stats.setsCompleted !== undefined && (
                <StatCard
                  icon={CheckCircle2}
                  label="Sets Done"
                  value={stats.setsCompleted}
                  color="emerald"
                  theme={theme}
                />
              )}
              {stats.totalVolume !== undefined && (
                <StatCard
                  icon={Dumbbell}
                  label="Volume"
                  value={typeof stats.totalVolume === 'number' ? `${stats.totalVolume.toLocaleString()}` : stats.totalVolume}
                  color="purple"
                  theme={theme}
                />
              )}
              {stats.totalReps !== undefined && (
                <StatCard
                  icon={Flame}
                  label="Total Reps"
                  value={stats.totalReps}
                  color="amber"
                  theme={theme}
                />
              )}
              {stats.elapsedTime !== undefined && (
                <StatCard
                  icon={Clock}
                  label="Time"
                  value={`${Math.floor(stats.elapsedTime / 60)}m`}
                  color="cyan"
                  theme={theme}
                />
              )}
            </div>
          </div>

          {/* Personal Record */}
          {personalRecord && (
            <div className={`${cardBg} rounded-xl p-4 border border-amber-500/30 bg-amber-500/5`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className={`text-xs ${textSecondary}`}>Your Best</p>
                  <p className={`font-bold ${textPrimary}`}>{personalRecord}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Exercises Preview */}
          {upcomingExercises.length > 0 && (
            <div>
              <p className={`text-xs ${textSecondary} uppercase tracking-wider mb-2`}>Coming Up</p>
              <div className="space-y-2">
                {upcomingExercises.slice(0, 3).map((ex, i) => (
                  <div
                    key={i}
                    className={`${cardBg} rounded-lg p-3 border border-slate-700/20 flex items-center gap-3`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-slate-700/30 flex items-center justify-center text-sm font-bold ${textSecondary}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${textPrimary}`}>{ex.name || ex.shortName || ex}</p>
                      {ex.sets && <p className={`text-xs ${textSecondary}`}>{ex.sets} sets</p>}
                    </div>
                    <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breathing/Hydration Reminder */}
          <div className="space-y-1 pt-2">
            {timeLeft > 30 && <BreathingGuide theme={theme} />}
            {timeLeft > 15 && <HydrationReminder theme={theme} />}
          </div>

        </div>
      </div>
    </div>
  )
}

export default EnhancedRestScreen
