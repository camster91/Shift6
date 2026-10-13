import type { SQLiteDatabase } from 'expo-sqlite';
import { syncHealthSummaries } from './healthSync';
import HealthKit from '@kingstinct/react-native-healthkit';
import * as HealthConnect from 'react-native-health-connect';

import { createPlatformHealthProvider as createAndroidProvider } from './platformHealthProvider.android';
import { createPlatformHealthProvider as createAppleProvider } from './platformHealthProvider.ios';

const validRange = {
  startAt: '2026-09-01T00:00:00.000Z',
  endAt: '2026-09-19T23:59:59.999Z',
};

describe('native health provider boundaries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Android Health Connect', () => {
    it('fails availability closed when the native status call throws', async () => {
      jest.spyOn(HealthConnect, 'getSdkStatus').mockRejectedValue(new Error('native unavailable'));

      await expect(createAndroidProvider().isAvailable()).resolves.toBe(false);
    });

    it('deduplicates requested types and reports the authoritative granted subset', async () => {
      jest
        .spyOn(HealthConnect, 'getSdkStatus')
        .mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
      jest.spyOn(HealthConnect, 'initialize').mockResolvedValue(true);
      const requestPermission = jest
        .spyOn(HealthConnect, 'requestPermission')
        .mockResolvedValue([]);
      jest
        .spyOn(HealthConnect, 'getGrantedPermissions')
        .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]);

      await expect(
        createAndroidProvider().requestPermissions(['steps', 'weight', 'steps']),
      ).resolves.toEqual({
        status: 'partial',
        grantedTypes: ['steps'],
        deniedTypes: ['weight'],
      });
      expect(requestPermission).toHaveBeenCalledWith([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Weight' },
      ]);
    });

    it('reads every heart-rate page while retaining query options', async () => {
      jest
        .spyOn(HealthConnect, 'getSdkStatus')
        .mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
      jest.spyOn(HealthConnect, 'initialize').mockResolvedValue(true);
      const firstPage = {
        records: [
          {
            startTime: validRange.startAt,
            endTime: validRange.endAt,
            metadata: { id: 'one' },
            samples: [{ time: validRange.startAt, beatsPerMinute: 70 }],
          },
        ],
        pageToken: 'next',
      };
      const secondPage = {
        records: [
          {
            startTime: validRange.startAt,
            endTime: validRange.endAt,
            metadata: { id: 'two' },
            samples: [{ time: validRange.endAt, beatsPerMinute: 80 }],
          },
        ],
      };
      const read = jest
        .spyOn(HealthConnect, 'readRecords')
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);
      const summaries = await createAndroidProvider().readSummaries(['heart-rate'], validRange);
      expect(summaries.map((s) => s.value)).toEqual([70, 80]);
      expect(read).toHaveBeenNthCalledWith(1, 'HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: validRange.startAt,
          endTime: validRange.endAt,
        },
        ascendingOrder: true,
        pageSize: 1000,
      });
      expect(read).toHaveBeenNthCalledWith(2, 'HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: validRange.startAt,
          endTime: validRange.endAt,
        },
        ascendingOrder: true,
        pageSize: 1000,
        pageToken: 'next',
      });
    });

    it.each([
      ['workouts', 'ExerciseSession'],
      ['resting-heart-rate', 'RestingHeartRate'],
      ['weight', 'Weight'],
    ] as const)('continues %s reads to the last page', async (type, recordType) => {
      jest
        .spyOn(HealthConnect, 'getSdkStatus')
        .mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
      jest.spyOn(HealthConnect, 'initialize').mockResolvedValue(true);
      const fixture = {
        startTime: validRange.startAt,
        endTime: validRange.endAt,
        time: validRange.startAt,
        count: 123,
        beatsPerMinute: 65,
        weight: { inKilograms: 70 },
        metadata: { id: 'one' },
      };
      const read = jest
        .spyOn(HealthConnect, 'readRecords')
        .mockResolvedValueOnce({ records: [fixture], pageToken: 'next' })
        .mockResolvedValueOnce({ records: [{ ...fixture, metadata: { id: 'two' } }] });
      const summaries = await createAndroidProvider().readSummaries([type], validRange);
      expect(summaries).toHaveLength(2);
      expect(read).toHaveBeenNthCalledWith(
        2,
        recordType,
        expect.objectContaining({
          pageToken: 'next',
          ascendingOrder: true,
          pageSize: 1000,
          timeRangeFilter: {
            operator: 'between',
            startTime: validRange.startAt,
            endTime: validRange.endAt,
          },
        }),
      );
    });

    it.each(['native page failure', 'permission revoked', 'repeated token'])(
      'never persists the first page on %s',
      async (failure) => {
        jest
          .spyOn(HealthConnect, 'getSdkStatus')
          .mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
        jest.spyOn(HealthConnect, 'initialize').mockResolvedValue(true);
        jest.spyOn(HealthConnect, 'requestPermission').mockResolvedValue([]);
        jest
          .spyOn(HealthConnect, 'getGrantedPermissions')
          .mockResolvedValue([{ accessType: 'read', recordType: 'ExerciseSession' }]);
        const page = {
          records: [
            {
              startTime: validRange.startAt,
              endTime: validRange.endAt,
              count: 123,
              metadata: { id: 'one' },
            },
          ],
          pageToken: 'next',
        };
        const read = jest.spyOn(HealthConnect, 'readRecords').mockResolvedValueOnce(page);
        if (failure === 'repeated token') read.mockResolvedValueOnce(page);
        else read.mockRejectedValueOnce(new Error(failure));
        const runAsync = jest.fn();
        const transaction = jest.fn();
        const database = {
          runAsync,
          withTransactionAsync: transaction,
        } as unknown as SQLiteDatabase;
        await expect(
          syncHealthSummaries({
            database,
            userId: 'guest',
            provider: createAndroidProvider(),
            types: ['workouts'],
            range: validRange,
          }),
        ).resolves.toMatchObject({ status: 'failed', importedCount: 0 });
        expect(runAsync).not.toHaveBeenCalled();
        expect(transaction).not.toHaveBeenCalled();
      },
    );

    it('deduplicates records repeated across pages and repeated imports', async () => {
      jest
        .spyOn(HealthConnect, 'getSdkStatus')
        .mockResolvedValue(HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE);
      jest.spyOn(HealthConnect, 'initialize').mockResolvedValue(true);
      jest.spyOn(HealthConnect, 'requestPermission').mockResolvedValue([]);
      jest
        .spyOn(HealthConnect, 'getGrantedPermissions')
        .mockResolvedValue([{ accessType: 'read', recordType: 'ExerciseSession' }]);
      const record = {
        startTime: validRange.startAt,
        endTime: validRange.endAt,
        count: 123,
        metadata: { id: 'one' },
      };
      const read = jest.spyOn(HealthConnect, 'readRecords');
      const saved = new Map<string, unknown[]>();
      const runAsync = jest.fn(async (_sql: string, ...values: unknown[]) => {
        saved.set(values.slice(0, 3).join('|'), values);
        return { changes: 1, lastInsertRowId: 1 };
      });
      const database = {
        runAsync,
        withTransactionAsync: async (task: () => Promise<void>) => task(),
      } as unknown as SQLiteDatabase;
      for (let i = 0; i < 2; i++) {
        read
          .mockResolvedValueOnce({ records: [record], pageToken: 'next' })
          .mockResolvedValueOnce({ records: [record] });
        await expect(
          syncHealthSummaries({
            database,
            userId: 'guest',
            provider: createAndroidProvider(),
            types: ['workouts'],
            range: validRange,
          }),
        ).resolves.toMatchObject({ status: 'synced', importedCount: 1 });
      }
      expect(runAsync).toHaveBeenCalledTimes(2);
      expect(saved.size).toBe(1);
      expect(runAsync.mock.calls[0]?.[0]).toContain('ON CONFLICT(user_id, source, id) DO UPDATE');
    });

    it('does not initialize Health Connect for an invalid date range', async () => {
      const initialize = jest.spyOn(HealthConnect, 'initialize');

      await expect(
        createAndroidProvider().readSummaries(['steps'], {
          startAt: validRange.endAt,
          endAt: validRange.startAt,
        }),
      ).rejects.toThrow('valid health import range');
      expect(initialize).not.toHaveBeenCalled();
    });
  });

  describe('Apple HealthKit', () => {
    it('fails availability closed when the native availability call throws', async () => {
      jest
        .spyOn(HealthKit, 'isHealthDataAvailableAsync')
        .mockRejectedValue(new Error('native unavailable'));

      await expect(createAppleProvider().isAvailable()).resolves.toBe(false);
    });

    it('deduplicates requested types before asking for read access', async () => {
      jest.spyOn(HealthKit, 'isHealthDataAvailableAsync').mockResolvedValue(true);
      const requestAuthorization = jest
        .spyOn(HealthKit, 'requestAuthorization')
        .mockResolvedValue(true);

      await expect(
        createAppleProvider().requestPermissions(['steps', 'workouts', 'steps']),
      ).resolves.toEqual({
        status: 'granted',
        grantedTypes: ['steps', 'workouts'],
        deniedTypes: [],
      });
      expect(requestAuthorization).toHaveBeenCalledWith({
        toRead: ['HKQuantityTypeIdentifierStepCount', 'HKWorkoutTypeIdentifier'],
      });
    });

    it('does not query HealthKit for an invalid date range', async () => {
      const queryQuantitySamples = jest.spyOn(HealthKit, 'queryQuantitySamples');

      await expect(
        createAppleProvider().readSummaries(['steps'], {
          startAt: validRange.endAt,
          endAt: validRange.startAt,
        }),
      ).resolves.toEqual([]);
      expect(queryQuantitySamples).not.toHaveBeenCalled();
    });
  });
});
