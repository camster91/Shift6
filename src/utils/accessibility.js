/**
 * Accessibility Utilities for Shift6
 * Provides language simplification and accessibility helpers
 */

import { ACCESSIBILITY_DEFAULTS, STORAGE_KEYS } from './constants'

/**
 * Plain language dictionary - maps fitness jargon to simple terms
 */
export const PLAIN_LANGUAGE = {
  'AMRAP': 'As Many As You Can',
  'amrap': 'as many as you can',
  'RPE': 'Effort Level (1-10)',
  'rpe': 'effort level',
  'Superset': 'Back-to-Back Exercises',
  'superset': 'back-to-back exercises',
  'Hypertrophy': 'Muscle Building',
  'hypertrophy': 'muscle building',
  'Progressive Overload': 'Gradually Doing More',
  'progressive overload': 'gradually doing more',
  'Deload': 'Easy Recovery Week',
  'deload': 'easy recovery week',
  'PR': 'Personal Best',
  'pr': 'personal best',
  'Rep': 'Repetition',
  'rep': 'repetition',
  'Reps': 'Repetitions',
  'reps': 'repetitions',
  'Set': 'Group of Reps',
  'Sets': 'Groups of Reps',
  'Rest': 'Break Between Sets',
  'Volume': 'Total Work Done',
  'volume': 'total work done',
  'Intensity': 'How Hard You Push',
  'intensity': 'how hard you push',
  'Compound': 'Multi-Joint',
  'compound': 'multi-joint',
  'Isolation': 'Single-Joint',
  'isolation': 'single-joint',
  'Failure': 'Until You Cannot Do More',
  'failure': 'until you cannot do more',
  'Warm-up': 'Getting Your Body Ready',
  'warmup': 'getting your body ready',
  'Cool-down': 'Slowing Down After Exercise',
  'cooldown': 'slowing down after exercise'
}

/**
 * Simplify text by replacing fitness jargon with plain language
 * @param {string} text - Text to simplify
 * @param {boolean} enabled - Whether plain language is enabled
 * @returns {string} - Simplified text
 */
export const simplifyText = (text, enabled = true) => {
  if (!enabled || !text) return text

  let simplified = text
  Object.entries(PLAIN_LANGUAGE).forEach(([term, plain]) => {
    // Use word boundaries for more accurate replacements
    const regex = new RegExp(`\\b${term}\\b`, 'g')
    simplified = simplified.replace(regex, plain)
  })
  return simplified
}

/**
 * Get accessibility settings from localStorage
 * @returns {Object} - Accessibility settings
 */
export const getAccessibilitySettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.accessibility)
    if (saved) {
      return { ...ACCESSIBILITY_DEFAULTS, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Failed to load accessibility settings:', e)
  }
  return { ...ACCESSIBILITY_DEFAULTS }
}

/**
 * Save accessibility settings to localStorage
 * @param {Object} settings - Settings to save
 */
export const saveAccessibilitySettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.accessibility, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save accessibility settings:', e)
  }
}

/**
 * Apply accessibility settings to document
 * @param {Object} settings - Accessibility settings
 */
export const applyAccessibilitySettings = (settings) => {
  const html = document.documentElement

  // Font size
  html.classList.remove('font-normal', 'font-large', 'font-extra-large')
  if (settings.fontSize === 'large') {
    html.classList.add('font-large')
  } else if (settings.fontSize === 'extra-large') {
    html.classList.add('font-extra-large')
  } else {
    html.classList.add('font-normal')
  }

  // High contrast
  if (settings.highContrast) {
    html.classList.add('high-contrast')
  } else {
    html.classList.remove('high-contrast')
  }

  // Reduced motion
  if (settings.reducedMotion) {
    html.classList.add('reduced-motion')
  } else {
    html.classList.remove('reduced-motion')
  }

  // Larger buttons
  if (settings.largerButtons) {
    html.classList.add('large-buttons')
  } else {
    html.classList.remove('large-buttons')
  }
}

/**
 * Get adjusted rest time for accessibility
 * @param {number} baseRest - Base rest time in seconds
 * @param {Object} settings - Accessibility settings
 * @returns {number} - Adjusted rest time
 */
export const getAdjustedRestTime = (baseRest, settings) => {
  if (settings?.longerRestTimes) {
    return Math.round(baseRest * 1.5) // 50% longer rest
  }
  return baseRest
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Get font size CSS variable value
 * @param {string} fontSize - Font size setting
 * @returns {string} - CSS font size value
 */
export const getFontSizeValue = (fontSize) => {
  switch (fontSize) {
    case 'large':
      return '18px'
    case 'extra-large':
      return '22px'
    default:
      return '16px'
  }
}

/**
 * Accessibility settings options for UI
 */
export const ACCESSIBILITY_OPTIONS = {
  fontSize: [
    { value: 'normal', label: 'Normal', description: 'Default text size' },
    { value: 'large', label: 'Large', description: '18px base size' },
    { value: 'extra-large', label: 'Extra Large', description: '22px base size' }
  ]
}

/**
 * Check if current settings indicate senior/accessibility user
 * @param {Object} settings - Accessibility settings
 * @returns {boolean}
 */
export const isAccessibilityUser = (settings) => {
  if (!settings) return false
  return (
    settings.fontSize !== 'normal' ||
    settings.highContrast ||
    settings.simpleLanguage ||
    settings.longerRestTimes ||
    settings.largerButtons
  )
}
