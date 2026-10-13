import { lifecycleDate } from './cycleLifecycle';
import {
  cycleHandoverSections,
  parseCycleHandoverRequest,
  sortHandoverSessions,
} from './cycleHandover';
import { createNextCycleCopy } from './programBuilder';
import { loadProvenanceSections } from './loadUnits';
import { coachReviewSections, parseCoachReviewReceipt } from './coachReviewJournal';
import {
  corroborateReviewGoal,
  type ReviewGoalEvent,
  type ReviewTargetRevision,
} from './coachReviewGoalWitness';
import { stableSnapshotJSON } from './programPersistence';
import {
  schedulePersistenceSections,
  decodeScheduleBaseline,
  cycleFromScheduleRow,
  sessionFromScheduleRow,
  scheduleRevisionFromRow,
  assertBaselineLegacyDates,
} from './scheduleSnapshot';
import { projectScheduleRevisions } from './scheduleRevision';
import type { ProgramVersion } from './types';
import {
  persistenceSections,
  type BuilderRecoverySnapshot,
  type CoachMemoryValue,
} from './localPersistence';
import { MIGRATIONS } from '../db/migrations';
import { buildLocalDataExportSummary, type LocalDataExport } from '../db/privacyRepository';
import { foundationalExercises } from './fixtures/exercises';
import { programLibrary } from './programLibrary';
import { parseOnboardingRecoveryState } from './onboardingRecovery';
import { equipmentCatalog } from './equipment';
import { accessibilityNeedOptions, movementConsiderationOptions } from './considerations';
import {
  normalizeObservation,
  validateMeasurementProtocol,
  type MeasurementProtocol,
  type ShiftObservation,
} from './shift';

export const MAX_RESTORE_BYTES = 20 * 1024 * 1024;
export const MAX_RESTORE_RECORDS = 50000;
export const restoreTables = {
  userProfiles: 'user_profiles',
  userEquipment: 'user_equipment',
  userConsiderations: 'user_considerations',
  bodyMetrics: 'body_metrics',
  coachPrivacyPreferences: 'coach_privacy_preferences',
  userPrograms: 'user_programs',
  userProgramVersions: 'user_program_versions',
  userExercises: 'user_exercises',
  trainingCycles: 'training_cycles',
  workoutSessions: 'workout_sessions',
  completedSets: 'completed_sets',
  workoutDrafts: 'workout_drafts',
  workoutCheckIns: 'workout_check_ins',
  shifts: 'shifts',
  shiftProtocols: 'shift_protocols',
  shiftObservations: 'shift_observations',
  shiftGoalRevisions: 'shift_goal_revisions',
  personalGoalEvents: 'personal_goal_events',
  personalGoalDrafts: 'personal_goal_drafts',
  onboardingDrafts: 'onboarding_drafts',
  coachProposals: 'coach_proposals',
  healthSummaries: 'health_summaries',
  notificationPreferences: 'notification_preferences',
  cycleReviews: 'cycle_reviews',
  workoutScheduleOverrides: 'workout_schedule_overrides',
  ...persistenceSections,
  ...loadProvenanceSections,
  ...schedulePersistenceSections,
  ...coachReviewSections,
  ...cycleHandoverSections,
} as const;
export type RestoreSection = keyof typeof restoreTables;
export type RestoreRow = Record<string, string | number | null>;
type Column = { name: string; type: string; nullable: boolean };

