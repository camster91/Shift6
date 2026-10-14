import {
  notificationResponseKey,
  subscribeToSafeNotificationResponses,
} from './notificationResponsePolicy';
import type { NotificationResponsePayload } from './notifications';

const action = 'expo.modules.notifications.actions.DEFAULT';
const reminder: NotificationResponsePayload = {
  requestIdentifier: 'shift6:workout-reminder:owner:cycle:1:workout:2026-10-15',
  actionIdentifier: action,
  defaultActionIdentifier: action,
  deliveredAt: 1792022400000,
  data: {
    source: 'shift6',
    kind: 'shift6-workout-reminder',
    cycleId: 'cycle',
    cycleWeek: 1,
    workoutId: 'workout',
    route: '/workout?workoutId=workout',
  },
};
const rest: NotificationResponsePayload = {
  ...reminder,
  requestIdentifier: 'shift6:rest-timer:session',
  data: { source: 'shift6', kind: 'shift6-rest-timer', sessionId: 'session', workoutId: 'workout' },
};

test.each([reminder, rest])(
  'accepts only identifiable native default taps from managed sources',
  (response) => {
    expect(notificationResponseKey(response, 'owner')).not.toBeNull();
  },
);
test.each([
  { actionIdentifier: 'dismiss' },
  { defaultActionIdentifier: 'custom', actionIdentifier: 'custom' },
  { requestIdentifier: '' },
  { requestIdentifier: 'foreign' },
  { deliveredAt: NaN },
  { deliveredAt: 0 },
  { data: { ...reminder.data, source: 'remote' } },
  { data: { ...reminder.data, kind: 'unknown' } },
  { data: { ...reminder.data, workoutId: '' } },
  { data: { ...reminder.data, cycleId: 'other' } },
  { data: { ...reminder.data, cycleWeek: 7 } },
  { requestIdentifier: 'shift6:workout-reminder:owner:cycle:1:workout:2026-02-30' },
])('ignores malformed, foreign and unsupported events %j', (patch) => {
  expect(notificationResponseKey({ ...reminder, ...patch }, 'owner')).toBeNull();
});
test('rejects another owner and mismatched rest-session identity', () => {
  expect(notificationResponseKey(reminder, 'different')).toBeNull();
  expect(
    notificationResponseKey({ ...rest, data: { ...rest.data, sessionId: 'different' } }, 'owner'),
  ).toBeNull();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
function harness() {
  const cached = deferred<NotificationResponsePayload | null>();
  const subscribed = deferred<{ remove(): void }>();
  let listener!: (response: NotificationResponsePayload) => void;
  let current = true;
  const home = jest.fn();
  const remove = jest.fn();
  const stop = subscribeToSafeNotificationResponses(
    {
      getLastResponse: () => cached.promise,
      subscribeToResponses: async (next) => {
        listener = next;
        return subscribed.promise;
      },
    },
    'owner',
    () => current,
    home,
  );
  return {
    cached,
    subscribed,
    home,
    remove,
    stop,
    live: (response: NotificationResponsePayload) => listener(response),
    stale: () => {
      current = false;
    },
  };
}
test('deduplicates a cached/live event while allowing a distinct delivered occurrence', async () => {
  const h = harness();
  h.live(reminder);
  h.cached.resolve(reminder);
  await Promise.resolve();
  h.live(reminder);
  expect(h.home).toHaveBeenCalledTimes(1);
  expect(h.home).toHaveBeenCalledWith();
  h.live({ ...reminder, deliveredAt: reminder.deliveredAt + 1000 });
  expect(h.home).toHaveBeenCalledTimes(2);
  h.stop();
});
test.each(['owner/database replaced', 'unmounted'])(
  'ignores queued cached/live callbacks after %s',
  async (reason) => {
    const h = harness();
    if (reason === 'unmounted') h.stop();
    else h.stale();
    h.live(reminder);
    h.cached.resolve(reminder);
    h.subscribed.resolve({ remove: h.remove });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.home).not.toHaveBeenCalled();
    expect(h.remove).toHaveBeenCalledTimes(1);
  },
);
test('cleanup removes the connected subscription and blocks later callbacks', async () => {
  const h = harness();
  h.subscribed.resolve({ remove: h.remove });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  h.stop();
  h.live(rest);
  h.cached.resolve(rest);
  await Promise.resolve();
  expect(h.remove).toHaveBeenCalledTimes(1);
  expect(h.home).not.toHaveBeenCalled();
});
