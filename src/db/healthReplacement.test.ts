import * as HealthConnect from 'react-native-health-connect';
import { createPlatformHealthProvider } from '../services/platformHealthProvider.android';
import { syncHealthSummaries } from '../services/healthSync';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { saveHealthSummaries, getDailyHealthTrends } from './healthRepository';
import { HEALTH_CONNECT_DAILY_SOURCE, type HealthSummary } from '../domain/health';
let sqlite: DatabaseSync, db: SQLiteDatabase;
let failInsert: boolean;
const coverage = {
  types: ['steps'] as const,
  range: { startAt: '2026-10-12T00:00:00.000Z', endAt: '2026-10-13T00:00:00.000Z' },
};
const raw: HealthSummary = {
  id: 'raw',
  type: 'steps',
  value: 1000,
  unit: 'count',
  startAt: '2026-10-12T12:00:00.000Z',
  endAt: '2026-10-12T13:00:00.000Z',
  source: 'phone',
};
const total: HealthSummary = {
  ...raw,
  id: 'utc-total:steps:2026-10-12',
  source: HEALTH_CONNECT_DAILY_SOURCE,
  startAt: coverage.range.startAt,
  endAt: coverage.range.endAt,
  value: 1200,
};
beforeEach(() => {
  failInsert = false;
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    'CREATE TABLE health_summaries(user_id TEXT,source TEXT,id TEXT,health_type TEXT,value REAL,unit TEXT,start_at TEXT,end_at TEXT,PRIMARY KEY(user_id,source,id)); CREATE TABLE measured_goals(value REAL); INSERT INTO measured_goals VALUES(10);',
  );
  const runAsync = async (sql: string, ...args: SQLInputValue[]) => {
    if (failInsert && sql.includes('INSERT INTO health_summaries')) throw new Error('disk full');
    const r = sqlite.prepare(sql).run(...args);
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  };
  db = {
    runAsync,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => sqlite.prepare(sql).all(...args),
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await fn(db);
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as SQLiteDatabase;
});
afterEach(() => sqlite.close());
test('refresh removes overlapping stale raw records for one owner while preserving other owners, denied types and outside dates', async () => {
  await saveHealthSummaries(db, 'one', [
    raw,
    { ...raw, source: 'watch', id: 'watch' },
    { ...raw, id: 'sleep', type: 'sleep-duration', unit: 'seconds' },
    { ...raw, id: 'old', startAt: '2026-10-11T12:00:00Z', endAt: '2026-10-11T13:00:00Z' },
  ]);
  await saveHealthSummaries(db, 'other', [raw]);
  await saveHealthSummaries(db, 'one', [total], coverage);
  expect(
    await getDailyHealthTrends(db, 'one', { types: ['steps'], range: coverage.range }),
  ).toEqual([expect.objectContaining({ value: 1200, basis: 'platform-total' })]);
  expect(
    sqlite.prepare("SELECT id FROM health_summaries WHERE user_id='one' ORDER BY id").all(),
  ).toEqual([{ id: 'old' }, { id: 'sleep' }, { id: total.id }]);
  expect(
    sqlite.prepare("SELECT COUNT(*) AS count FROM health_summaries WHERE user_id='other'").get(),
  ).toEqual({ count: 1 });
  expect(sqlite.prepare('SELECT value FROM measured_goals').get()).toEqual({ value: 10 });
});
test('priority refresh is idempotent and replaces the old total rather than adding it', async () => {
  await saveHealthSummaries(db, 'one', [total], coverage);
  await saveHealthSummaries(db, 'one', [{ ...total, value: 900 }], coverage);
  await saveHealthSummaries(db, 'one', [{ ...total, value: 900 }], coverage);
  expect(await getDailyHealthTrends(db, 'one')).toEqual([
    expect.objectContaining({ value: 900, sampleCount: 1 }),
  ]);
});
test('empty complete coverage clears outdated totals without creating a measured zero', async () => {
  await saveHealthSummaries(db, 'one', [total], coverage);
  await saveHealthSummaries(db, 'one', [], coverage);
  expect(await getDailyHealthTrends(db, 'one')).toEqual([]);
});
test('an insertion failure rolls back removal and leaves the original records readable', async () => {
  await saveHealthSummaries(db, 'one', [raw]);
  failInsert = true;
  await expect(saveHealthSummaries(db, 'one', [total], coverage)).rejects.toThrow('disk full');
  expect(await getDailyHealthTrends(db, 'one')).toEqual([
    expect.objectContaining({ value: 1000, sourceLabel: 'phone' }),
  ]);
});

test('midnight-adjacent totals are excluded from the selected range and instant stale points are refreshed', async () => {
  await saveHealthSummaries(db, 'one', [
    { ...total, id: 'prior', startAt: '2026-10-11T00:00:00.000Z', endAt: coverage.range.startAt },
    { ...raw, id: 'instant', startAt: coverage.range.startAt, endAt: coverage.range.startAt },
  ]);
  expect(await getDailyHealthTrends(db, 'one', { range: coverage.range })).toEqual([
    expect.objectContaining({ sourceLabel: 'phone' }),
  ]);
  await saveHealthSummaries(db, 'one', [total], coverage);
  expect(await getDailyHealthTrends(db, 'one', { range: coverage.range })).toEqual([
    expect.objectContaining({ value: 1200 }),
  ]);
  expect(
    sqlite.prepare("SELECT id FROM health_summaries WHERE user_id='one' ORDER BY id").all(),
  ).toEqual([{ id: 'prior' }, { id: total.id }]);
});

afterEach(() => jest.restoreAllMocks());
test.each(['initialization failed', 'SDK unavailable'])(
  'retains seeded cache when %s after permissions succeeded',
  async (failure) => {
    await saveHealthSummaries(db, 'one', [raw]);
    const sdk = jest.spyOn(HealthConnect, 'getSdkStatus');
    if (failure === 'SDK unavailable')
      sdk
        .mockResolvedValueOnce(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE)
        .mockResolvedValueOnce(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE)
        .mockResolvedValueOnce(HealthConnect.SdkAvailabilityStatus.SDK_UNAVAILABLE);
    else sdk.mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
    const initialize = jest.spyOn(HealthConnect, 'initialize').mockResolvedValueOnce(true);
    if (failure === 'initialization failed') initialize.mockResolvedValueOnce(false);
    jest.spyOn(HealthConnect, 'requestPermission').mockResolvedValue([]);
    jest
      .spyOn(HealthConnect, 'getGrantedPermissions')
      .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]);
    const aggregate = jest.spyOn(HealthConnect, 'aggregateRecord');
    const result = await syncHealthSummaries({
      database: db,
      userId: 'one',
      provider: createPlatformHealthProvider(),
      types: ['steps'],
      range: coverage.range,
    });
    expect(result).toMatchObject({ status: 'failed', importedCount: 0 });
    expect(aggregate).not.toHaveBeenCalled();
    expect(await getDailyHealthTrends(db, 'one')).toEqual([
      expect.objectContaining({ value: 1000, sourceLabel: 'phone' }),
    ]);
  },
);