// Only trusted, checked-in migration identifiers participate in SQL generation.
// A backup cannot provide a table, column, statement or schema migration.
export function restoreColumns(table: string): Column[] {
  const columns: Column[] = [];
  for (const migration of MIGRATIONS)
    for (const statement of migration.statements) {
      const create = statement.match(/^CREATE TABLE(?: IF NOT EXISTS)? (\w+) \(([\s\S]*)\);$/i);
      if (create?.[1] === table) {
        let depth = 0,
          part = '';
        const parts: string[] = [];
        for (const character of create[2]!) {
          if (character === '(') depth++;
          if (character === ')') depth--;
          if (character === ',' && depth === 0) {
            parts.push(part);
            part = '';
          } else part += character;
        }
        parts.push(part);
        for (const declaration of parts) {
          const match = declaration.trim().match(/^(\w+) (TEXT|INTEGER|REAL)\b(.*)$/i);
          if (match)
            columns.push({
              name: match[1]!,
              type: match[2]!,
              nullable: !/NOT NULL/i.test(match[3]!),
            });
        }
      }
      const alter = statement.match(
        /^ALTER TABLE (\w+)\s+ADD COLUMN (\w+) (TEXT|INTEGER|REAL)\b([\s\S]*)/i,
      );
      if (alter?.[1] === table)
        columns.push({ name: alter[2]!, type: alter[3]!, nullable: !/NOT NULL/i.test(alter[4]!) });
    }
  if (!columns.length) throw new Error('Unknown restore table.');
  return columns;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function fail(message: string): never {
  throw new Error(`Backup cannot be restored: ${message}`);
}
function check(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}
function text(
  value: unknown,
  label: string,
  max = 10000,
  nonempty = false,
): asserts value is string {
  check(
    typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0),
    `invalid ${label}.`,
  );
}
function id(value: unknown): asserts value is string {
  text(value, 'identifier', 1024, true);
  check(!/[\u0000-\u001f]/.test(value), 'invalid identifier.');
}
function number(value: unknown, min = 0, max = 1e9, integer = false): asserts value is number {
  check(
    typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!integer || Number.isInteger(value)),
    'invalid numeric value.',
  );
}
function date(value: unknown) {
  text(value, 'date', 40, true);
  check(
    /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)),
    'invalid timestamp.',
  );
}
function keys(
  value: unknown,
  required: string[],
  optional: string[] = [],
): asserts value is Record<string, unknown> {
  check(isRecord(value), 'expected an object.');
  check(
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key)),
    'unexpected nested field.',
  );
  check(
    required.every((key) => Object.hasOwn(value, key)),
    'missing nested field.',
  );
}
function array(value: unknown): asserts value is unknown[] {
  check(Array.isArray(value) && value.length <= MAX_RESTORE_RECORDS, 'invalid array.');
}
function strings(value: unknown) {
  array(value);
  value.forEach((item) => text(item, 'list entry'));
}
function choice(value: unknown, choices: string[]) {
  check(typeof value === 'string' && choices.includes(value), 'invalid option.');
}
function unique(rows: Record<string, unknown>[], columns: string[], label: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = JSON.stringify(columns.map((column) => row[column]));
    check(!seen.has(key), `duplicate ${label}.`);
    seen.add(key);
  }
}
function scalar(value: unknown) {
  if (typeof value !== 'boolean') number(value);
}
function target(value: unknown) {
  keys(value, [], ['reps', 'load', 'durationSeconds', 'distanceMeters', 'rpe', 'rir', 'tempo']);
  for (const [key, item] of Object.entries(value)) {
    if (key === 'tempo') text(item, key, 100);
    else if (key === 'load') {
      keys(item, ['unit'], ['value', 'percentOfEstimatedOneRepMax']);
      choice(item.unit, ['metric', 'imperial']);
      if (item.value !== undefined) number(item.value);
      if (item.percentOfEstimatedOneRepMax !== undefined)
        number(item.percentOfEstimatedOneRepMax, 0, 100);
    } else if (key === 'reps' && isRecord(item)) {
      keys(item, ['min', 'max']);
      number(item.min, 0, 10000, true);
      number(item.max, item.min as number, 10000, true);
    } else number(item, 0, key === 'rpe' || key === 'rir' ? 10 : 1e9);
  }
}
function protocol(value: unknown): asserts value is MeasurementProtocol {
  keys(
    value,
    [
      'id',
      'version',
      'exerciseId',
      'variantId',
      'assistance',
      'equipmentSetup',
      'metric',
      'canonicalUnit',
      'direction',
    ],
    ['repCount', 'fixedDistanceMeters'],
  );
  ['id', 'exerciseId', 'variantId'].forEach((key) => id(value[key]));
  ['assistance', 'equipmentSetup'].forEach((key) => text(value[key], key, 10000, true));
  number(value.version, 1, 100000, true);
  const combinations: Record<string, string[]> = {
    reps: ['reps', 'higher'],
    'load-for-reps': ['kg', 'higher'],
    'hold-duration': ['seconds', 'higher'],
    'fixed-distance-time': ['seconds', 'lower'],
    distance: ['meters', 'higher'],
    completion: ['completed', 'complete'],
  };
  const combination = combinations[String(value.metric)];
  check(
    combination && combination[0] === value.canonicalUnit && combination[1] === value.direction,
    'invalid measurement protocol.',
  );
  if (value.repCount !== undefined) number(value.repCount, 1, 10000, true);
  if (value.fixedDistanceMeters !== undefined) number(value.fixedDistanceMeters, 0.000001);
  check(
    validateMeasurementProtocol(value as unknown as MeasurementProtocol).length === 0,
    'invalid measurement protocol.',
  );
}
function program(value: unknown, owner: string) {
  keys(
    value,
    [
      'id',
      'slug',
      'title',
      'description',
      'goals',
      'targetUser',
      'experience',
      'daysPerWeek',
      'sessionLengthMinutes',
      'requiredEquipmentIds',
      'optionalEquipmentIds',
      'progressionStrategy',
      'currentVersionId',
      'isTemplate',
    ],
    ['ownerId', 'sourceProgramId'],
  );
  id(value.id);
  id(value.currentVersionId);
  ['slug', 'title', 'description', 'targetUser'].forEach((key) => text(value[key], key));
  ['goals', 'experience', 'requiredEquipmentIds', 'optionalEquipmentIds'].forEach((key) =>
    strings(value[key]),
  );
  number(value.daysPerWeek, 1, 7, true);
  number(value.sessionLengthMinutes, 1, 1440, true);
  check(
    value.isTemplate === false && value.ownerId === owner,
    'only owned private plans can be restored.',
  );
  if (value.sourceProgramId !== undefined) id(value.sourceProgramId);
  choice(value.progressionStrategy, [
    'linear-load',
    'double-progression',
    'rep-target',
    'rpe-rir',
    'volume',
    'density',
    'time',
    'distance',
    'cardio',
    'skill',
  ]);
}
function version(value: unknown) {
  keys(value, [
    'id',
    'programId',
    'version',
    'status',
    'cycleModel',
    'workouts',
    'progressionRuleIds',
    'createdAt',
  ]);
  id(value.id);
  id(value.programId);
  number(value.version, 1, 100000, true);
  choice(value.status, ['draft', 'published', 'retired']);
  date(value.createdAt);
  strings(value.progressionRuleIds);
  keys(value.cycleModel, ['lengthWeeks', 'weekSixMeaning', 'phases']);
  check(value.cycleModel.lengthWeeks === 6, 'invalid cycle length.');
  choice(value.cycleModel.weekSixMeaning, [
    'evaluation',
    'consolidation',
    'reduced-volume',
    'rep-pr',
    'technique',
    'normal-training',
  ]);
  keys(value.cycleModel.phases, ['1', '2', '3', '4', '5', '6']);
  Object.values(value.cycleModel.phases).forEach((item) => text(item, 'phase', 200));
  array(value.workouts);
  unique(value.workouts as Record<string, unknown>[], ['id'], 'workout');
  for (const workout of value.workouts) {
    keys(
      workout,
      [
        'id',
        'programVersionId',
        'title',
        'dayOfWeek',
        'focus',
        'estimatedDurationMinutes',
        'equipmentIds',
        'exercises',
      ],
      ['sourceWorkoutId', 'isOptional'],
    );
    id(workout.id);
    check(workout.programVersionId === value.id, 'workout version mismatch.');
    text(workout.title, 'workout title');
    number(workout.dayOfWeek, 1, 7, true);
    number(workout.estimatedDurationMinutes, 0, 1440);
    strings(workout.equipmentIds);
    choice(workout.focus, ['strength', 'cardio', 'mobility', 'conditioning', 'recovery', 'mixed']);
    if (workout.isOptional !== undefined)
      check(typeof workout.isOptional === 'boolean', 'invalid optional workout.');
    if (workout.sourceWorkoutId !== undefined) id(workout.sourceWorkoutId);
    array(workout.exercises);
    unique(workout.exercises as Record<string, unknown>[], ['id'], 'workout movement');
    for (const movement of workout.exercises) {
      keys(
        movement,
        ['id', 'exerciseId', 'order', 'section', 'sets'],
        ['variantId', 'supersetGroupId', 'groupType', 'notes'],
      );
      id(movement.id);
      id(movement.exerciseId);
      number(movement.order, 0, 10000, true);
      choice(movement.section, ['warm-up', 'working', 'cooldown', 'cardio', 'mobility']);
      for (const key of ['variantId', 'supersetGroupId'])
        if (movement[key] !== undefined) id(movement[key]);
      if (movement.groupType !== undefined) choice(movement.groupType, ['superset', 'circuit']);
      if (movement.notes !== undefined) text(movement.notes, 'notes');
      array(movement.sets);
      unique(movement.sets as Record<string, unknown>[], ['id'], 'set');
      unique(movement.sets as Record<string, unknown>[], ['setNumber'], 'set number');
      for (const set of movement.sets) {
        keys(set, ['id', 'setNumber', 'target'], ['restSeconds']);
        id(set.id);
        number(set.setNumber, 1, 1000, true);
        target(set.target);
        if (set.restSeconds !== undefined) number(set.restSeconds, 0, 86400);
      }
    }
  }
}
function exercise(value: unknown) {
  keys(
    value,
    [
      'id',
      'name',
      'aliases',
      'movementPattern',
      'primaryMuscles',
      'secondaryMuscles',
      'equipmentIds',
      'setup',
      'difficulty',
      'instructions',
      'techniqueCues',
      'commonMistakes',
      'safetyNotes',
      'unilateral',
      'trackingType',
      'tags',
      'media',
      'isCustom',
      'contentStatus',
    ],
    ['classification', 'notes', 'reviewedAt', 'reviewedBy'],
  );
  id(value.id);
  ['name', 'setup'].forEach((key) => text(value[key], key));
  for (const key of [
    'aliases',
    'primaryMuscles',
    'secondaryMuscles',
    'equipmentIds',
    'instructions',
    'techniqueCues',
    'commonMistakes',
    'safetyNotes',
    'tags',
  ])
    strings(value[key]);
  choice(value.movementPattern, [
    'squat',
    'hinge',
    'horizontal-push',
    'vertical-push',
    'horizontal-pull',
    'vertical-pull',
    'lunge-split-stance',
    'carry',
    'rotation',
    'anti-rotation',
    'anti-extension',
    'locomotion',
    'cyclical-cardio',
    'mobility',
    'power',
    'balance',
  ]);
  choice(value.difficulty, ['beginner', 'intermediate', 'advanced']);
  choice(value.trackingType, ['reps', 'time', 'distance', 'duration-and-distance', 'custom']);
  choice(value.contentStatus, ['draft', 'reviewed', 'retired']);
  check(
    value.isCustom === true && typeof value.unilateral === 'boolean',
    'invalid custom movement.',
  );
  if (value.classification !== undefined) choice(value.classification, ['compound', 'isolation']);
  for (const key of ['notes', 'reviewedBy']) if (value[key] !== undefined) text(value[key], key);
  if (value.reviewedAt !== undefined) date(value.reviewedAt);
  array(value.media);
  for (const media of value.media) {
    keys(media, ['id', 'type', 'uri', 'altText', 'reviewStatus']);
    id(media.id);
    choice(media.type, ['image', 'video']);
    text(media.uri, 'media URI', 4096);
    text(media.altText, 'media description');
    choice(media.reviewStatus, ['draft', 'technique-review', 'approved']);
  }
}

function safeJSON(value: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    fail('invalid nested JSON.');
  }
  let nodes = 0;
  function walk(item: unknown, depth: number) {
    check(++nodes <= 200000 && depth <= 24, 'nested data is too large.');
    if (isRecord(item))
      for (const [key, child] of Object.entries(item)) {
        check(!['__proto__', 'prototype', 'constructor'].includes(key), 'unsafe nested field.');
        walk(child, depth + 1);
      }
    else if (Array.isArray(item)) item.forEach((child) => walk(child, depth + 1));
    else if (typeof item === 'string') text(item, 'nested text', 100000);
    else if (typeof item === 'number') check(Number.isFinite(item), 'invalid nested number.');
  }
  walk(parsed, 0);
  return parsed;
}
export interface RestorePreview {
  data: LocalDataExport;
  recordCount: number;
  exportedAt: string;
  warnings: string[];
}

