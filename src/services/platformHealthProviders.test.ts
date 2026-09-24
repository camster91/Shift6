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

    it('does not initialize Health Connect for an invalid date range', async () => {
      const initialize = jest.spyOn(HealthConnect, 'initialize');

      await expect(
        createAndroidProvider().readSummaries(['steps'], {
          startAt: validRange.endAt,
          endAt: validRange.startAt,
        }),
      ).resolves.toEqual([]);
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
