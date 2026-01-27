import { Home, Dumbbell, Flame } from 'lucide-react'

/**
 * ModeSelector - Launch screen for choosing workout location
 * Shown on each app launch for onboarded users
 * Auto-advances on selection for streamlined UX
 */
const ModeSelector = ({
  onSelectMode,
  homeStreak = 0,
  gymStreak = 0,
  todayHomeWorkout = null,
  todayGymWorkout = null,
  theme = 'dark'
}) => {
  const handleSelect = (mode) => {
    // Auto-advance immediately on selection
    onSelectMode(mode, true)
  }

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white'
  const textSecondary = theme === 'light' ? 'text-slate-600' : 'text-slate-400'

  return (
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
      {/* Header */}
      <div className="pt-12 pb-6 px-6 text-center">
        <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Ready to Train?</h1>
        <p className={textSecondary}>Where are you working out today?</p>
      </div>

      {/* Mode Cards - Both with equal visual prominence */}
      <div className="flex-1 px-6 pb-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Home Mode Card */}
        <button
          onClick={() => handleSelect('home')}
          className="flex-1 rounded-2xl p-6 transition-all bg-gradient-to-br from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 active:scale-[0.98] shadow-lg shadow-cyan-500/20"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-white/20">
              <Home className="w-8 h-8 text-white" />
            </div>
            {homeStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-300">
                <Flame className="w-5 h-5" />
                <span className="font-bold">{homeStreak}</span>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-2 text-left text-white">
            Home
          </h2>
          <p className="text-left mb-4 text-cyan-100">
            Calisthenics & bodyweight training
          </p>

          {todayHomeWorkout && (
            <div className="text-left text-sm text-cyan-200">
              Next: {todayHomeWorkout}
            </div>
          )}
        </button>

        {/* Gym Mode Card - Now with gradient to match Home */}
        <button
          onClick={() => handleSelect('gym')}
          className="flex-1 rounded-2xl p-6 transition-all bg-gradient-to-br from-purple-600 to-pink-700 hover:from-purple-500 hover:to-pink-600 active:scale-[0.98] shadow-lg shadow-purple-500/20"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-white/20">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            {gymStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-300">
                <Flame className="w-5 h-5" />
                <span className="font-bold">{gymStreak}</span>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-2 text-left text-white">
            Gym
          </h2>
          <p className="text-left mb-4 text-purple-100">
            Weights, machines & equipment
          </p>

          {todayGymWorkout && (
            <div className="text-left text-sm text-purple-200">
              Next: {todayGymWorkout}
            </div>
          )}
        </button>
      </div>

      {/* Bottom hint */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full">
        <p className={`text-center text-sm ${textSecondary}`}>
          Tap to start your workout
        </p>
      </div>
    </div>
  )
}

export default ModeSelector
