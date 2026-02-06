/**
 * Volume Tracking & Deload Detection Utility
 *
 * Tracks weekly training volume and provides:
 * - Volume trends over time
 * - Fatigue accumulation signals
 * - Deload recommendations
 * - Performance plateau detection
 */

import { MS_PER_DAY } from './constants'

/**
 * Volume landmarks for progressive overload
 * Based on Dr. Mike Israetel's volume landmarks concept
 */
export const VOLUME_LANDMARKS = {
  // Maintenance Volume - minimum to maintain gains
  MV: 0.6,
  // Minimum Effective Volume - where adaptation begins
  MEV: 0.8,
  // Maximum Adaptive Volume - optimal range upper bound
  MAV: 1.0,
  // Maximum Recoverable Volume - overreaching threshold
  MRV: 1.2
}

/**
 * Calculate weekly volume from history
 * @param {Array} history - Workout history array
 * @param {number} weeksBack - How many weeks to analyze (default 4)
 * @returns {Array} Weekly volume data
 */
export const calculateWeeklyVolume = (history = [], weeksBack = 4) => {
  if (!history || history.length === 0) {
    return []
  }

  const now = Date.now()
  const weeks = []

  for (let i = 0; i < weeksBack; i++) {
    const weekEnd = now - (i * 7 * MS_PER_DAY)
    const weekStart = weekEnd - (7 * MS_PER_DAY)

    const weekWorkouts = history.filter(w => {
      const workoutDate = new Date(w.date).getTime()
      return workoutDate >= weekStart && workoutDate < weekEnd
    })

    // Calculate total volume (reps or seconds)
    const totalVolume = weekWorkouts.reduce((sum, w) => sum + (w.volume || 0), 0)
    const workoutCount = weekWorkouts.length

    // Group by exercise
    const byExercise = {}
    weekWorkouts.forEach(w => {
      if (!byExercise[w.exerciseKey]) {
        byExercise[w.exerciseKey] = { volume: 0, count: 0 }
      }
      byExercise[w.exerciseKey].volume += w.volume || 0
      byExercise[w.exerciseKey].count++
    })

    weeks.push({
      weekNumber: i + 1,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      totalVolume,
      workoutCount,
      byExercise,
      isCurrentWeek: i === 0
    })
  }

  return weeks.reverse() // Oldest first
}

/**
 * Analyze volume trend
 * @param {Array} weeklyData - From calculateWeeklyVolume
 * @returns {Object} Trend analysis
 */
export const analyzeVolumeTrend = (weeklyData = []) => {
  if (weeklyData.length < 2) {
    return {
      trend: 'insufficient-data',
      change: 0,
      message: 'Need more data for trend analysis'
    }
  }

  const recentWeeks = weeklyData.slice(-3)
  const volumes = recentWeeks.map(w => w.totalVolume)

  // Calculate trend by comparing first half to second half of recent weeks
  const midpoint = Math.floor(volumes.length / 2)
  const firstHalf = volumes.slice(0, midpoint || 1)
  const secondHalf = volumes.slice(midpoint || 1)

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const changePercent = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0

  let trend, message
  if (changePercent > 15) {
    trend = 'increasing-fast'
    message = 'Volume ramping up quickly'
  } else if (changePercent > 5) {
    trend = 'increasing'
    message = 'Good progressive overload'
  } else if (changePercent > -5) {
    trend = 'stable'
    message = 'Volume is consistent'
  } else if (changePercent > -15) {
    trend = 'decreasing'
    message = 'Volume trending down'
  } else {
    trend = 'decreasing-fast'
    message = 'Significant volume drop'
  }

  return {
    trend,
    change: Math.round(changePercent),
    message
  }
}

/**
 * Detect if user needs a deload week
 * @param {Array} history - Workout history
 * @param {Object} progress - Current progress object
 * @returns {Object} Deload recommendation
 */
export const detectDeloadNeed = (history = [], progress = {}) => {
  const signals = []
  let deloadScore = 0

  // Signal 1: Consecutive weeks of high volume (3+ weeks without break)
  const weeklyData = calculateWeeklyVolume(history, 4)
  const highVolumeWeeks = weeklyData.filter(w => w.workoutCount >= 4).length
  if (highVolumeWeeks >= 3) {
    signals.push('3+ weeks of high training frequency')
    deloadScore += 30
  }

  // Signal 2: Volume trend showing sustained increase
  const trend = analyzeVolumeTrend(weeklyData)
  if (trend.trend === 'increasing-fast' && weeklyData.length >= 3) {
    signals.push('Rapid volume increase')
    deloadScore += 25
  }

  // Signal 3: Multiple exercises at high completion (fatigue accumulation)
  const highProgressExercises = Object.values(progress).filter(
    days => days && days.length >= 12 // Week 4+
  ).length
  if (highProgressExercises >= 3) {
    signals.push(`${highProgressExercises} exercises in late program stages`)
    deloadScore += 20
  }

  // Signal 4: Recent high workout density
  if (weeklyData.length > 0 && weeklyData[weeklyData.length - 1].workoutCount >= 5) {
    signals.push('High workout frequency this week')
    deloadScore += 15
  }

  // Determine recommendation
  let recommendation, urgency
  if (deloadScore >= 60) {
    recommendation = 'Strongly recommended'
    urgency = 'high'
  } else if (deloadScore >= 40) {
    recommendation = 'Consider a light week'
    urgency = 'medium'
  } else if (deloadScore >= 20) {
    recommendation = 'Monitor fatigue levels'
    urgency = 'low'
  } else {
    recommendation = 'Keep training as planned'
    urgency = 'none'
  }

  return {
    needsDeload: deloadScore >= 40,
    deloadScore,
    signals,
    recommendation,
    urgency
  }
}

