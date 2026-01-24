import { useState, useMemo } from 'react'
import { X, Plus, Scale, Ruler, TrendingUp, TrendingDown, Minus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Measurement types
const MEASUREMENT_TYPES = {
  weight: { name: 'Weight', unit: 'lbs', icon: Scale, color: '#06b6d4' },
  chest: { name: 'Chest', unit: 'in', icon: Ruler, color: '#3b82f6' },
  waist: { name: 'Waist', unit: 'in', icon: Ruler, color: '#f97316' },
  hips: { name: 'Hips', unit: 'in', icon: Ruler, color: '#a855f7' },
  biceps: { name: 'Biceps', unit: 'in', icon: Ruler, color: '#10b981' },
  thighs: { name: 'Thighs', unit: 'in', icon: Ruler, color: '#ec4899' },
}

/**
 * BodyMetrics - Track weight and body measurements
 */
const BodyMetrics = ({ metrics = [], onAddMetric, onDeleteMetric, onClose }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedType, setSelectedType] = useState('weight')
  const [inputValue, setInputValue] = useState('')
  const [chartType, setChartType] = useState('weight')
  const [showHistory, setShowHistory] = useState(false)

  // Get chart data for selected type
  const chartData = useMemo(() => {
    return metrics
      .filter(m => m.type === chartType)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-20) // Last 20 entries
      .map(m => ({
        date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: m.value,
        fullDate: m.date,
      }))
  }, [metrics, chartType])

  // Calculate stats for each type
  const stats = useMemo(() => {
    const result = {}
    Object.keys(MEASUREMENT_TYPES).forEach(type => {
      const typeMetrics = metrics
        .filter(m => m.type === type)
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      if (typeMetrics.length === 0) {
        result[type] = null
        return
      }

      const latest = typeMetrics[0]
      const previous = typeMetrics[1]
      const oldest = typeMetrics[typeMetrics.length - 1]

      result[type] = {
        current: latest.value,
        change: previous ? +(latest.value - previous.value).toFixed(1) : 0,
        totalChange: oldest ? +(latest.value - oldest.value).toFixed(1) : 0,
        count: typeMetrics.length,
      }
    })
    return result
  }, [metrics])

  // Handle add metric
  const handleAddMetric = () => {
    const value = parseFloat(inputValue)
    if (isNaN(value) || value <= 0) return

    onAddMetric({
      type: selectedType,
      value,
      date: new Date().toISOString(),
      id: Date.now().toString(),
    })

    setInputValue('')
    setShowAddForm(false)
  }

  // Handle delete
  const handleDelete = (id) => {
    onDeleteMetric(id)
  }

  // Get trend icon
  const TrendIcon = ({ change, inverse = false }) => {
    const isPositive = inverse ? change < 0 : change > 0
    const isNegative = inverse ? change > 0 : change < 0

    if (change === 0) return <Minus size={14} className="text-slate-500" />
    if (isPositive) return <TrendingUp size={14} className="text-emerald-400" />
    if (isNegative) return <TrendingDown size={14} className="text-red-400" />
    return null
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs">
        <p className="text-white font-medium">
          {payload[0].value} {MEASUREMENT_TYPES[chartType].unit}
        </p>
        <p className="text-slate-400">{payload[0].payload.date}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed inset-0 bg-slate-950 md:inset-4 md:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Scale className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Body Metrics</h2>
              <p className="text-xs text-slate-500">Track your progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(MEASUREMENT_TYPES).slice(0, 4).map(([type, info]) => {
              const stat = stats[type]
              const Icon = info.icon

              return (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    chartType === type
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} style={{ color: info.color }} />
                    <span className="text-xs text-slate-400">{info.name}</span>
                  </div>
                  {stat ? (
                    <>
                      <p className="text-xl font-bold text-white">
                        {stat.current}
                        <span className="text-sm text-slate-500 ml-1">{info.unit}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendIcon change={stat.change} inverse={type === 'waist' || type === 'weight'} />
                        <span className={`text-xs ${
                          stat.change === 0 ? 'text-slate-500' :
                          (type === 'waist' || type === 'weight')
                            ? (stat.change < 0 ? 'text-emerald-400' : 'text-red-400')
                            : (stat.change > 0 ? 'text-emerald-400' : 'text-red-400')
                        }`}>
                          {stat.change > 0 ? '+' : ''}{stat.change} {info.unit}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No data</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <span style={{ color: MEASUREMENT_TYPES[chartType].color }}>
                    {MEASUREMENT_TYPES[chartType].name}
                  </span>
                  <span className="text-slate-500 text-sm">Trend</span>
                </h3>
                {stats[chartType] && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    stats[chartType].totalChange === 0 ? 'bg-slate-800 text-slate-400' :
                    (chartType === 'waist' || chartType === 'weight')
                      ? (stats[chartType].totalChange < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')
                      : (stats[chartType].totalChange > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')
                  }`}>
                    {stats[chartType].totalChange > 0 ? '+' : ''}{stats[chartType].totalChange} total
                  </span>
                )}
              </div>

              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={MEASUREMENT_TYPES[chartType].color}
                      strokeWidth={2}
                      dot={{ fill: MEASUREMENT_TYPES[chartType].color, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Add New Entry */}
          {showAddForm ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="font-medium text-white">Add Measurement</h3>

              {/* Type Selector */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(MEASUREMENT_TYPES).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedType === type
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <info.icon size={16} className="mx-auto mb-1" />
                    <span className="text-xs">{info.name}</span>
                  </button>
                ))}
              </div>

              {/* Value Input */}
              <div className="flex gap-3">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Enter ${MEASUREMENT_TYPES[selectedType].name.toLowerCase()}`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  step="0.1"
                  min="0"
                />
                <span className="flex items-center px-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
                  {MEASUREMENT_TYPES[selectedType].unit}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMetric}
                  disabled={!inputValue || parseFloat(inputValue) <= 0}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    inputValue && parseFloat(inputValue) > 0
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-400"
            >
              <Plus size={20} />
              <span className="font-medium">Add Measurement</span>
            </button>
          )}

          {/* History */}
          {metrics.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-medium text-white">History ({metrics.length} entries)</span>
                {showHistory ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {showHistory && (
                <div className="p-4 pt-0 space-y-2 max-h-64 overflow-y-auto">
                  {metrics
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 20)
                    .map((entry) => {
                      const info = MEASUREMENT_TYPES[entry.type]
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <info.icon size={16} style={{ color: info.color }} />
                            <div>
                              <p className="text-sm text-white font-medium">
                                {entry.value} {info.unit}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BodyMetrics