export function validateLocalBackup(serialized: string): RestorePreview {
  check(
    new TextEncoder().encode(serialized).byteLength <= MAX_RESTORE_BYTES,
    'file exceeds 20 MiB.',
  );
  let raw: unknown;
  try {
    raw = JSON.parse(serialized);
  } catch {
    fail('file is not valid JSON.');
  }
  check(isRecord(raw), 'file is not an export.');
  check(
    raw.schemaVersion === 12 ||
      raw.schemaVersion === 13 ||
      raw.schemaVersion === 14 ||
      raw.schemaVersion === 15 ||
      raw.schemaVersion === 16 ||
      raw.schemaVersion === 17,
    'only export schemas 12, 13, 14, 15, 16 and 17 are supported. Other versions need a compatible app.',
  );
  const sections = Object.keys(restoreTables) as RestoreSection[];
  const sourceSections = sections.filter(
    (key) =>
      (raw.schemaVersion !== 12 || !(key in persistenceSections)) &&
      (raw.schemaVersion === 14 ||
        raw.schemaVersion === 15 ||
        raw.schemaVersion === 16 ||
        raw.schemaVersion === 17 ||
        !(key in loadProvenanceSections)) &&
      (raw.schemaVersion === 15 ||
        raw.schemaVersion === 16 ||
        raw.schemaVersion === 17 ||
        !(key in schedulePersistenceSections)) &&
      (raw.schemaVersion === 16 || raw.schemaVersion === 17 || !(key in coachReviewSections)) &&
      (raw.schemaVersion === 17 || !(key in cycleHandoverSections)),
  );
  keys(
    raw,
    [
      'schemaVersion',
      'exportedAt',
      'userId',
      'summary',
      ...sourceSections.filter(
        (key) => !['personalGoalEvents', 'personalGoalDrafts', 'onboardingDrafts'].includes(key),
      ),
    ],
    ['personalGoalEvents', 'personalGoalDrafts', 'onboardingDrafts'],
  );
  id(raw.userId);
  date(raw.exportedAt);
  const owner = raw.userId;
  keys(raw.summary, [
    'scope',
    'title',
    'description',
    'limitations',
    'totalRecordCount',
    'sections',
  ]);
  check(raw.summary.scope === 'local-device', 'invalid export scope.');
  const summary = raw.summary;
  ['title', 'description', 'limitations'].forEach((key) => text(summary[key], key));
  number(raw.summary.totalRecordCount, 0, MAX_RESTORE_RECORDS, true);
  array(raw.summary.sections);
  for (const section of raw.summary.sections) {
    keys(section, ['key', 'title', 'description', 'recordCount']);
    ['key', 'title', 'description'].forEach((key) => text(section[key], key));
    number(section.recordCount, 0, MAX_RESTORE_RECORDS, true);
  }
  const parsed = new Map<string, unknown>();
  let count = 0;
  for (const key of sections) {
    const rows = raw[key] ?? [];
    array(rows);
    count += rows.length;
    check(count <= MAX_RESTORE_RECORDS, 'too many records.');
    raw[key] = rows;
    const columns = restoreColumns(restoreTables[key]);
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      keys(
        row,
        columns.map((column) => column.name),
      );
      for (const column of columns) {
        const value = row[column.name];
        if (value === null) {
          check(column.nullable, `missing ${key}.${column.name}.`);
          continue;
        }
        if (column.type === 'TEXT')
          text(
            value,
            `${key}.${column.name}`,
            column.name.endsWith('_json') ? MAX_RESTORE_BYTES : 10000,
          );
        else number(value, column.name === 'value' ? -1e9 : 0, 1e9, column.type === 'INTEGER');
        if (column.name === 'user_id' || (key === 'userProfiles' && column.name === 'id'))
          check(value === owner, 'foreign owner record.');
        if (column.name.endsWith('_at')) date(value);
        if (column.name === 'id' || column.name.endsWith('_id')) id(value);
        if (column.name.endsWith('_json'))
          parsed.set(`${key}:${index}:${column.name}`, safeJSON(value as string));
      }
      const identity =
        key === 'completedSetLoadProvenance'
          ? ['completed_set_id']
          : key === 'userEquipment'
            ? ['user_id', 'equipment_id']
            : key === 'shiftProtocols'
              ? ['shift_id', 'protocol_id', 'protocol_version']
              : key === 'healthSummaries'
                ? ['user_id', 'source', 'id']
                : key === 'personalGoalDrafts'
                  ? ['user_id', 'cycle_id']
                  : Object.hasOwn(row, 'id')
                    ? ['id']
                    : Object.hasOwn(row, 'session_id')
                      ? ['session_id']
                      : ['user_id'];
      if (index === rows.length - 1) unique(rows as Record<string, unknown>[], identity, key);
    }
  }
  check(count === raw.summary.totalRecordCount, 'record count does not match export.');
  const data = raw as unknown as LocalDataExport;
  const get = (key: RestoreSection, index: number, column: string) =>
    parsed.get(`${key}:${index}:${column}`);
  const map = (key: RestoreSection) =>
    new Map((data[key] ?? []).map((row) => [String(row.id), row]));
  const profiles = map('userProfiles'),
    plans = map('userPrograms'),
    versions = map('userProgramVersions'),
    cycles = map('trainingCycles'),
    sessions = map('workoutSessions'),
    goals = map('shifts'),
    observations = map('shiftObservations'),
    revisions = map('shiftGoalRevisions');
  check(profiles.size <= 1, 'multiple profiles.');
  if (sections.some((key) => key !== 'onboardingDrafts' && (data[key]?.length ?? 0) > 0))
    check(profiles.has(owner), 'missing owned profile.');
  const versionObjects = new Map<string, Record<string, unknown>>();
  const exerciseIds = new Set([
    ...foundationalExercises.map((item) => item.id),
    ...data.userExercises.map((row) => String(row.id)),
  ]);
  for (const [index, row] of data.userPrograms.entries()) {
    const value = get('userPrograms', index, 'program_json');
    program(value, owner);
    check(
      isRecord(value) &&
        value.id === row.id &&
        value.sourceProgramId === (row.source_program_id ?? undefined),
      'program identity mismatch.',
    );
    check(
      versions.get(String(value.currentVersionId))?.program_id === row.id,
      'missing current program version.',
    );
  }
  for (const [index, row] of data.userExercises.entries()) {
    const value = get('userExercises', index, 'exercise_json');
    exercise(value);
    check(isRecord(value) && value.id === row.id, 'movement identity mismatch.');
  }
  for (const [index, row] of data.userProgramVersions.entries()) {
    const value = get('userProgramVersions', index, 'version_json');
    version(value);
    check(
      isRecord(value) &&
        value.id === row.id &&
        value.programId === row.program_id &&
        value.version === row.version &&
        value.status === row.status &&
        value.createdAt === row.created_at &&
        plans.has(String(row.program_id)),
      'immutable version identity mismatch.',
    );
    versionObjects.set(String(row.id), value);
  }
  unique(data.userProgramVersions, ['program_id', 'version'], 'program version number');
  for (const entry of programLibrary)
    if (entry.version && !versionObjects.has(entry.version.id))
      versionObjects.set(entry.version.id, entry.version as unknown as Record<string, unknown>);
  const movements = (versionId: unknown, workoutId?: unknown) => {
    const value = versionObjects.get(String(versionId));
    check(value, 'missing immutable program version.');
    const workouts = value.workouts as Record<string, unknown>[];
    if (workoutId !== undefined)
      check(
        workouts.some((workout) => workout.id === workoutId),
        'missing workout.',
      );
    return workouts
      .filter((workout) => workoutId === undefined || workout.id === workoutId)
      .flatMap((workout) => workout.exercises as Record<string, unknown>[]);
  };
  for (const value of versionObjects.values())
    for (const movement of movements(value.id))
      check(exerciseIds.has(String(movement.exerciseId)), 'missing exercise reference.');
  for (const [index, row] of data.trainingCycles.entries()) {
    movements(row.program_version_id);
    choice(row.status, ['planned', 'active', 'complete', 'paused', 'cancelled']);
    number(row.current_week, 1, 6, true);
    const weeks = get('trainingCycles', index, 'weeks_json');
    array(weeks);
    check(weeks.length === 6, 'cycle requires six week snapshots.');
    unique(weeks as Record<string, unknown>[], ['weekNumber'], 'cycle week');
    for (const week of weeks) {
      keys(week, [
        'weekNumber',
        'label',
        'phase',
        'status',
        'completedWorkoutCount',
        'plannedWorkoutCount',
      ]);
      number(week.weekNumber, 1, 6, true);
      text(week.label, 'week label');
      text(week.phase, 'week phase');
      choice(week.status, ['completed', 'current', 'upcoming', 'missed', 'partial']);
      number(week.completedWorkoutCount, 0, 10000, true);
      number(week.plannedWorkoutCount, 0, 10000, true);
    }
  }
  for (const row of data.workoutSessions) {
    const cycle = cycles.get(String(row.cycle_id));
    check(
      cycle && cycle.program_version_id === row.program_version_id,
      'session cycle/version mismatch.',
    );
    movements(row.program_version_id, row.workout_id);
    number(row.cycle_week, 1, 6, true);
    choice(row.status, ['planned', 'in-progress', 'complete', 'partial', 'skipped', 'abandoned']);
    choice(row.workout_focus, [
      'strength',
      'cardio',
      'mobility',
      'conditioning',
      'recovery',
      'mixed',
    ]);
    check([0, 1].includes(row.is_offline as number), 'invalid offline flag.');
    if (row.readiness !== null) choice(row.readiness, ['ready', 'limited', 'rest']);
    if (row.completion_reason !== null)
      choice(row.completion_reason, [
        'all-targets',
        'time-limited',
        'readiness',
        'discomfort',
        'equipment',
        'other',
      ]);
  }
  for (const row of data.completedSets) {
    const session = sessions.get(String(row.session_id));
    check(session, 'orphan set.');
    const movement = movements(session.program_version_id, session.workout_id).find(
      (item) => item.id === row.workout_exercise_id,
    );
    check(
      movement && (row.exercise_id === null || movement.exerciseId === row.exercise_id),
      'set movement mismatch.',
    );
    check(
      (movement.sets as Record<string, unknown>[]).some((set) => set.setNumber === row.set_number),
      'set number outside saved prescription.',
    );
  }
  unique(data.completedSets, ['idempotency_key'], 'completed-set operation');
  unique(data.completedSets, ['session_id', 'workout_exercise_id', 'set_number'], 'completed set');
  for (const key of ['workoutDrafts', 'workoutCheckIns'] as const)
    for (const [index, row] of data[key].entries()) {
      const session = sessions.get(String(row.session_id));
      check(session, 'orphan workout data.');
      if (key === 'workoutDrafts') {
        const value = get(key, index, 'values_json');
        check(isRecord(value), 'invalid workout draft.');
        const allowed = new Set(
          movements(session.program_version_id, session.workout_id).flatMap((item) =>
            (item.sets as Record<string, unknown>[]).map((set) => `${item.id}:${set.setNumber}`),
          ),
        );
        for (const [entry, fields] of Object.entries(value)) {
          check(allowed.has(entry), 'orphan draft set.');
          keys(fields, ['load', 'reps', 'duration', 'distance', 'rpe', 'rir']);
          Object.values(fields).forEach((field) => text(field, 'draft input', 240));
        }
      }
    }
  const protocolObjects = new Map<string, MeasurementProtocol>();
  const protocolKey = (row: Record<string, unknown>) =>
    JSON.stringify([row.shift_id, row.protocol_id, row.protocol_version]);
  for (const [index, row] of data.shiftProtocols.entries()) {
    const value = get('shiftProtocols', index, 'snapshot_json');
    protocol(value);
    check(
      goals.has(String(row.shift_id)) &&
        value.id === row.protocol_id &&
        value.version === row.protocol_version,
      'protocol identity mismatch.',
    );
    protocolObjects.set(protocolKey(row), value);
  }
  for (const [index, row] of data.shifts.entries()) {
    const cycle = cycles.get(String(row.cycle_id));
    check(
      cycle && cycle.program_version_id === row.program_version_id,
      'goal prescription mismatch.',
    );
    check(
      protocolObjects.has(
        JSON.stringify([row.id, row.active_protocol_id, row.active_protocol_version]),
      ),
      'missing active protocol.',
    );
    scalar(get('shifts', index, 'target_json'));
    choice(row.baseline_state, ['measured', 'not-yet-able', 'deferred', 'missing']);
    choice(row.review_state, ['due', 'completed', 'declined', 'postponed', 'missing']);
    choice(row.next_choice, ['maintain', 'repeat', 'modify', 'new-goal', 'break', 'undecided']);
    check([0, 1].includes(row.is_primary as number), 'invalid primary goal flag.');
    number(row.template_version, 1, 100000, true);
    const active = protocolObjects.get(
      JSON.stringify([row.id, row.active_protocol_id, row.active_protocol_version]),
    )!;
    const goalTarget = get('shifts', index, 'target_json');
    check(
      active.metric === 'completion'
        ? goalTarget === true
        : typeof goalTarget === 'number' &&
            goalTarget > 0 &&
            (active.metric !== 'reps' || Number.isInteger(goalTarget)),
      'invalid goal target.',
    );
    check(
      (row.baseline_state === 'measured') === (row.baseline_observation_id !== null),
      'baseline state mismatch.',
    );
    if (row.baseline_observation_id !== null)
      check(
        observations.get(String(row.baseline_observation_id))?.shift_id === row.id,
        'missing baseline observation.',
      );
  }
  unique(data.shifts, ['cycle_id'], 'cycle goal');
  check(data.shifts.filter((row) => row.is_primary === 1).length <= 1, 'multiple primary goals.');
  for (const [index, row] of data.shiftObservations.entries()) {
    const savedProtocol = protocolObjects.get(protocolKey(row));
    check(savedProtocol, 'orphan observation.');
    const value = get('shiftObservations', index, 'value_json');
    choice(row.source, ['assessment', 'historical-entry', 'import', 'qualifying-workout']);
    if (row.source === 'qualifying-workout')
      check(row.workout_session_id !== null, 'qualifying observation needs a workout.');
    check(
      normalizeObservation(savedProtocol, {
        id: row.id,
        shiftId: row.shift_id,
        protocolId: row.protocol_id,
        protocolVersion: row.protocol_version,
        measuredAt: row.measured_at,
        source: row.source,
        value,
        unit: row.unit,
      } as ShiftObservation),
      'invalid goal observation.',
    );
    if (row.workout_session_id !== null)
      check(sessions.has(String(row.workout_session_id)), 'orphan qualifying workout.');
    if (row.corrects_observation_id !== null) {
      const parent = observations.get(String(row.corrects_observation_id));
      check(
        parent &&
          parent.id !== row.id &&
          parent.shift_id === row.shift_id &&
          parent.protocol_id === row.protocol_id &&
          parent.protocol_version === row.protocol_version &&
          parent.measured_at === row.measured_at,
        'invalid correction reference.',
      );
    }
  }
  for (const [index, row] of data.shiftGoalRevisions.entries()) {
    check(protocolObjects.has(protocolKey(row)), 'orphan revision protocol.');
    scalar(get('shiftGoalRevisions', index, 'target_json'));
    if (row.previous_revision_id !== null)
      check(
        revisions.get(String(row.previous_revision_id))?.shift_id === row.shift_id &&
          row.previous_revision_id !== row.id,
        'invalid revision history.',
      );
  }
  // Corrections form a single chain. Importing two children of one original
  // would bypass the same "already corrected" rule used during local entry.
  unique(
    data.shiftObservations.filter((row) => row.corrects_observation_id !== null),
    ['corrects_observation_id'],
    'correction parent (branched corrections are not supported)',
  );
  for (const [index, row] of (data.personalGoalEvents ?? []).entries()) {
    check(goals.has(String(row.shift_id)), 'orphan goal journal.');
    const value = get('personalGoalEvents', index, 'payload_json');
    validateEvent(String(row.kind), value);
    check(isRecord(value), 'invalid goal journal.');
    if (row.kind === 'created')
      check(goals.get(String(row.shift_id))?.cycle_id === value.cycleId, 'journal cycle mismatch.');
    if (row.kind === 'measurement') {
      const saved = value.observation as Record<string, unknown>;
      const observed = observations.get(String(saved.id));
      check(
        observed &&
          observed.shift_id === row.shift_id &&
          saved.shiftId === row.shift_id &&
          observed.protocol_id === saved.protocolId &&
          observed.protocol_version === saved.protocolVersion &&
          observed.measured_at === saved.measuredAt &&
          observed.source === saved.source &&
          JSON.parse(String(observed.value_json)) === saved.value &&
          observed.unit === saved.unit &&
          (observed.corrects_observation_id ?? undefined) === saved.correctsObservationId,
        'journal observation mismatch.',
      );
    }
    if (row.kind === 'review') {
      const baseline = value.baseline as Record<string, unknown>;
      if (baseline.state === 'measured')
        check(
          observations.get(String(baseline.observationId))?.shift_id === row.shift_id,
          'orphan journal baseline.',
        );
    }
  }
  for (const [index, row] of (data.personalGoalDrafts ?? []).entries()) {
    check(cycles.has(String(row.cycle_id)), 'orphan goal draft.');
    const fields = get('personalGoalDrafts', index, 'fields_json');
    keys(
      fields,
      [],
      [
        'objective',
        'metric',
        'target',
        'repCount',
        'fixedDistance',
        'assistance',
        'setup',
        'inputUnits',
        'replace',
      ],
    );
    Object.values(fields).forEach((field) => text(field, 'goal draft', 240));
    if (fields.inputUnits !== undefined) choice(fields.inputUnits, ['metric', 'imperial']);
  }
  for (const [index] of (data.onboardingDrafts ?? []).entries()) {
    const value = get('onboardingDrafts', index, 'state_json');
    keys(value, [
      'version',
      'flow',
      'step',
      'draft',
      'movementConsiderations',
      'accessibilityNeeds',
    ]);
    keys(value.draft, [
      'displayName',
      'goals',
      'experience',
      'equipmentIds',
      'trainingDaysPerWeek',
      'preferredSessionMinutes',
      'preferredTrainingTime',
      'unitSystem',
      'coachTone',
      'coachIntervention',
      'healthConnection',
    ]);
    check(parseOnboardingRecoveryState(value), 'invalid setup draft.');
  }
  for (const key of [
    'userEquipment',
    'userConsiderations',
    'bodyMetrics',
    'coachPrivacyPreferences',
    'notificationPreferences',
    'healthSummaries',
    'cycleReviews',
    'workoutScheduleOverrides',
  ] as const)
    if (data[key].length) check(profiles.has(owner), 'orphan profile data.');
  for (const row of [
    ...data.cycleReviews,
    ...data.workoutScheduleOverrides,
    ...data.coachProposals,
  ])
    check(cycles.has(String(row.cycle_id)), 'orphan cycle data.');
  for (const row of data.workoutScheduleOverrides) {
    const cycle = cycles.get(String(row.cycle_id))!;
    movements(cycle.program_version_id, row.workout_id);
    number(row.cycle_week, 1, 6, true);
  }
  for (const [index, row] of data.userProfiles.entries()) {
    choice(row.unit_system, ['metric', 'imperial']);
    choice(row.experience, ['beginner', 'intermediate', 'advanced']);
    choice(row.coach_tone, ['concise', 'supportive', 'technical']);
    choice(row.coach_intervention, ['conservative', 'balanced', 'proactive']);
    choice(row.health_connection, ['not-now', 'apple-health', 'health-connect']);
    choice(row.preferred_training_time, ['morning', 'afternoon', 'evening']);
    number(row.training_days_per_week, 1, 7, true);
    number(row.preferred_session_minutes, 1, 1440);
    strings(get('userProfiles', index, 'goals_json'));
    for (const goal of get('userProfiles', index, 'goals_json') as unknown[])
      choice(goal, [
        'general-health',
        'strength',
        'muscle',
        'conditioning',
        'fat-loss-support',
        'mobility',
        'athletic-performance',
        'healthy-ageing',
        'consistent-training',
      ]);
  }
  for (const [index] of data.userConsiderations.entries()) {
    strings(get('userConsiderations', index, 'movement_considerations_json'));
    strings(get('userConsiderations', index, 'accessibility_needs_json'));
    for (const item of get(
      'userConsiderations',
      index,
      'movement_considerations_json',
    ) as unknown[])
      choice(
        item,
        movementConsiderationOptions.map((option) => option.value),
      );
    for (const item of get('userConsiderations', index, 'accessibility_needs_json') as unknown[])
      choice(
        item,
        accessibilityNeedOptions.map((option) => option.value),
      );
  }
  for (const [index, row] of data.coachProposals.entries()) {
    choice(row.confidence, ['low', 'medium', 'high']);
    choice(row.status, ['pending', 'accepted', 'partially-accepted', 'rejected', 'expired']);
    strings(get('coachProposals', index, 'evidence_json'));
    strings(get('coachProposals', index, 'safety_notes_json'));
    const changes = get('coachProposals', index, 'changes_json');
    array(changes);
    for (const change of changes) {
      keys(
        change,
        ['id', 'type', 'field', 'from', 'to', 'requiresUserConfirmation'],
        ['exerciseId', 'workoutId', 'workoutExerciseId'],
      );
      check(change.requiresUserConfirmation === true, 'unsafe proposal confirmation.');
      choice(change.type, [
        'target-change',
        'exercise-substitution',
        'set-count-change',
        'schedule-change',
        'program-change',
      ]);
      Object.entries(change)
        .filter(([key]) => key !== 'requiresUserConfirmation')
        .forEach(([, item]) => text(item, 'proposal field'));
    }
  }
  for (const row of data.userEquipment)
    check(
      equipmentCatalog.some((item) => item.id === row.equipment_id),
      'unknown equipment.',
    );
  for (const row of data.completedSets)
    for (const field of ['rpe', 'rir']) if (row[field] !== null) number(row[field], 0, 10);
  for (const row of data.workoutCheckIns) {
    check([0, 1].includes(row.discomfort_reported as number), 'invalid discomfort flag.');
    for (const field of ['energy', 'soreness', 'perceived_exertion'])
      if (row[field] !== null) number(row[field], 1, 5, true);
  }
  for (const row of data.notificationPreferences)
    for (const field of [
      'workout_reminders',
      'rest_timer',
      'weekly_review',
      'cycle_review',
      'coach_messages',
    ])
      check([0, 1].includes(row[field] as number), 'invalid notification preference.');
  for (const row of data.coachPrivacyPreferences) {
    check([0, 1].includes(row.provider_coach_enabled as number), 'invalid consent flag.');
    number(row.notice_version, 1, 100000, true);
  }
  for (const row of data.bodyMetrics) {
    choice(row.metric_type, ['weight', 'waist', 'body-fat']);
    choice(row.unit, ['kg', 'lb', 'cm', 'in', 'percent']);
    number(row.value);
  }
  for (const row of data.healthSummaries) {
    choice(row.health_type, [
      'steps',
      'workouts',
      'heart-rate',
      'resting-heart-rate',
      'sleep-duration',
      'weight',
    ]);
    number(row.value);
    check(
      Date.parse(String(row.end_at)) >= Date.parse(String(row.start_at)),
      'invalid health interval.',
    );
  }
  for (const row of data.cycleReviews) {
    if (row.overall_rating !== null) number(row.overall_rating, 1, 5, true);
    if (row.focus !== null)
      choice(row.focus, [
        'same-course',
        'more-strength',
        'more-conditioning',
        'more-mobility',
        'improve-consistency',
        'recover-better',
      ]);
    if (row.next_action !== null)
      choice(row.next_action, [
        'repeat',
        'progress',
        'adjust',
        'change-exercises',
        'change-program',
        'build-new',
      ]);
  }
  unique(data.cycleReviews, ['cycle_id'], 'cycle review');
  unique(
    data.workoutScheduleOverrides,
    ['cycle_id', 'cycle_week', 'workout_id'],
    'scheduled workout',
  );
  for (const row of data.workoutScheduleOverrides)
    for (const field of ['original_date', 'scheduled_date']) {
      const value = String(row[field]);
      check(
        /^\d{4}-\d\d-\d\d$/.test(value) && new Date(value).toISOString().slice(0, 10) === value,
        'invalid schedule date.',
      );
    }
  for (const [records, parentField] of [
    [data.shiftObservations, 'corrects_observation_id'],
    [data.shiftGoalRevisions, 'previous_revision_id'],
  ] as const) {
    const recordById = new Map(records.map((row) => [String(row.id), row]));
    const done = new Set<string>();
    for (const row of records) {
      const visited = new Set<string>();
      let current: Record<string, unknown> | undefined = row;
      while (current?.[parentField] !== null && current?.[parentField] !== undefined) {
        const currentId = String(current.id);
        if (done.has(currentId)) break;
        check(!visited.has(currentId), 'cyclic history reference.');
        visited.add(currentId);
        current = recordById.get(String(current[parentField]));
      }
      visited.forEach((id) => done.add(id));
    }
  }
  validatePersistenceGraph(data);
  for (const row of data.completedSetLoadProvenance ?? []) {
    const saved = data.completedSets.find((set) => set.id === row.completed_set_id);
    const session = data.workoutSessions.find((entry) => entry.id === row.session_id);
    check(
      saved &&
        session &&
        saved.session_id === row.session_id &&
        saved.load !== null &&
        row.load_value === saved.load &&
        row.set_completed_at === saved.completed_at,
      'load provenance does not match its owned current set.',
    );
    choice(row.load_unit, ['kg', 'lb']);
    number(row.load_value, 0);
    check(
      Date.parse(String(row.recorded_at)) >= Date.parse(String(session.started_at)),
      'load provenance precedes its session.',
    );
  }
  for (const row of data.workoutDraftLoadUnits ?? []) {
    const draft = data.workoutDrafts.find((entry) => entry.session_id === row.session_id);
    check(
      draft && draft.updated_at === row.updated_at,
      'draft unit snapshot does not match its draft.',
    );
    const units = safeJSON(String(row.load_units_json));
    const values = safeJSON(String(draft.values_json));
    check(isRecord(units) && isRecord(values), 'invalid draft unit map.');
    for (const [key, unit] of Object.entries(units)) {
      check(Object.hasOwn(values, key), 'unknown draft unit set.');
      choice(unit, ['kg', 'lb']);
    }
  }
  const warnings = [
    'Restore works only on an empty local installation; it does not merge or overwrite existing records.',
    'Health connections, provider consent and notification choices reset to off. Device permissions are never granted by restore.',
    'Media files are not included. Custom media links are removed; add your media again on this device.',
    'Identifiers and immutable versions are preserved; owner fields map to the current guest. This is local recovery, not cloud sync.',
  ];
  unique(data.scheduleBaselines ?? [], ['cycle_id'], 'schedule baseline');
  unique(data.scheduleBaselines ?? [], ['operation_id'], 'schedule baseline operation');
  for (const snapshot of data.scheduleBaselines ?? []) {
    const row = cycles.get(String(snapshot.cycle_id));
    check(
      row &&
        snapshot.id === snapshot.cycle_id &&
        snapshot.program_version_id === row.program_version_id,
      'invalid owned schedule baseline binding.',
    );
    const cycle = cycleFromScheduleRow(row);
    const version = versionObjects.get(cycle.programVersionId) as unknown as ProgramVersion;
    check(
      Date.parse(String(snapshot.confirmed_at)) >= Date.parse(cycle.startedAt),
      'schedule baseline precedes cycle creation.',
    );
    const matchingSessions = data.workoutSessions.filter(
      (session) => session.cycle_id === cycle.id,
    );
    const sessionsForSchedule = matchingSessions.map(sessionFromScheduleRow);
    const baseline = decodeScheduleBaseline(
      String(snapshot.dates_json),
      cycle,
      version,
      String(snapshot.time_zone),
      String(snapshot.confirmed_at),
      sessionsForSchedule,
    );
    const revisionRows = (data.scheduleRevisions ?? []).filter(
      (revision) => revision.cycle_id === cycle.id,
    );
    assertBaselineLegacyDates(
      baseline,
      data.workoutScheduleOverrides.filter((override) => override.cycle_id === cycle.id),
    );
    for (const revision of revisionRows) {
      check(
        revision.program_version_id === cycle.programVersionId &&
          String(revision.recorded_at) >= String(snapshot.confirmed_at),
        'schedule revision precedes or disagrees with its baseline.',
      );
      for (const session of matchingSessions.filter(
        (session) =>
          session.cycle_week === revision.cycle_week && session.workout_id === revision.workout_id,
      ))
        check(
          Date.parse(String(revision.recorded_at)) <= Date.parse(String(session.started_at)),
          'schedule move rewrites started workout history.',
        );
    }
    projectScheduleRevisions(
      { cycle, programVersion: version, baseline, sessions: sessionsForSchedule },
      revisionRows.map(scheduleRevisionFromRow),
    );
  }
  for (const revision of data.scheduleRevisions ?? [])
    check(
      (data.scheduleBaselines ?? []).some((snapshot) => snapshot.cycle_id === revision.cycle_id),
      'orphan schedule revision.',
    );
  const reviewRows = data.coachReviewJournal ?? [];
  const reviewIds = new Map(reviewRows.map((row) => [String(row.id), row]));
  const reviewCounts = new Map<string, number>();
  for (const row of reviewRows) {
    const cycleId = String(row.cycle_id);
    const count = (reviewCounts.get(cycleId) ?? 0) + 1;
    check(count <= 1000, 'review journal exceeds its cycle bound.');
    reviewCounts.set(cycleId, count);
  }
  unique(
    reviewRows.filter((row) => row.previous_review_id === null),
    ['cycle_id'],
    'review root',
  );
  unique(
    reviewRows.filter((row) => row.previous_review_id !== null),
    ['previous_review_id'],
    'review child',
  );
  for (const row of reviewRows) {
    const { receipt, evidence } = parseCoachReviewReceipt(String(row.receipt_json));
    const cycle = cycles.get(String(row.cycle_id));
    check(
      cycle &&
        receipt.ownerId === owner &&
        receipt.cycleId === row.cycle_id &&
        receipt.programVersionId === row.program_version_id &&
        receipt.confirmedAt === row.confirmed_at &&
        evidence.cycle.startedAt === cycle.started_at &&
        versionObjects.has(String(row.program_version_id)),
      'invalid dated review binding.',
    );
    check(receipt.confirmedAt <= data.exportedAt, 'review confirmation follows export time.');
    const visited = new Set<string>();
    let cursor: Record<string, unknown> | undefined = row;
    while (cursor?.previous_review_id !== null) {
      check(cursor && !visited.has(String(cursor.id)), 'cyclic review journal.');
      visited.add(String(cursor.id));
      const parent = reviewIds.get(String(cursor.previous_review_id));
      check(
        parent &&
          parent.cycle_id === row.cycle_id &&
          parent.user_id === owner &&
          String(parent.confirmed_at) <= String(cursor.confirmed_at),
        'invalid review parent.',
      );
      cursor = parent;
      check(visited.size <= 1000, 'review journal exceeds its cycle bound.');
    }
    for (const source of evidence.sessions) {
      const actual = sessions.get(source.id);
      check(
        actual &&
          actual.cycle_id === row.cycle_id &&
          actual.program_version_id === source.programVersionId &&
          actual.workout_id === source.workoutId &&
          actual.started_at === source.startedAt,
        'missing review source session.',
      );
      // Terminal outcomes are never reopened by current local writers. A new
      // attempt has a new ID. Only an in-progress witness can evolve after this
      // dated review; it cannot be used to invent an earlier completion.
      if (['complete', 'partial', 'skipped', 'abandoned'].includes(source.status))
        check(
          actual.status === source.status &&
            (actual.completed_at ?? undefined) === source.completedAt &&
            (actual.completion_reason ?? undefined) === source.completionReason &&
            (actual.readiness ?? undefined) === source.readiness,
          'review terminal outcome disagrees with its canonical session.',
        );
      else if (source.status === 'in-progress')
        check(
          source.completedAt === undefined &&
            source.completionReason === undefined &&
            (actual.status === 'in-progress' ||
              (['complete', 'partial', 'skipped', 'abandoned'].includes(String(actual.status)) &&
                typeof actual.completed_at === 'string' &&
                actual.completed_at >= receipt.revalidatedAt)),
          'review in-progress witness cannot establish an earlier terminal outcome.',
        );
      else check(actual.status === source.status, 'review planned witness is unsupported.');
    }
    if (evidence.goal) {
      const goal = goals.get(evidence.goal.id);
      check(
        goal &&
          goal.user_id === owner &&
          goal.cycle_id === row.cycle_id &&
          goal.program_version_id === evidence.goal.programVersionId,
        'missing review goal.',
      );
      corroborateReviewGoal(
        evidence.goal,
        data.personalGoalEvents as unknown as ReviewGoalEvent[],
        data.shiftGoalRevisions as unknown as ReviewTargetRevision[],
        receipt.revalidatedAt,
        receipt.goalWitness,
        evidence.observations,
      );
      const protocol = data.shiftProtocols.find(
        (entry) =>
          entry.shift_id === evidence.goal!.id &&
          entry.protocol_id === evidence.goal!.protocol.id &&
          entry.protocol_version === evidence.goal!.protocol.version,
      );
      check(
        protocol &&
          stableSnapshotJSON(JSON.parse(String(protocol.snapshot_json))) ===
            stableSnapshotJSON(evidence.goal.protocol),
        'missing immutable review protocol.',
      );
      const baselineId =
        evidence.goal.baseline.state === 'measured' ? evidence.goal.baseline.observationId : null;
      if (baselineId)
        check(
          evidence.observations.some((entry) => entry.id === baselineId),
          'missing review baseline source.',
        );
    }
    if (receipt.goalWitness?.state === 'unavailable-legacy-history') {
      const legacy = goals.get(receipt.goalWitness.goalId);
      check(
        legacy &&
          legacy.user_id === owner &&
          legacy.cycle_id === row.cycle_id &&
          !(data.personalGoalEvents ?? []).some(
            (event) => event.shift_id === receipt.goalWitness!.goalId && event.kind === 'created',
          ),
        'invalid unavailable legacy goal witness.',
      );
    }
    for (const source of evidence.observations) {
      const actual = data.shiftObservations.find((entry) => entry.id === source.id);
      check(
        actual &&
          actual.shift_id === source.shiftId &&
          actual.protocol_id === source.protocolId &&
          actual.protocol_version === source.protocolVersion &&
          actual.measured_at === source.measuredAt &&
          actual.source === source.source &&
          actual.unit === source.unit &&
          stableSnapshotJSON(JSON.parse(String(actual.value_json))) ===
            stableSnapshotJSON(source.value) &&
          (actual.corrects_observation_id ?? undefined) === source.correctsObservationId,
        'missing immutable review observation.',
      );
    }
  }
  unique(data.cycleHandovers ?? [], ['destination_cycle_id'], 'handover destination');
  for (const row of data.cycleHandovers ?? []) {
    const request = parseCycleHandoverRequest(String(row.request_json));
    const sourceCycle = cycles.get(String(row.source_cycle_id));
    const destinationCycle = cycles.get(String(row.destination_cycle_id));
    const confirmedAt = String(row.confirmed_at);
    check(
      request.operationId === row.id &&
        request.userId === owner &&
        row.user_id === owner &&
        request.source.cycle.id === row.source_cycle_id &&
        request.destination.cycleId === row.destination_cycle_id &&
        request.source.version.id === row.source_program_version_id &&
        request.destination.versionId === row.destination_program_version_id &&
        (request.source.goal?.id ?? null) === row.source_goal_id &&
        request.destination.goalId === row.destination_goal_id &&
        sourceCycle?.user_id === owner &&
        destinationCycle?.user_id === owner &&
        sourceCycle.started_at === request.source.cycle.startedAt &&
        destinationCycle.started_at === request.destination.startedAt &&
        confirmedAt >= request.preparedAt &&
        confirmedAt <= data.exportedAt &&
        lifecycleDate(confirmedAt, request.destination.timeZone) === request.destination.startDate,
      'invalid cycle handover binding.',
    );
    check(
      stableSnapshotJSON(versionObjects.get(request.source.version.id)) ===
        stableSnapshotJSON(request.source.version),
      'handover source version changed.',
    );
    const expectedCopy = createNextCycleCopy({
      sourceProgram: request.source.program,
      sourceVersion: request.source.version,
      userId: owner,
      newProgramId: request.destination.programId,
      newVersionId: request.destination.versionId,
      createdAt: request.destination.startedAt,
    });
    check(
      stableSnapshotJSON(versionObjects.get(request.destination.versionId)) ===
        stableSnapshotJSON(expectedCopy.version) &&
        versions.get(request.destination.versionId)?.program_id === request.destination.programId,
      'handover destination prescription changed.',
    );
    const baseline = (data.scheduleBaselines ?? []).find(
      (entry) => entry.cycle_id === request.destination.cycleId,
    );
    check(
      baseline &&
        baseline.program_version_id === request.destination.versionId &&
        baseline.time_zone === request.destination.timeZone &&
        String(baseline.confirmed_at) >= confirmedAt,
      'missing handover schedule baseline.',
    );
    if (request.source.primaryGoalId)
      check(
        goals.get(request.source.primaryGoalId)?.user_id === owner,
        'orphan handover primary goal.',
      );
    // A later real attempt may be appended, but no session already begun at the
    // reviewed cutoff may disappear from the historical receipt.
    const historicalSessions = sortHandoverSessions(
      data.workoutSessions
        .filter(
          (entry) =>
            entry.cycle_id === request.source.cycle.id &&
            Date.parse(String(entry.started_at)) <= Date.parse(request.preparedAt),
        )
        .map((entry) => ({
          id: String(entry.id),
          cycle_week: entry.cycle_week,
          workout_id: entry.workout_id,
          program_version_id: entry.program_version_id,
          status: entry.status,
          started_at: entry.started_at,
          completed_at: entry.completed_at,
        })),
    );
    check(
      stableSnapshotJSON(historicalSessions) === stableSnapshotJSON(request.source.sessions),
      'incomplete handover historical session series.',
    );
    for (const source of request.source.sessions) {
      const saved = sessions.get(source.id);
      check(
        saved &&
          saved.cycle_id === request.source.cycle.id &&
          saved.cycle_week === source.cycle_week &&
          saved.workout_id === source.workout_id &&
          saved.program_version_id === source.program_version_id &&
          saved.status === source.status &&
          saved.started_at === source.started_at &&
          saved.completed_at === source.completed_at,
        'missing handover session history.',
      );
    }
    const reflection = data.cycleReviews.find((entry) => entry.id === request.reflection.id);
    check(
      reflection?.user_id === owner && reflection.cycle_id === request.source.cycle.id,
      'orphan handover reflection.',
    );
    if (request.source.goal) {
      const source = request.source.goal;
      check(
        goals.get(source.id)?.cycle_id === request.source.cycle.id,
        'orphan handover source goal.',
      );
      corroborateReviewGoal(
        source,
        (data.personalGoalEvents ?? []) as unknown as ReviewGoalEvent[],
        data.shiftGoalRevisions as unknown as ReviewTargetRevision[],
        request.preparedAt,
        request.source.goalWitness,
      );
      const prefixIds =
        request.source.goalWitness?.state === 'event-history'
          ? request.source.goalWitness.eventIds
          : [];
      const latestTargetEvent = (data.personalGoalEvents ?? [])
        .filter((entry) => prefixIds.includes(String(entry.id)) && entry.kind === 'target-revision')
        .at(-1);
      check(
        (latestTargetEvent?.id ?? null) === request.source.latestGoalRevisionId,
        'handover target revision witness changed.',
      );
      const review = (data.personalGoalEvents ?? []).find(
        (entry) => entry.id === `${request.operationId}-goal-review`,
      );
      check(
        review &&
          review.user_id === owner &&
          review.shift_id === source.id &&
          review.kind === 'review' &&
          review.recorded_at === confirmedAt,
        'missing handover personal review.',
      );
      check(
        stableSnapshotJSON(JSON.parse(String(review.payload_json))) ===
          stableSnapshotJSON({
            state: request.personalReviewState,
            choice: request.choice === 'continue-goal' ? 'repeat' : 'undecided',
            target: source.target,
            baseline: source.baseline,
            protocol: source.protocol,
          }),
        'handover personal review changed.',
      );
      if (request.destination.goalId) {
        const created = (data.personalGoalEvents ?? []).find(
          (entry) => entry.id === `create:${request.destination.goalId}`,
        );
        check(
          goals.get(request.destination.goalId)?.cycle_id === request.destination.cycleId &&
            created &&
            created.user_id === owner &&
            created.shift_id === request.destination.goalId &&
            created.kind === 'created' &&
            created.recorded_at === confirmedAt,
          'missing handover destination goal creation.',
        );
        check(
          stableSnapshotJSON(JSON.parse(String(created.payload_json))) ===
            stableSnapshotJSON({
              objective: source.blockObjective,
              protocol: source.protocol,
              target: source.target,
              cycleId: request.destination.cycleId,
              replacePrimary: true,
            }),
          'handover destination target or protocol changed.',
        );
      }
    }
  }
  data.schemaVersion = 17;
  data.summary = buildLocalDataExportSummary(data);
  return { data, recordCount: count, exportedAt: data.exportedAt, warnings };
}

