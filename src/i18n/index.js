import { en } from './en';

const translations = { en };
const DEFAULT_LOCALE = 'en';

export function t(key) {
  const locale = localStorage.getItem('shift6_locale') || DEFAULT_LOCALE;
  const dict = translations[locale] || translations[DEFAULT_LOCALE];
  const keys = key.split('.');
  let value = dict;
  for (const k of keys) {
    value = value?.[k];
  }
  return value ?? key;
}

export { en };