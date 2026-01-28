/**
 * Notification Utilities for Shift6
 * Handles push/local notifications for workout reminders and gamification
 */

// Notification types
export const NOTIFICATION_TYPES = {
  STREAK_AT_RISK: 'streak_at_risk',
  STREAK_LOST: 'streak_lost',
  DAILY_REMINDER: 'daily_reminder',
  BADGE_EARNED: 'badge_earned',
  WORKOUT_COMPLETE: 'workout_complete',
  WEEKLY_SUMMARY: 'weekly_summary',
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  permission: 'default', // 'default' | 'granted' | 'denied'
  streakReminders: true,
  dailyReminders: false,
  dailyReminderTime: '09:00', // HH:mm format
  badgeNotifications: true,
  weeklyDigest: false,
  vibrate: true,
}

// Storage key for notification settings
const NOTIFICATION_STORAGE_KEY = 'shift6_notification_settings'

/**
 * Get current notification settings
 * @returns {Object} Notification settings
 */
export const getNotificationSettings = () => {
  try {
    const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Error loading notification settings:', e)
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS }
}

/**
 * Save notification settings
 * @param {Object} settings - Settings to save
 */
export const saveNotificationSettings = (settings) => {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Error saving notification settings:', e)
  }
}

/**
 * Check if notifications are supported
 * @returns {boolean}
 */
export const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Get current notification permission status
 * @returns {string} 'default' | 'granted' | 'denied'
 */
export const getPermissionStatus = () => {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Request notification permission
 * @returns {Promise<string>} Permission result
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()

    // Update settings with new permission status
    const settings = getNotificationSettings()
    settings.permission = permission
    settings.enabled = permission === 'granted'
    saveNotificationSettings(settings)

    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Show a notification (uses service worker for persistence)
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @returns {Promise<void>}
 */
export const showNotification = async (title, options = {}) => {
  const settings = getNotificationSettings()

  if (!settings.enabled || getPermissionStatus() !== 'granted') {
    return
  }

  const defaultOptions = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: settings.vibrate ? [200, 100, 200] : undefined,
    tag: options.type || 'shift6-notification',
    renotify: true,
    requireInteraction: false,
    ...options,
  }

  try {
    // Use service worker for notification if available
    const registration = await navigator.serviceWorker?.ready
    if (registration) {
      await registration.showNotification(title, defaultOptions)
    } else {
      // Fallback to regular notification
      new Notification(title, defaultOptions)
    }
  } catch (error) {
    console.error('Error showing notification:', error)
  }
}

/**
 * Schedule a daily reminder notification
 * @param {string} time - Time in HH:mm format
 */
export const scheduleDailyReminder = (time) => {
  const settings = getNotificationSettings()
  settings.dailyReminderTime = time
  settings.dailyReminders = true
  saveNotificationSettings(settings)

  // Store in a format for checking
  localStorage.setItem('shift6_daily_reminder_time', time)
  localStorage.setItem('shift6_daily_reminder_enabled', 'true')
}

/**
 * Cancel daily reminder
 */
export const cancelDailyReminder = () => {
  const settings = getNotificationSettings()
  settings.dailyReminders = false
  saveNotificationSettings(settings)

  localStorage.removeItem('shift6_daily_reminder_time')
  localStorage.setItem('shift6_daily_reminder_enabled', 'false')
}

/**
 * Check and send streak at-risk notification
 * Called from the main app when checking streak status
 * @param {Object} streakData - { streak, isAtRisk, graceRemaining, lastWorkoutDate }
 */
export const checkStreakNotification = async (streakData) => {
  const settings = getNotificationSettings()

  if (!settings.streakReminders || !settings.enabled) {
    return
  }

  const { streak, isAtRisk, graceRemaining } = streakData

  if (streak > 0 && isAtRisk) {
    const lastNotification = localStorage.getItem('shift6_last_streak_notification')
    const today = new Date().toDateString()

    // Only notify once per day
    if (lastNotification === today) {
      return
    }

    let title, body

    if (graceRemaining === 0) {
      title = 'Streak in Danger!'
      body = `Your ${streak} day streak will end today if you don't work out!`
    } else {
      title = 'Keep Your Streak Going!'
      body = `You have a ${streak} day streak. Work out today to keep it alive!`
    }

    await showNotification(title, {
      body,
      type: NOTIFICATION_TYPES.STREAK_AT_RISK,
      data: { streak, action: 'open_app' },
    })

    localStorage.setItem('shift6_last_streak_notification', today)
  }
}

/**
 * Show badge earned notification
 * @param {Object} badge - Badge object with name, desc, icon
 */