export function validateCoachMemoryValue(serialized: string): CoachMemoryValue {
  const value = safeJSON(serialized);
  keys(value, ['kind', 'value']);
  choice(value.kind, ['training-time', 'session-minutes', 'equipment', 'coach-style']);
  if (value.kind === 'training-time') choice(value.value, ['morning', 'afternoon', 'evening']);
  if (value.kind === 'coach-style') choice(value.value, ['concise', 'supportive', 'technical']);
  if (value.kind === 'session-minutes') number(value.value, 1, 1440, true);
  if (value.kind === 'equipment') {
    array(value.value);
    check(value.value.length <= equipmentCatalog.length, 'too many memory equipment entries.');
    check(new Set(value.value).size === value.value.length, 'duplicate memory equipment.');
    for (const entry of value.value)
      check(
        equipmentCatalog.some((item) => item.id === entry),
        'unknown memory equipment.',
      );
  }
  return value as unknown as CoachMemoryValue;
}

/** Recovery remains a private, uncommitted draft; validation never applies it. */
export function validateBuilderRecoverySnapshot(
  serialized: string,
  owner: string,
): BuilderRecoverySnapshot {
  check(
    new TextEncoder().encode(serialized).byteLength <= 1024 * 1024,
    'builder recovery exceeds 1 MiB.',
  );
  const value = safeJSON(serialized);
  keys(value, ['program', 'version', 'customExercises', 'imports']);
  program(value.program, owner);
  version(value.version);
  check(isRecord(value.program) && isRecord(value.version), 'invalid recovery draft.');
  check(
    value.program.id === value.version.programId &&
      value.program.currentVersionId === value.version.id,
    'recovery version mismatch.',
  );
  check(value.version.status === 'draft', 'recovery must remain a draft.');
  array(value.customExercises);
  check(value.customExercises.length <= 100, 'too many recovery movements.');
  value.customExercises.forEach(exercise);
  unique(value.customExercises as Record<string, unknown>[], ['id'], 'recovery movement');
  const exerciseIds = new Set([
    ...foundationalExercises.map((entry) => entry.id),
    ...value.customExercises.map((entry) => (entry as Record<string, unknown>).id),
  ]);
  const workouts = value.version.workouts as Record<string, unknown>[];
  check(workouts.length <= 100, 'too many recovery workouts.');
  for (const workout of workouts)
    for (const movement of workout.exercises as Record<string, unknown>[])
      check(exerciseIds.has(movement.exerciseId as string), 'missing recovery movement.');
  array(value.imports);
  check(value.imports.length <= workouts.length, 'too many recovery imports.');
  unique(value.imports as Record<string, unknown>[], ['workoutId'], 'recovery import');
  for (const entry of value.imports) {
    keys(entry, ['workoutId', 'text', 'previewText']);
    check(
      workouts.some((workout) => workout.id === entry.workoutId),
      'missing recovery workout.',
    );
    text(entry.text, 'original import text', 10000);
    if (entry.previewText !== null) {
      text(entry.previewText, 'preview text', 10000);
      check(entry.previewText === entry.text, 'stale recovery preview.');
    }
  }
  return value as unknown as BuilderRecoverySnapshot;
}

