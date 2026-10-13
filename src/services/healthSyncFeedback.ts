import type { HealthSyncStatus } from './healthSync';

export function healthSyncFeedback(
  state: HealthSyncStatus | 'idle' | 'syncing',
  importedCount: number,
): string | null {
  switch (state) {
    case 'synced':
      return `${importedCount} health summar${importedCount === 1 ? 'y was' : 'ies were'} saved on this device.`;
    case 'unavailable':
      return 'The native health connector is unavailable on this device.';
    case 'permission-denied':
      return 'No health data was imported. You can change access in the platform health settings.';
    case 'failed':
      return 'Health import did not finish. Try again. Your previously saved summaries and workout data remain available.';
    case 'syncing':
      return 'Reading only the summaries you selected…';
    default:
      return null;
  }
}
