/**
 * PWA Utilities
 *
 * Handles service worker registration, updates, and offline detection.
 * Data is preserved in localStorage across updates.
 */

/**
 * Check if the app is running as a PWA (installed)
 * @returns {boolean} True if running as installed PWA
 */
export const isRunningAsPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
}

/**
 * Check if device is online
 * @returns {boolean} True if online
 */
export const isOnline = () => {
  return navigator.onLine
}

/**
 * Register for online/offline events
 * @param {function} onOnline - Callback when coming online
 * @param {function} onOffline - Callback when going offline
 * @returns {function} Cleanup function
 */
export const registerNetworkListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

/**
 * Check for service worker updates
 * Works with vite-plugin-pwa's autoUpdate mode
 * @returns {Promise<boolean>} True if update is available
 */
export const checkForUpdates = async () => {
  if (!('serviceWorker' in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    // Trigger update check
    await registration.update()

    // Check if there's a waiting worker (new version ready)
    return !!registration.waiting
  } catch (error) {
    console.warn('Update check failed:', error)
    return false
  }
}

/**
 * Apply pending update by reloading the page
 * This will activate the waiting service worker.
 * Data in localStorage is automatically preserved.
 */
export const applyUpdate = async () => {
  if (!('serviceWorker' in navigator)) {
    window.location.reload()
    return
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration?.waiting) {
      // Tell waiting service worker to take control
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    // Reload to get new version
    // Small delay to ensure SW takes over
    setTimeout(() => {
      window.location.reload()
    }, 100)
  } catch (error) {
    console.warn('Update apply failed, forcing reload:', error)
    window.location.reload()
  }
}

/**
 * Get app version from localStorage or default
 * @returns {string} Current app version
 */
export const getAppVersion = () => {
  return localStorage.getItem('shift6_app_version') || '2.1.0'
}

/**
 * Set app version in localStorage
 * @param {string} version - New version string
 */
export const setAppVersion = (version) => {
  localStorage.setItem('shift6_app_version', version)
}

/**
 * Export all user data for backup
 * @returns {Object} All user data
 */
export const exportUserData = () => {
  const keys = [
    'shift6_progress',
    'shift6_history',
    'shift6_current_session',
    'shift6_difficulty',
    'shift6_muted',
    'shift6_rest_timer',
    'shift6_theme',
    'shift6_program_mode',
    'shift6_active_program',
    'shift6_training_prefs',
    'shift6_custom_exercises',
    'shift6_gym_program',
    'shift6_gym_weights',
    'shift6_gym_history',
    'shift6_sprints',
    'shift6_badges',
    'shift6_current_mode',
    'shift6_onboarded'
  ]

  const data = {}
  keys.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      data[key] = value
    }
  })

  return {
    version: getAppVersion(),
    exportedAt: new Date().toISOString(),
    data
  }
}

/**
 * Import user data from backup
 * @param {Object} backup - Exported backup object
 * @returns {boolean} True if import succeeded
 */
export const importUserData = (backup) => {
  if (!backup?.data) return false

  try {
    Object.entries(backup.data).forEach(([key, value]) => {
      localStorage.setItem(key, value)
    })
    return true
  } catch (error) {
    console.error('Import failed:', error)
    return false
  }
}

/**
 * Register service worker update handler
 * Called when vite-plugin-pwa detects an update
 * @param {function} onUpdateFound - Callback when update is available
 * @returns {function} Cleanup function
 */
export const registerUpdateHandler = (onUpdateFound) => {
  if (!('serviceWorker' in navigator)) {
    return () => {}
  }

  const handleControllerChange = () => {
    // New service worker took control, page will reload
    console.log('New service worker activated')
  }

  const handleUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration?.waiting) {
      onUpdateFound()
    }
  }

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

  // Check for updates periodically (every 30 min)
  const intervalId = setInterval(async () => {
    const hasUpdate = await checkForUpdates()
    if (hasUpdate) {
      onUpdateFound()
    }
  }, 30 * 60 * 1000)

  // Initial check after 10 seconds
  const timeoutId = setTimeout(handleUpdate, 10000)

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    clearInterval(intervalId)
    clearTimeout(timeoutId)
  }
}

/**
 * Get storage usage information
 * @returns {Promise<Object>} Storage quota and usage
 */
export const getStorageInfo = async () => {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percent: 0 }
  }

  try {
    const { usage, quota } = await navigator.storage.estimate()
    return {
      usage: Math.round(usage / 1024 / 1024 * 100) / 100, // MB
      quota: Math.round(quota / 1024 / 1024), // MB
      percent: Math.round((usage / quota) * 100)
    }
  } catch {
    return { usage: 0, quota: 0, percent: 0 }
  }
}

/**
 * Request persistent storage (prevents browser from clearing data)
 * @returns {Promise<boolean>} True if granted
 */
export const requestPersistentStorage = async () => {
  if (!navigator.storage?.persist) {
    return false
  }

  try {
    const granted = await navigator.storage.persist()
    return granted
  } catch {
    return false
  }
}
