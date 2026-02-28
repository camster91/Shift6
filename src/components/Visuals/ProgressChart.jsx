import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Calendar, Flame, ChevronDown, ChevronUp } from 'lucide-react'

// Color palette for exercises
const exerciseColors = {
  blue: '#3b82f6',
  orange: '#f97316',
  cyan: '#06b6d4',
  emerald: '#10b981',
  yellow: '#eab308',
  teal: '#14b8a6',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1',
}

/**
 * ProgressChart - Visual progress tracking component
 * Shows weekly volume, exercise progress, and trends
 */
const ProgressChart = ({
  sessionHistory = [],
  allExercises = {},
}) => {
  const [chartType, setChartType] = useState('volume') // 'volume' | 'workouts' | 'exercise'
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false)

  // Get last 8 weeks of data
  const weeklyData = useMemo(() => {
    const weeks = []
    const now = new Date()

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const weekSessions = sessionHistory.filter(s => {
        const date = new Date(s.date)
        return date >= weekStart && date <= weekEnd
      })

      const totalVolume = weekSessions.reduce((sum, s) => sum + (s.volume || 0), 0)
      const workoutCount = weekSessions.length

      // Format week label
      const monthDay = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`

      weeks.push({
        week: monthDay,
        volume: totalVolume,
        workouts: workoutCount,
        sessions: weekSessions,
      })
    }

    return weeks
  }, [sessionHistory])

  // Get exercise-specific progress data
  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return []

    const exerciseSessions = sessionHistory
      .filter(s => s.exerciseKey === selectedExercise)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-15) // Last 15 sessions

    return exerciseSessions.map((s, i) => ({
      session: i + 1,
      volume: s.volume || 0,
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [selectedExercise, sessionHistory])

  // Calculate trends
  const trends = useMemo(() => {
    if (weeklyData.length < 2) return { volume: 0, workouts: 0 }

    const lastWeek = weeklyData[weeklyData.length - 1]
    const prevWeek = weeklyData[weeklyData.length - 2]

    const volumeChange = prevWeek.volume > 0
      ? Math.round(((lastWeek.volume - prevWeek.volume) / prevWeek.volume) * 100)
      : lastWeek.volume > 0 ? 100 : 0

    const workoutChange = prevWeek.workouts > 0
      ? Math.round(((lastWeek.workouts - prevWeek.workouts) / prevWeek.workouts) * 100)
      : lastWeek.workouts > 0 ? 100 : 0

    return { volume: volumeChange, workouts: workoutChange }
  }, [weeklyData])

  // Get exercises with data for dropdown
  const exercisesWithData = useMemo(() => {
    const exercises = new Set(sessionHistory.map(s => s.exerciseKey))
    return Array.from(exercises)
      .map(key => ({ key, exercise: allExercises[key] }))
      .filter(e => e.exercise)
  }, [sessionHistory, allExercises])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-white font-medium">
            {entry.name}: <span style={{ color: entry.color }}>{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }

  // If no data, show empty state
  if (sessionHistory.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">Complete workouts to see your progress</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header with tabs */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-400" />
            Progress
          </h3>

          {/* Trend indicators */}
          <div className="flex items-center gap-3 text-xs">
            {chartType === 'volume' && trends.volume !== 0 && (
              <span className={trends.volume > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {trends.volume > 0 ? '+' : ''}{trends.volume}% this week
              </span>
            )}
            {chartType === 'workouts' && trends.workouts !== 0 && (
              <span className={trends.workouts > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {trends.workouts > 0 ? '+' : ''}{trends.workouts}% this week
              </span>
            )}
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setChartType('volume')}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              chartType === 'volume'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame size={12} />
            Volume
          </button>
          <button
            onClick={() => setChartType('workouts')}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              chartType === 'workouts'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={12} />
            Workouts
          </button>
          <button
            onClick={() => { setChartType('exercise'); setShowExerciseDropdown(true) }}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
              chartType === 'exercise'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Exercise
          </button>
        </div>

        {/* Exercise selector dropdown */}
        {chartType === 'exercise' && (
          <div className="mt-3 relative">
            <button
              onClick={() => setShowExerciseDropdown(!showExerciseDropdown)}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white flex items-center justify-between"
            >
              <span>
                {selectedExercise
                  ? allExercises[selectedExercise]?.name || 'Select exercise'
                  : 'Select exercise'}
              </span>
              {showExerciseDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showExerciseDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                {exercisesWithData.map(({ key, exercise }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedExercise(key)
                      setShowExerciseDropdown(false)
                    }}
                    className={`w-full p-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                      selectedExercise === key ? 'bg-cyan-500/20 text-cyan-400' : 'text-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: exerciseColors[exercise.color] || exerciseColors.cyan }}
                    />
                    {exercise.name}
                  </button>
                ))}
                {exercisesWithData.length === 0 && (
                  <p className="p-2 text-sm text-slate-500">No exercise data yet</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="p-4">
        {/* Volume Chart */}
        {chartType === 'volume' && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="volume"
                  name="Total Reps"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Workouts Chart */}
        {chartType === 'workouts' && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  width={25}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="workouts"
                  name="Workouts"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Exercise Progress Chart */}
        {chartType === 'exercise' && (
          <div className="h-48">
            {selectedExercise && exerciseProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseProgressData}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    name="Reps"
                    stroke={exerciseColors[allExercises[selectedExercise]?.color] || '#06b6d4'}
                    strokeWidth={2}
                    dot={{ fill: exerciseColors[allExercises[selectedExercise]?.color] || '#06b6d4', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500 text-sm">
                  {selectedExercise ? 'No data for this exercise yet' : 'Select an exercise above'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800">
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">
              {weeklyData.reduce((sum, w) => sum + w.volume, 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Total Reps</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">
              {weeklyData.reduce((sum, w) => sum + w.workouts, 0)}
            </p>
            <p className="text-xs text-slate-500">Workouts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400">
              {Math.round(weeklyData.reduce((sum, w) => sum + w.volume, 0) / 8)}
            </p>
            <p className="text-xs text-slate-500">Avg/Week</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressChart
