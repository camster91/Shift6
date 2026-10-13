import type { WorkoutDraftSetValues } from './types';
import { convertLoad, type LoadUnit } from './loadUnits';
export type VoiceNumericField = Exclude<keyof WorkoutDraftSetValues, 'loadUnit'>;
export interface VoiceSetBinding {
  ownerId: string;
  sessionId: string;
  programVersionId: string;
  workoutExerciseId: string;
  exerciseId: string;
  variantId?: string;
  setNumber: number;
  loadUnit: LoadUnit | 'unknown';
  contextKey: string;
  required: readonly VoiceNumericField[];
  allowed: readonly VoiceNumericField[];
}
export interface VoiceSetDraft {
  values: Partial<WorkoutDraftSetValues>;
  unresolved: string[];
}
export function voiceBindingKey(binding: VoiceSetBinding): string {
  return JSON.stringify(binding);
}
const maxima: Record<VoiceNumericField, number> = {
  load: 5000,
  reps: 1000,
  duration: 86400,
  distance: 1000000,
  rpe: 10,
  rir: 10,
};

/** Defense at the UI boundary: reviewed values can fill numeric fields only. */
export function reviewedVoiceValuesAreValid(
  values: Partial<WorkoutDraftSetValues>,
  binding: VoiceSetBinding,
): boolean {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return false;
  for (const [field, value] of Object.entries(values)) {
    if (field === 'loadUnit') continue;
    const key = field as VoiceNumericField;
    if (!binding.allowed.includes(key) || typeof value !== 'string' || !value.trim()) return false;
    const numeric = Number(value);
    if (
      !Number.isFinite(numeric) ||
      numeric < (key === 'rpe' ? 1 : 0) ||
      numeric > maxima[key] ||
      (['reps', 'duration', 'rir'].includes(key) && !Number.isInteger(numeric))
    )
      return false;
  }
  if (binding.required.some((field) => values[field] === undefined)) return false;
  if (values.load !== undefined)
    return (
      (values.loadUnit === 'kg' || values.loadUnit === 'lb') &&
      (binding.loadUnit === 'unknown' || values.loadUnit === binding.loadUnit)
    );
  return values.loadUnit === undefined;
}
const words: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const numberWords = [...Object.keys(words), 'hundred', 'thousand', 'and', 'point'].join('|');
const numberPattern = `(?:\\d+(?:\\.\\d+)?|(?:${numberWords})(?:[ -]+(?:${numberWords}))*)`;
function number(raw: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  const [whole, fraction, extra] = raw.split(' point ');
  if (extra !== undefined) return null;
  const wholeValue = integerWords(whole!.replaceAll('-', ' '));
  if (wholeValue === null) return null;
  if (fraction !== undefined) {
    const digits = fraction.split(' ').map((token) => words[token]);
    if (!digits.length || digits.some((digit) => digit === undefined || digit > 9)) return null;
    return Number(`${wholeValue}.${digits.join('')}`);
  }
  return wholeValue;
}
function integerWords(text: string): number | null {
  if (words[text] !== undefined) return words[text]!;
  const thousand = /^(.+) thousand(?: (?:and )?(.+))?$/.exec(text);
  if (thousand) {
    const first = integerWords(thousand[1]!);
    const last = thousand[2] ? integerWords(thousand[2]) : 0;
    return first !== null && first > 0 && first < 1000 && last !== null && last < 1000
      ? first * 1000 + last
      : null;
  }
  const hundred = /^(\w+) hundred(?: (?:and )?(.+))?$/.exec(text);
  if (hundred) {
    const first = words[hundred[1]!];
    const last = hundred[2] ? integerWords(hundred[2]) : 0;
    return first !== undefined && first > 0 && first < 10 && last !== null && last < 100
      ? first * 100 + last
      : null;
  }
  const parts = text.split(' ');
  const tens = words[parts[0]!],
    ones = words[parts[1]!];
  return parts.length === 2 &&
    tens !== undefined &&
    tens >= 20 &&
    tens % 10 === 0 &&
    ones !== undefined &&
    ones > 0 &&
    ones < 10
    ? tens + ones
    : null;
}

/** Bounded self-report grammar, not an LLM or a prescription. Unknown content is unresolved. */
export function parseVoiceSet(text: string, binding: VoiceSetBinding): VoiceSetDraft {
  const result: VoiceSetDraft = { values: {}, unresolved: [] };
  if (!text.trim() || text.length > 500)
    return { values: {}, unresolved: ['Use a short set entry of at most 500 characters.'] };
  let rest = text
    .toLowerCase()
    .trim()
    .replace(/[.!?]$/, '');
  const fields = new Set<string>();
  const suffix = new RegExp(
    `^(?:held for )?(${numberPattern})\\s+(reps left|reps remaining|repetitions|reps|kilograms|kg|pounds|lb|seconds|s|minutes|min|kilometers|km|meters|m|miles|rpe|rir)(?=$|[\\s,;])`,
  );
  const prefix = new RegExp(`^(rpe|rir)\\s+(${numberPattern})(?=$|[\\s,;])`);
  for (let count = 0; rest && count < 12; count++) {
    rest = rest.replace(/^(?:\s|,|;|and\s)+/, '');
    if (!rest) break;
    const match = suffix.exec(rest),
      reversed = match ? null : prefix.exec(rest);
    if (!match && !reversed) {
      result.unresolved.push(
        'Unrecognized or ambiguous words remain. Use explicit numbers and units, or type the values.',
      );
      break;
    }
    const raw = match?.[1] ?? reversed![2]!,
      unit = match?.[2] ?? reversed![1]!;
    const numeric = number(raw);
    rest = rest.slice((match ?? reversed)![0].length);
    let field: VoiceNumericField;
    let declaredUnit: LoadUnit | undefined;
    let value = numeric ?? NaN;
    if (['reps left', 'reps remaining', 'rir'].includes(unit)) field = 'rir';
    else if (unit === 'rpe') field = 'rpe';
    else if (['reps', 'repetitions'].includes(unit)) field = 'reps';
    else if (['kg', 'kilograms', 'lb', 'pounds'].includes(unit)) {
      field = 'load';
      const spokenUnit: LoadUnit = unit === 'kg' || unit === 'kilograms' ? 'kg' : 'lb';
      declaredUnit = binding.loadUnit === 'unknown' ? spokenUnit : binding.loadUnit;
      if (Number.isFinite(value) && value >= 0)
        value = convertLoad(value, spokenUnit, declaredUnit);
    } else if (['s', 'seconds', 'min', 'minutes'].includes(unit)) {
      field = 'duration';
      if (unit === 'min' || unit === 'minutes') value *= 60;
    } else {
      field = 'distance';
      if (unit === 'km' || unit === 'kilometers') value *= 1000;
      if (unit === 'miles') value *= 1609.344;
    }
    if (fields.has(field)) {
      result.unresolved.push(`More than one ${field} value; correct it explicitly.`);
      continue;
    }
    fields.add(field);
    if (!binding.allowed.includes(field)) {
      result.unresolved.push(`${field} does not belong to this set. Use manual entry.`);
      continue;
    }
    const maximum = maxima[field];
    if (
      !Number.isFinite(value) ||
      value < (field === 'rpe' ? 1 : 0) ||
      value > maximum ||
      (['reps', 'duration', 'rir'].includes(field) && !Number.isInteger(value))
    )
      result.unresolved.push(`${field} is invalid or outside the input range.`);
    else {
      result.values[field] = String(value);
      if (field === 'load') result.values.loadUnit = declaredUnit;
    }
  }
  if (rest && result.unresolved.length === 0)
    result.unresolved.push('Too many values; use a shorter set entry.');
  for (const field of binding.required)
    if (result.values[field] === undefined)
      result.unresolved.push(`Report ${field} explicitly; a planned value is not a result.`);
  return result;
}
