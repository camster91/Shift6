import { healthSyncFeedback } from './healthSyncFeedback';

test('health read failures clearly describe incomplete import and retained records', () => {
  expect(healthSyncFeedback('failed', 0)).toBe(
    'Health import did not finish. Try again. Your previously saved summaries and workout data remain available.',
  );
  expect(healthSyncFeedback('failed', 0)).not.toContain('saved on this device');
  expect(healthSyncFeedback('synced', 2)).toBe('2 health summaries were saved on this device.');
});
