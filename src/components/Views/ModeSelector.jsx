import { useState, useEffect } from 'react'
import { Home, Dumbbell, ChevronRight, Flame } from 'lucide-react'

/**
 * ModeSelector - Launch screen for choosing workout location
 * Shown on each app launch for onboarded users
 */
const ModeSelector = ({
  onSelectMode,
  homeStreak = 0,
  gymStreak = 0,
  todayHomeWorkout = null,
  todayGymWorkout = null,
  theme = 'dark'
}) => {
  const [selectedMode, setSelectedMode] = useState(null)
  const [rememberToday, setRememberToday] = useState(false)

  // Auto-select last mode if remember was checked
  useEffect(() => {
    const remembered = localStorage.getItem('shift6_remember_mode_today')
    const rememberedDate = localStorage.getItem('shift6_remember_mode_date')
    const today = new Date().toDateString()

    if (remembered && rememberedDate === today) {
      onSelectMode(remembered, false)
    }
  }, [onSelectMode])

  const handleSelect = (mode) => {
    setSelectedMode(mode)
  }

  const handleContinue = () => {
    if (!selectedMode) return

    if (rememberToday) {
      localStorage.setItem('shift6_remember_mode_today', selectedMode)
      localStorage.setItem('shift6_remember_mode_date', new Date().toDateString())
    }

    onSelectMode(selectedMode, true)
  }

  const bgClass = theme === 'light' ? 'bg-slate-100' : 'bg-slate-950'
  const cardBg = theme === 'light' ? 'bg-white' : 'bg-slate-900'

  return (
    <div className={`fixed inset-0 ${bgClass} z-50 flex flex-col`}>
      {/* Header */}
      <div className="pt-12 pb-6 px-6 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Ready to Train?</h1>
        <p className="text-slate-400">Where are you working out today?</p>
      </div>

      {/* Mode Cards */}
      <div className="flex-1 px-6 pb-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Home Mode Card */}
        <button
          onClick={() => handleSelect('home')}
          className={`flex-1 rounded-2xl p-6 transition-all ${
            selectedMode === 'home'
              ? 'bg-gradient-to-br from-cyan-600 to-teal-700 ring-4 ring-cyan-400/50'
              : `${cardBg} border-2 border-slate-700 hover:border-cyan-500/50`
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              selectedMode === 'home' ? 'bg-white/20' : 'bg-cyan-500/20'
            }`}>
              <Home className={`w-8 h-8 ${selectedMode === 'home' ? 'text-white' : 'text-cyan-400'}`} />
            </div>
            {homeStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="w-5 h-5" />
                <span className="font-bold">{homeStreak}</span>
              </div>
            )}
          </div>

          <h2 className={`text-2xl font-bold mb-2 text-left ${
            selectedMode === 'home' ? 'text-white' : 'text-white'
          }`}>
            Home
          </h2>
          <p className={`text-left mb-4 ${
            selectedMode === 'home' ? 'text-cyan-100' : 'text-slate-400'
          }`}>
            Calisthenics & bodyweight training
          </p>

          {todayHomeWorkout && (
            <div className={`text-left text-sm ${
              selectedMode === 'home' ? 'text-cyan-200' : 'text-slate-500'
            }`}>
              Today: {todayHomeWorkout}
            </div>
          )}
        </button>

        {/* Gym Mode Card */}
        <button
          onClick={() => handleSelect('gym')}
          className={`flex-1 rounded-2xl p-6 transition-all ${
            selectedMode === 'gym'
              ? 'bg-gradient-to-br from-purple-600 to-pink-700 ring-4 ring-purple-400/50'
              : `${cardBg} border-2 border-slate-700 hover:border-purple-500/50`
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
              selectedMode === 'gym' ? 'bg-white/20' : 'bg-purple-500/20'
            }`}>
              <Dumbbell className={`w-8 h-8 ${selectedMode === 'gym' ? 'text-white' : 'text-purple-400'}`} />
            </div>
            {gymStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="w-5 h-5" />
                <span className="font-bold">{gymStreak}</span>
              </div>
            )}
          </div>

          <h2 className={`text-2xl font-bold mb-2 text-left ${
            selectedMode === 'gym' ? 'text-white' : 'text-white'
          }`}>
            Gym
          </h2>
          <p className={`text-left mb-4 ${
            selectedMode === 'gym' ? 'text-purple-100' : 'text-slate-400'
          }`}>
            Weights, machines & equipment
          </p>

          {todayGymWorkout && (
            <div className={`text-left text-sm ${
              selectedMode === 'gym' ? 'text-purple-200' : 'text-slate-500'
            }`}>
              Today: {todayGymWorkout}
            </div>
          )}
        </button>
      </div>

      {/* Bottom Section */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full">
        {/* Remember Toggle */}
        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberToday}
            onChange={(e) => setRememberToday(e.target.checked)}
            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-slate-400 text-sm">Remember my choice for today</span>
        </label>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedMode}
          className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
            selectedMode
              ? selectedMode === 'home'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-400 hover:to-teal-400'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {selectedMode ? "Let's Go" : 'Select a Mode'}
          {selectedMode && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

export default ModeSelector
