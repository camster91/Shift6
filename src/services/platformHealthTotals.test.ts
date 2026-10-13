import * as HealthConnect from 'react-native-health-connect';
import type { SQLiteDatabase } from 'expo-sqlite';
import { createPlatformHealthProvider } from './platformHealthProvider.android';
import { syncHealthSummaries } from './healthSync';
import { HEALTH_CONNECT_DAILY_SOURCE } from '../domain/health';
const range = { startAt: '2026-10-12T00:00:00.000Z', endAt: '2026-10-13T00:00:00.000Z' };
beforeEach(() => {
  jest
    .spyOn(HealthConnect, 'getSdkStatus')
    .mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
  jest.spyOn(HealthConnect, 'initialize').mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());
test('uses the platform deduped step total, retaining distinct nonoverlapping activity in that total', async () => {
  const total = { COUNT_TOTAL: 1500, dataOrigins: ['phone', 'watch'] };
  const aggregate = jest.spyOn(HealthConnect, 'aggregateRecord').mockResolvedValue(total);
  const raw = jest.spyOn(HealthConnect, 'readRecords');
  const summaries = await createPlatformHealthProvider().readSummaries(['steps'], range);
  expect(summaries).toEqual([
    {
      id: 'utc-total:steps:2026-10-12',
      type: 'steps',
      value: 1500,
      unit: 'count',
      ...{ startAt: range.startAt, endAt: range.endAt },
      source: HEALTH_CONNECT_DAILY_SOURCE,
    },
  ]);
  expect(aggregate).toHaveBeenCalledWith({
    recordType: 'Steps',
    dataOriginFilter: [],
    timeRangeFilter: { operator: 'between', startTime: range.startAt, endTime: range.endAt },
  });
  expect(raw).not.toHaveBeenCalled();
});
test('overlapping sleep uses native seconds instead of summing raw session durations', async () => {
  const total = { SLEEP_DURATION_TOTAL: 28800, dataOrigins: ['watch', 'phone'] };
  jest.spyOn(HealthConnect, 'aggregateRecord').mockResolvedValue(total);
  expect(await createPlatformHealthProvider().readSummaries(['sleep-duration'], range)).toEqual([
    expect.objectContaining({ value: 28800, unit: 'seconds', source: HEALTH_CONNECT_DAILY_SOURCE }),
  ]);
});
test('missing native origins produces no measurement; explicit zero with coverage is retained', async () => {
  const missing = { COUNT_TOTAL: 0, dataOrigins: [] as string[] };
  const measured = { COUNT_TOTAL: 0, dataOrigins: ['phone'] };
  jest
    .spyOn(HealthConnect, 'aggregateRecord')
    .mockResolvedValueOnce(missing)
    .mockResolvedValueOnce(measured);
  expect(await createPlatformHealthProvider().readSummaries(['steps'], range)).toEqual([]);
  expect(await createPlatformHealthProvider().readSummaries(['steps'], range)).toEqual([
    expect.objectContaining({ value: 0 }),
  ]);
});
test('reads exact partial midnight windows and leaves source priorities to the platform', async () => {
  const total = { COUNT_TOTAL: 100, dataOrigins: ['phone'] };
  const aggregate = jest.spyOn(HealthConnect, 'aggregateRecord').mockResolvedValue(total);
  await createPlatformHealthProvider().readSummaries(['steps'], {
    startAt: '2026-10-12T23:00:00Z',
    endAt: '2026-10-13T01:00:00Z',
  });
  expect(aggregate.mock.calls).toEqual([
    [
      {
        recordType: 'Steps',
        dataOriginFilter: [],
        timeRangeFilter: {
          operator: 'between',
          startTime: '2026-10-12T23:00:00.000Z',
          endTime: '2026-10-13T00:00:00.000Z',
        },
      },
    ],
    [
      {
        recordType: 'Steps',
        dataOriginFilter: [],
        timeRangeFilter: {
          operator: 'between',
          startTime: '2026-10-13T00:00:00.000Z',
          endTime: '2026-10-13T01:00:00.000Z',
        },
      },
    ],
  ]);
});
test('later aggregate failure cannot delete stale records or write a partial first day', async () => {
  jest.spyOn(HealthConnect, 'requestPermission').mockResolvedValue([]);
  jest
    .spyOn(HealthConnect, 'getGrantedPermissions')
    .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]);
  const total = { COUNT_TOTAL: 100, dataOrigins: ['phone'] };
  jest
    .spyOn(HealthConnect, 'aggregateRecord')
    .mockResolvedValueOnce(total)
    .mockRejectedValueOnce(new Error('permission revoked'));
  const transaction = jest.fn(),
    runAsync = jest.fn();
  const database = {
    withExclusiveTransactionAsync: transaction,
    withTransactionAsync: transaction,
    runAsync,
  } as unknown as SQLiteDatabase;
  const result = await syncHealthSummaries({
    database,
    userId: 'guest',
    provider: createPlatformHealthProvider(),
    types: ['steps'],
    range: { ...range, endAt: '2026-10-14T00:00:00Z' },
  });
  expect(result.status).toBe('failed');
  expect(transaction).not.toHaveBeenCalled();
  expect(runAsync).not.toHaveBeenCalled();
});

test('partial grants refresh only granted daily totals and preserve denied coverage', async () => {
  jest.spyOn(HealthConnect, 'requestPermission').mockResolvedValue([]);
  jest
    .spyOn(HealthConnect, 'getGrantedPermissions')
    .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]);
  const total = { COUNT_TOTAL: 100, dataOrigins: ['phone'] };
  const aggregate = jest.spyOn(HealthConnect, 'aggregateRecord').mockResolvedValue(total);
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
  const database = {
    runAsync,
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) =>
      fn(database),
  } as unknown as SQLiteDatabase;
  const result = await syncHealthSummaries({
    database,
    userId: 'guest',
    provider: createPlatformHealthProvider(),
    types: ['steps', 'sleep-duration'],
    range,
  });
  expect(result).toMatchObject({
    status: 'synced',
    deniedTypes: ['sleep-duration'],
    grantedTypes: ['steps'],
  });
  expect(aggregate).toHaveBeenCalledTimes(1);
  expect(runAsync).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('DELETE FROM health_summaries'),
    'guest',
    'steps',
    range.endAt,
    range.startAt,
    range.startAt,
  );
});