function validatePersistenceGraph(data: LocalDataExport) {
  const owner = data.userId;
  const cycles = new Map(data.trainingCycles.map((row) => [row.id, row]));
  const sessions = new Map(data.workoutSessions.map((row) => [row.id, row]));
  const sets = new Map(data.completedSets.map((row) => [row.id, row]));
  const lifecycle = data.cycleLifecycleEvents ?? [];
  const feedback = data.setFeedbackEvents ?? [];
  for (const rows of [lifecycle, feedback, data.coachMemoryFacts ?? []])
    unique(rows, ['user_id', 'operation_id'], 'local operation');
  for (const row of data.coachMemoryPreferences ?? []) number(row.enabled, 0, 1, true);
  const memoryKinds = new Set<string>();
  for (const row of data.coachMemoryFacts ?? []) {
    number(row.revision, 1, 1000000, true);
    const value = validateCoachMemoryValue(String(row.value_json));
    check(!memoryKinds.has(value.kind), 'duplicate memory preference kind.');
    memoryKinds.add(value.kind);
    check(
      Date.parse(String(row.updated_at)) >= Date.parse(String(row.confirmed_at)),
      'memory update precedes confirmation.',
    );
  }
  for (const row of data.builderRecoveryDrafts ?? []) {
    number(row.revision, 1, 1000000, true);
    validateBuilderRecoverySnapshot(String(row.snapshot_json), owner);
  }
  for (const row of lifecycle) {
    check(cycles.has(row.cycle_id), 'missing lifecycle cycle.');
    choice(row.kind, ['pause', 'resume', 'review-date']);
    text(row.time_zone, 'time zone', 100, true);
    try {
      new Intl.DateTimeFormat('en', { timeZone: String(row.time_zone) }).format();
    } catch {
      fail('invalid lifecycle time zone.');
    }
    text(row.effective_date, 'effective date', 10, true);
    check(
      /^\d{4}-\d\d-\d\d$/.test(String(row.effective_date)) &&
        Number.isFinite(Date.parse(String(row.effective_date))) &&
        new Date(String(row.effective_date)).toISOString().slice(0, 10) === row.effective_date,
      'invalid lifecycle date.',
    );
    const startParts = new Intl.DateTimeFormat('en', {
      timeZone: String(row.time_zone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(String(cycles.get(row.cycle_id)!.started_at)));
    const part = (type: string) => startParts.find((item) => item.type === type)!.value;
    check(
      String(row.effective_date) >= `${part('year')}-${part('month')}-${part('day')}`,
      'lifecycle date precedes cycle start.',
    );
    const recordedParts = new Intl.DateTimeFormat('en', {
      timeZone: String(row.time_zone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(String(row.recorded_at)));
    const recordedPart = (type: string) =>
      recordedParts.find((entry) => entry.type === type)!.value;
    const recordedDate = `${recordedPart('year')}-${recordedPart('month')}-${recordedPart('day')}`;
    check(
      row.kind === 'review-date'
        ? String(row.effective_date) >= recordedDate
        : row.effective_date === recordedDate,
      'lifecycle effective date disagrees with its recorded local date.',
    );
  }
  for (const row of feedback) {
    const session = sessions.get(row.session_id);
    check(
      session &&
        cycles.has(session.cycle_id) &&
        sets.get(row.completed_set_id)?.session_id === row.session_id,
      'missing owned feedback set.',
    );
    choice(row.difficulty, ['easier-than-expected', 'about-right', 'harder-than-expected']);
    check(
      Date.parse(String(row.recorded_at)) >= Date.parse(String(session.started_at)),
      'feedback precedes its workout session.',
    );
  }
  for (const [rows, field, scope] of [
    [lifecycle, 'previous_event_id', 'cycle_id'],
    [feedback, 'corrects_event_id', 'completed_set_id'],
  ] as const) {
    const records = new Map(rows.map((row) => [row.id, row]));
    const children = new Map<unknown, Record<string, unknown>>();
    const roots = new Map<unknown, Record<string, unknown>>();
    for (const row of rows) {
      if (row[field] === null) {
        check(!roots.has(row[scope]), 'duplicate local journal root.');
        roots.set(row[scope], row);
      } else {
        const parent = records.get(row[field]);
        check(
          parent &&
            parent[scope] === row[scope] &&
            parent.user_id === row.user_id &&
            (!('session_id' in row) || parent.session_id === row.session_id),
          'foreign local journal parent.',
        );
        check(!children.has(row[field]), 'branched local journal.');
        check(
          Date.parse(String(row.recorded_at)) >= Date.parse(String(parent.recorded_at)),
          'local journal time goes backwards.',
        );
        if (field === 'previous_event_id')
          check(row.time_zone === parent.time_zone, 'lifecycle time zone anchor changed.');
        children.set(row[field], row);
      }
    }
    const visited = new Set<unknown>();
    for (const root of roots.values()) {
      let row: Record<string, unknown> | undefined = root;
      let paused = false;
      let lastTransitionDate = '';
      while (row) {
        check(!visited.has(row.id), 'cyclic local journal.');
        visited.add(row.id);
        if (field === 'previous_event_id' && row.kind !== 'review-date') {
          check(
            (row.kind === 'pause') !== paused || (row === root && row.kind === 'resume'),
            'invalid pause/resume sequence.',
          );
          check(String(row.effective_date) >= lastTransitionDate, 'pause dates go backwards.');
          paused = row.kind === 'pause';
          lastTransitionDate = String(row.effective_date);
        }
        row = children.get(row.id);
      }
      if (field === 'previous_event_id' && lastTransitionDate) {
        const status = cycles.get(root.cycle_id)!.status;
        check(
          paused
            ? ['paused', 'cancelled'].includes(String(status))
            : ['active', 'complete', 'cancelled'].includes(String(status)),
          'lifecycle history disagrees with current cycle status.',
        );
      }
    }
    check(visited.size === rows.length, 'cyclic or disconnected local journal.');
  }
}

function validateEvent(kind: string, value: unknown) {
  if (kind === 'created') {
    keys(value, ['objective', 'protocol', 'target', 'cycleId', 'replacePrimary']);
    text(value.objective, 'objective');
    protocol(value.protocol);
    scalar(value.target);
    id(value.cycleId);
    check(typeof value.replacePrimary === 'boolean', 'invalid goal creation journal.');
  } else if (kind === 'measurement') {
    keys(value, ['observation', 'baseline']);
    keys(
      value.observation,
      ['id', 'shiftId', 'protocolId', 'protocolVersion', 'measuredAt', 'source', 'value', 'unit'],
      ['correctsObservationId'],
    );
    const observation = value.observation;
    ['id', 'shiftId', 'protocolId'].forEach((key) => id(observation[key]));
    number(value.observation.protocolVersion, 1, 100000, true);
    date(value.observation.measuredAt);
    scalar(value.observation.value);
    text(value.observation.source, 'source', 100);
    text(value.observation.unit, 'unit', 100);
    if (value.observation.correctsObservationId !== undefined)
      id(value.observation.correctsObservationId);
    check(typeof value.baseline === 'boolean', 'invalid baseline journal.');
  } else if (kind === 'target-revision') {
    keys(value, ['target', 'reason']);
    scalar(value.target);
    text(value.reason, 'reason');
  } else if (kind === 'baseline-state') {
    keys(value, ['state']);
    choice(value.state, ['deferred', 'not-yet-able']);
  } else if (kind === 'review') {
    keys(value, ['state', 'choice', 'target', 'baseline', 'protocol']);
    choice(value.state, ['due', 'completed', 'declined', 'postponed', 'missing']);
    choice(value.choice, ['maintain', 'repeat', 'modify', 'new-goal', 'break', 'undecided']);
    scalar(value.target);
    protocol(value.protocol);
    keys(value.baseline, ['state'], ['observationId']);
    choice(value.baseline.state, ['measured', 'not-yet-able', 'deferred', 'missing']);
    if (value.baseline.observationId !== undefined) id(value.baseline.observationId);
  } else fail('unknown goal journal event.');
}
