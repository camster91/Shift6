/**
 * Service to handle localStorage interactions with error handling and prefixing.
 */

const STORAGE_PREFIX = 'shift6_';

export const storage = {
  load: (key, fallback = null) => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (saved === null) return fallback;
      return JSON.parse(saved);
    } catch (e) {
      console.warn(`Storage load failed for ${key}:`, e);
      return fallback;
    }
  },
  save: (key, value) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`Storage save failed for ${key}:`, e);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (e) {
      console.warn(`Storage remove failed for ${key}:`, e);
    }
  },
};