/**
 * Detect performance plateau
 * @param {Array} history - Workout history for specific exercise
 * @param {string} exerciseKey - Exercise to analyze
 * @returns {Object} Plateau analysis
 */
export const detectPlateau = (history = [], exerciseKey) => {
  const exerciseHistory = history
    .filter(w => w.exerciseKey === exerciseKey)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (exerciseHistory.length < 4) {
    return {
      isPlateau: false,
      confidence: 'low',
      message: 'Need more data'
    }
  }

  // Get last 4 workouts
  const recentWorkouts = exerciseHistory.slice(-4)
  const volumes = recentWorkouts.map(w => w.volume || 0)

  // Check if volume has stayed within 10% range
  const maxVol = Math.max(...volumes)
  const minVol = Math.min(...volumes)
  const range = maxVol > 0 ? (maxVol - minVol) / maxVol : 0

  // Check if not progressing (less than 5% improvement over 4 sessions)
  const firstTwo = (volumes[0] + volumes[1]) / 2
  const lastTwo = (volumes[2] + volumes[3]) / 2
  const improvement = firstTwo > 0 ? (lastTwo - firstTwo) / firstTwo : 0

  const isPlateau = range < 0.15 && improvement < 0.05

  return {
    isPlateau,
    confidence: exerciseHistory.length >= 6 ? 'high' : 'medium',
    range: Math.round(range * 100),
    improvement: Math.round(improvement * 100),
    message: isPlateau
      ? 'Performance has plateaued - consider changing stimulus'
      : 'Still progressing well'
  }
}

/**
 * Generate deload week recommendations
 * @param {Object} deloadData - From detectDeloadNeed
 * @returns {Object} Deload protocol
 */
export const getDeloadProtocol = (deloadData) => {
  if (!deloadData.needsDeload) {
    return null
  }

  const { urgency } = deloadData

  if (urgency === 'high') {
    return {
      duration: '5-7 days',
      volumeReduction: '50%',
      intensityReduction: '0%', // Keep intensity, drop volume
      recommendations: [
        'Reduce sets by half',
        'Keep rep targets the same',
        'Focus on form and recovery',
        'Prioritize sleep and nutrition'
      ]
    }
  }

  return {
    duration: '3-5 days',
    volumeReduction: '30%',
    intensityReduction: '0%',
    recommendations: [
      'Reduce sets by one third',
      'Maintain normal intensity',
      'Add extra rest between sets',
      'Listen to your body'
    ]
  }
}

/**
 * Get volume status for current week
 * @param {Array} weeklyData - From calculateWeeklyVolume
 * @returns {Object} Current week volume status
 */
export const getCurrentWeekStatus = (weeklyData = []) => {
  if (weeklyData.length === 0) {
    return {
      status: 'no-data',
      workouts: 0,
      message: 'No workouts this week'
    }
  }

  const currentWeek = weeklyData.find(w => w.isCurrentWeek) || weeklyData[weeklyData.length - 1]
  const { workoutCount, totalVolume } = currentWeek

  // Compare to previous weeks average
  const previousWeeks = weeklyData.filter(w => !w.isCurrentWeek)
  const avgPrevious = previousWeeks.length > 0
    ? previousWeeks.reduce((sum, w) => sum + w.workoutCount, 0) / previousWeeks.length
    : 3 // Default to 3 workouts/week

  const paceRatio = avgPrevious > 0 ? workoutCount / avgPrevious : 1

  let status, message
  if (paceRatio >= 1.2) {
    status = 'high'
    message = 'High volume week'
  } else if (paceRatio >= 0.8) {
    status = 'normal'
    message = 'On track this week'
  } else if (paceRatio >= 0.5) {
    status = 'low'
    message = 'Light week so far'
  } else {
    status = 'rest'
    message = 'Recovery week'
  }

  return {
    status,
    workouts: workoutCount,
    totalVolume,
    message,
    paceRatio: Math.round(paceRatio * 100) / 100
  }
}
