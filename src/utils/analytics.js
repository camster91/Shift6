import ReactGA from 'react-ga4';

const GA_ID = 'G-MEASUREMENT_ID'; // Replace with real GA4 ID when ready
let initialized = false;

export function initAnalytics(measurementId) {
  if (initialized) return;
  const id = measurementId || GA_ID;
  if (id && id !== 'G-MEASUREMENT_ID') {
    ReactGA.initialize(id);
    initialized = true;
  }
}

export function trackEvent(name, params = {}) {
  if (!initialized) return;
  ReactGA.event({ action: name, category: 'armor', ...params });
}

export function trackPageView(path) {
  if (!initialized) return;
  ReactGA.send({ hitType: 'pageview', page: path });
}

// Predefined events
export const Events = {
  APP_OPEN: 'app_open',
  ONBOARDING_START: 'onboarding_start',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  WORKOUT_START: 'workout_start',
  SET_COMPLETE: 'set_complete',
  WORKOUT_COMPLETE: 'workout_complete',
  PR_HIT: 'pr_hit',
  STREAK_3: 'streak_3',
  STREAK_7: 'streak_7',
  EXERCISE_ADDED: 'exercise_added',
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_SCHEDULED: 'notification_scheduled',
};