export const notifyBadgeEarned = async (badge) => {
  const settings = getNotificationSettings()

  if (!settings.badgeNotifications || !settings.enabled) {
    return
  }

  await showNotification(`Badge Earned: ${badge.name}!`, {
    body: `${badge.icon} ${badge.desc}`,
    type: NOTIFICATION_TYPES.BADGE_EARNED,
    data: { badgeId: badge.id },
  })
}

/**
 * Check if it's time for daily reminder
 * Returns true if reminder should be shown
 * @returns {boolean}
 */
export const shouldShowDailyReminder = () => {
  const settings = getNotificationSettings()

  if (!settings.dailyReminders || !settings.enabled) {
    return false
  }

  const now = new Date()
  const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number)
  const reminderTime = new Date()
  reminderTime.setHours(hours, minutes, 0, 0)

  // Check if within 5 minute window of reminder time
  const diff = Math.abs(now - reminderTime) / 60000 // diff in minutes
  if (diff > 5) return false

  // Check if already reminded today
  const lastReminder = localStorage.getItem('shift6_last_daily_reminder')
  const today = new Date().toDateString()

  if (lastReminder === today) {
    return false
  }

  return true
}

/**
 * Show daily workout reminder
 * @param {Object} todayStats - { workoutsCompleted, dailyGoal }
 */
export const showDailyReminder = async (todayStats) => {
  if (!shouldShowDailyReminder()) return

  const { workoutsCompleted = 0, dailyGoal = 1 } = todayStats

  if (workoutsCompleted >= dailyGoal) {
    return // Already hit goal
  }

  const remaining = dailyGoal - workoutsCompleted
  const body = remaining === dailyGoal
    ? `Time to start your workout! Goal: ${dailyGoal} workout${dailyGoal > 1 ? 's' : ''}`
    : `${remaining} more workout${remaining > 1 ? 's' : ''} to reach your daily goal!`

  await showNotification('Time to Train!', {
    body,
    type: NOTIFICATION_TYPES.DAILY_REMINDER,
  })

  localStorage.setItem('shift6_last_daily_reminder', new Date().toDateString())
}

/**
 * Calculate streak data for notification checking
 * @param {Array} sessionHistory - Array of workout sessions
 * @returns {Object} { streak, isAtRisk, graceRemaining, lastWorkoutDate }
 */
export const calculateStreakForNotification = (sessionHistory) => {
  if (!sessionHistory || sessionHistory.length === 0) {
    return { streak: 0, isAtRisk: false, graceRemaining: 0, lastWorkoutDate: null }
  }

  // Get unique workout dates
  const workoutDates = [...new Set(
    sessionHistory.map(s => new Date(s.date).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a))

  if (workoutDates.length === 0) {
    return { streak: 0, isAtRisk: false, graceRemaining: 0, lastWorkoutDate: null }
  }

  const lastWorkoutDate = new Date(workoutDates[0])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  lastWorkoutDate.setHours(0, 0, 0, 0)

  const daysSinceLastWorkout = Math.floor((today - lastWorkoutDate) / (1000 * 60 * 60 * 24))

  // Calculate streak
  let streak = 0
  let currentDate = new Date(workoutDates[0])
  currentDate.setHours(0, 0, 0, 0)

  for (let i = 0; i < workoutDates.length; i++) {
    const workoutDate = new Date(workoutDates[i])
    workoutDate.setHours(0, 0, 0, 0)

    const expectedDate = new Date(today)
    expectedDate.setDate(today.getDate() - streak)
    expectedDate.setHours(0, 0, 0, 0)

    // Allow for 1 day grace period
    const diff = Math.floor((expectedDate - workoutDate) / (1000 * 60 * 60 * 24))

    if (diff <= 1) {
      streak++
    } else {
      break
    }
  }

  // Determine if streak is at risk
  const isAtRisk = daysSinceLastWorkout >= 1 && streak > 0
  const graceRemaining = Math.max(0, 1 - daysSinceLastWorkout)

  return {
    streak,
    isAtRisk,
    graceRemaining,
    lastWorkoutDate: workoutDates[0],
  }
}

/**
 * Register notification check interval (for background checks)
 * Called when app loads
 */
export const registerNotificationChecks = () => {
  // Check every 5 minutes for reminders
  const checkInterval = setInterval(() => {
    const settings = getNotificationSettings()
    if (settings.enabled && settings.dailyReminders) {
      // Will be checked by shouldShowDailyReminder
    }
  }, 5 * 60 * 1000)

  // Return cleanup function
  return () => clearInterval(checkInterval)
}
