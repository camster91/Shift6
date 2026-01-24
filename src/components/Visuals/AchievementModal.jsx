import { useEffect, useState } from 'react'
import { X, Star, Trophy, Flame, Zap } from 'lucide-react'
import { ConfettiBurst } from './Confetti'
import { playSuccess } from '../../utils/audio'
import { vibrate } from '../../utils/device'

// Badge rarity based on difficulty
const BADGE_RARITY = {
  // Common (green)
  first_step: 'common',
  getting_started: 'common',
  week_warrior: 'common',
  double_up: 'common',
  thousand_club: 'common',
  record_breaker: 'common',

  // Uncommon (blue)
  dedicated: 'uncommon',
  on_fire: 'uncommon',
  triple_session: 'uncommon',
  early_bird: 'uncommon',
  night_owl: 'uncommon',
  pr_hunter: 'uncommon',
  five_thousand: 'uncommon',
  mastery: 'uncommon',

  // Rare (purple)
  half_century: 'rare',
  two_weeks: 'rare',
  beast_mode: 'rare',
  weekend_warrior: 'rare',
  triple_threat: 'rare',
  unstoppable: 'rare',
  ten_thousand: 'rare',

  // Epic (orange)
  century_club: 'epic',
  month_monster: 'epic',
  halfway_hero: 'epic',

  // Legendary (gold)
  complete_athlete: 'legendary',
}

const RARITY_STYLES = {
  common: {
    bg: 'from-emerald-500/20 to-emerald-600/20',
    border: 'border-emerald-500/50',
    glow: 'shadow-emerald-500/30',
    text: 'text-emerald-400',
    label: 'Common',
    stars: 1,
  },
  uncommon: {
    bg: 'from-blue-500/20 to-blue-600/20',
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-400',
    label: 'Uncommon',
    stars: 2,
  },
  rare: {
    bg: 'from-purple-500/20 to-purple-600/20',
    border: 'border-purple-500/50',
    glow: 'shadow-purple-500/30',
    text: 'text-purple-400',
    label: 'Rare',
    stars: 3,
  },
  epic: {
    bg: 'from-orange-500/20 to-orange-600/20',
    border: 'border-orange-500/50',
    glow: 'shadow-orange-500/30',
    text: 'text-orange-400',
    label: 'Epic',
    stars: 4,
  },
  legendary: {
    bg: 'from-yellow-500/20 to-amber-600/20',
    border: 'border-yellow-500/50',
    glow: 'shadow-yellow-500/30',
    text: 'text-yellow-400',
    label: 'Legendary',
    stars: 5,
  },
}

/**
 * Achievement unlock modal with celebration animations
 */
const AchievementModal = ({ badge, onClose, autoClose = true }) => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [animationStage, setAnimationStage] = useState(0)

  const rarity = BADGE_RARITY[badge?.id] || 'common'
  const styles = RARITY_STYLES[rarity]

  useEffect(() => {
    if (!badge) return

    // Play celebration effects
    playSuccess()
    vibrate([100, 50, 100, 50, 200])

    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationStage(1), 100), // Icon appears
      setTimeout(() => setAnimationStage(2), 400), // Name appears
      setTimeout(() => setAnimationStage(3), 700), // Description appears
      setTimeout(() => setShowConfetti(true), 300), // Confetti
    ]

    // Auto-close after delay
    if (autoClose) {
      timers.push(setTimeout(() => onClose?.(), 4000))
    }

    return () => timers.forEach(t => clearTimeout(t))
  }, [badge, autoClose, onClose])

  if (!badge) return null

  return (
    <>
      <ConfettiBurst active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className={`
            relative w-full max-w-sm overflow-hidden rounded-2xl
            bg-gradient-to-br ${styles.bg}
            border-2 ${styles.border}
            shadow-2xl ${styles.glow}
            transform transition-all duration-500
            ${animationStage > 0 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
          `}
          onClick={e => e.stopPropagation()}
        >
          {/* Animated background glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute -inset-10 bg-gradient-to-r ${styles.bg} animate-spin-slow opacity-50`} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
          >
            <X size={20} className="text-slate-400" />
          </button>

          {/* Content */}
          <div className="relative p-8 text-center">
            {/* Achievement unlocked header */}
            <div className={`
              text-xs font-bold uppercase tracking-widest mb-4
              ${styles.text}
              transform transition-all duration-500 delay-100
              ${animationStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
            `}>
              <div className="flex items-center justify-center gap-2">
                <Zap size={14} className="animate-pulse" />
                Achievement Unlocked
                <Zap size={14} className="animate-pulse" />
              </div>
            </div>

            {/* Badge icon with animation */}
            <div className={`
              relative mx-auto mb-4
              transform transition-all duration-700
              ${animationStage >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
            `}>
              {/* Pulsing ring */}
              <div className={`absolute inset-0 rounded-full ${styles.border} animate-ping opacity-30`}
                style={{ width: 120, height: 120, margin: 'auto' }}
              />

              {/* Badge container */}
              <div className={`
                w-28 h-28 mx-auto rounded-full
                bg-gradient-to-br ${styles.bg}
                border-4 ${styles.border}
                flex items-center justify-center
                shadow-lg ${styles.glow}
                animate-bounce-gentle
              `}>
                <span className="text-5xl">{badge.icon}</span>
              </div>

              {/* Sparkles */}
              <div className="absolute -top-2 -right-2 animate-spin-slow">
                <Star size={20} className={styles.text} fill="currentColor" />
              </div>
              <div className="absolute -bottom-1 -left-1 animate-spin-slow" style={{ animationDirection: 'reverse' }}>
                <Star size={16} className={styles.text} fill="currentColor" />
              </div>
            </div>

            {/* Badge name */}
            <h2 className={`
              text-2xl font-bold text-white mb-2
              transform transition-all duration-500 delay-300
              ${animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}>
              {badge.name}
            </h2>

            {/* Rarity label with stars */}
            <div className={`
              flex items-center justify-center gap-1 mb-3
              transform transition-all duration-500 delay-400
              ${animationStage >= 2 ? 'opacity-100' : 'opacity-0'}
            `}>
              {[...Array(styles.stars)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={`${styles.text} animate-twinkle`}
                  fill="currentColor"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
              <span className={`ml-2 text-xs font-medium ${styles.text}`}>
                {styles.label}
              </span>
            </div>

            {/* Description */}
            <p className={`
              text-slate-400 text-sm
              transform transition-all duration-500 delay-500
              ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}>
              {badge.desc}
            </p>

            {/* Celebration icons */}
            <div className={`
              flex items-center justify-center gap-4 mt-6
              transform transition-all duration-500 delay-600
              ${animationStage >= 3 ? 'opacity-100' : 'opacity-0'}
            `}>
              <Trophy size={24} className="text-yellow-500 animate-bounce-gentle" />
              <Flame size={24} className="text-orange-500 animate-pulse" />
              <Trophy size={24} className="text-yellow-500 animate-bounce-gentle" style={{ animationDelay: '150ms' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        .animate-twinkle {
          animation: twinkle 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

/**
 * Multiple achievements modal (for when several are unlocked at once)
 */
export const MultiAchievementModal = ({ badges = [], onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!badges || badges.length === 0) return null

  const handleNext = () => {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      onClose?.()
    }
  }

  return (
    <AchievementModal
      badge={badges[currentIndex]}
      onClose={handleNext}
      autoClose={badges.length === 1}
    />
  )
}

export default AchievementModal
