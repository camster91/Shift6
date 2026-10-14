import {
  createDatabaseInitialization,
  type DatabaseInitializationState,
} from './databaseInitialization';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function connection(name: string) {
  return { name, closeAsync: jest.fn(async (): Promise<void> => undefined) };
}
type Connection = ReturnType<typeof connection>;
async function flush() {
  for (let i = 0; i < 20; ++i) await Promise.resolve();
}

test('opened connection is published only after initialization and closes exactly once on disposal', async () => {
  const db = connection('owned'),
    initialize = deferred<void>();
  const states: DatabaseInitializationState<Connection>[] = [];
  const controller = createDatabaseInitialization({
    open: async () => db,
    initialize: () => initialize.promise,
  });
  const dispose = controller.start((state) => states.push(state));
  await flush();
  expect(states).toEqual([{ status: 'loading' }]);
  initialize.resolve();
  await flush();
  expect(states).toEqual([{ status: 'loading' }, { status: 'ready', database: db }]);
  dispose();
  dispose();
  await flush();
  expect(db.closeAsync).toHaveBeenCalledTimes(1);
});

test('open resolving after unmount closes its owned handle and never initializes or publishes it', async () => {
  const opened = deferred<Connection>(),
    db = connection('late-open'),
    initialize = jest.fn();
  const publish = jest.fn();
  const controller = createDatabaseInitialization({ open: () => opened.promise, initialize });
  const dispose = controller.start(publish);
  await flush();
  dispose();
  opened.resolve(db);
  await flush();
  expect(db.closeAsync).toHaveBeenCalledTimes(1);
  expect(initialize).not.toHaveBeenCalled();
  expect(publish).toHaveBeenCalledTimes(1);
});

test('retry waits for an obsolete open and its close before allocating the next owned connection', async () => {
  const opened = deferred<Connection>(),
    closed = deferred<void>();
  const old = connection('old'),
    fresh = connection('fresh');
  old.closeAsync.mockImplementation(() => closed.promise);
  const open = jest
    .fn()
    .mockImplementationOnce(() => opened.promise)
    .mockResolvedValueOnce(fresh);
  const initialize = jest.fn(async () => undefined),
    first = jest.fn(),
    second = jest.fn();
  const controller = createDatabaseInitialization({ open, initialize });
  const disposeOld = controller.start(first);
  await flush();
  const disposeFresh = controller.start(second);
  await flush();
  expect(open).toHaveBeenCalledTimes(1);
  opened.resolve(old);
  await flush();
  expect(old.closeAsync).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledTimes(1);
  closed.resolve();
  await flush();
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(initialize).toHaveBeenCalledWith(fresh);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenLastCalledWith({ status: 'ready', database: fresh });
  disposeOld();
  await flush();
  expect(fresh.closeAsync).not.toHaveBeenCalled();
  disposeFresh();
  await flush();
  expect(fresh.closeAsync).toHaveBeenCalledTimes(1);
});

test('retry never closes a handle under pending initialization; stale migration completion is not published', async () => {
  const pending = deferred<void>(),
    old = connection('old'),
    fresh = connection('fresh');
  const open = jest.fn().mockResolvedValueOnce(old).mockResolvedValueOnce(fresh);
  const initialize = jest
    .fn()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(undefined);
  const first = jest.fn(),
    second = jest.fn();
  const controller = createDatabaseInitialization({ open, initialize });
  const disposeOld = controller.start(first);
  await flush();
  controller.start(second);
  await flush();
  expect(old.closeAsync).not.toHaveBeenCalled();
  expect(open).toHaveBeenCalledTimes(1);
  pending.resolve();
  await flush();
  expect(old.closeAsync).toHaveBeenCalledTimes(1);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenLastCalledWith({ status: 'ready', database: fresh });
  disposeOld();
  await flush();
  expect(fresh.closeAsync).not.toHaveBeenCalled();
});

test('obsolete initialization rejection cannot report an error or close the new attempt', async () => {
  const pending = deferred<void>(),
    old = connection('old'),
    fresh = connection('fresh');
  const initialize = jest
    .fn()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(undefined);
  const first = jest.fn(),
    second = jest.fn(),
    onDiagnostic = jest.fn();
  const controller = createDatabaseInitialization({
    open: jest.fn().mockResolvedValueOnce(old).mockResolvedValueOnce(fresh),
    initialize,
    onDiagnostic,
  });
  const disposeOld = controller.start(first);
  await flush();
  controller.start(second);
  pending.reject(new Error('database is locked; private SQL and values'));
  await flush();
  expect(first).toHaveBeenCalledTimes(1);
  expect(onDiagnostic).not.toHaveBeenCalled();
  expect(old.closeAsync).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenLastCalledWith({ status: 'ready', database: fresh });
  disposeOld();
  await flush();
  expect(fresh.closeAsync).not.toHaveBeenCalled();
});

test('failed initialization, failed retry, then successful retry retain exact handle ownership', async () => {
  const a = connection('a'),
    b = connection('b'),
    c = connection('c'),
    external = connection('unowned');
  const open = jest.fn().mockResolvedValueOnce(a).mockResolvedValueOnce(b).mockResolvedValueOnce(c);
  const initialize = jest
    .fn()
    .mockRejectedValueOnce(new Error('AccessClosedResourceException'))
    .mockRejectedValueOnce(new Error('SQLITE_BUSY'))
    .mockResolvedValueOnce(undefined);
  const controller = createDatabaseInitialization({ open, initialize });
  const first = jest.fn(),
    second = jest.fn(),
    third = jest.fn();
  const stopA = controller.start(first);
  await flush();
  expect(first).toHaveBeenLastCalledWith({
    status: 'error',
    diagnostic: { stage: 'initialize', code: 'connection-closed' },
  });
  const stopB = controller.start(second);
  await flush();
  expect(second).toHaveBeenLastCalledWith({
    status: 'error',
    diagnostic: { stage: 'initialize', code: 'storage-busy' },
  });
  const stopC = controller.start(third);
  await flush();
  expect(third).toHaveBeenLastCalledWith({ status: 'ready', database: c });
  stopA();
  stopB();
  await flush();
  expect(a.closeAsync).toHaveBeenCalledTimes(1);
  expect(b.closeAsync).toHaveBeenCalledTimes(1);
  expect(c.closeAsync).not.toHaveBeenCalled();
  expect(external.closeAsync).not.toHaveBeenCalled();
  stopC();
  await flush();
  expect(c.closeAsync).toHaveBeenCalledTimes(1);
});

test('open failure produces a fixed diagnostic without leaking SQL, paths, values, stack or URL', async () => {
  const privateFailure = new Error(
    'SQLITE_FULL SELECT secret FROM people /private/shift6.db https://private.invalid token=secret',
  );
  const publish = jest.fn(),
    onDiagnostic = jest.fn(),
    initialize = jest.fn();
  const controller = createDatabaseInitialization({
    open: async () => {
      throw privateFailure;
    },
    initialize,
    onDiagnostic,
  });
  controller.start(publish);
  await flush();
  const expected = { stage: 'open', code: 'storage-full' };
  expect(onDiagnostic).toHaveBeenCalledWith(expected);
  expect(publish).toHaveBeenLastCalledWith({ status: 'error', diagnostic: expected });
  expect(JSON.stringify(onDiagnostic.mock.calls)).not.toMatch(/secret|SELECT|private|stack|https/);
  expect(initialize).not.toHaveBeenCalled();
});

test('cleanup failure cannot overwrite initialization diagnosis or permanently block a fresh retry', async () => {
  const old = connection('old'),
    fresh = connection('fresh'),
    onDiagnostic = jest.fn();
  old.closeAsync.mockRejectedValue(new Error('AccessClosedResourceException with private detail'));
  const controller = createDatabaseInitialization({
    open: jest.fn().mockResolvedValueOnce(old).mockResolvedValueOnce(fresh),
    initialize: jest
      .fn()
      .mockRejectedValueOnce(new Error('SQLITE_BUSY private'))
      .mockResolvedValueOnce(undefined),
    onDiagnostic,
  });
  const first = jest.fn(),
    second = jest.fn();
  controller.start(first);
  await flush();
  expect(first).toHaveBeenLastCalledWith({
    status: 'error',
    diagnostic: { stage: 'initialize', code: 'storage-busy' },
  });
  expect(onDiagnostic).toHaveBeenCalledWith({ stage: 'close', code: 'connection-closed' });
  controller.start(second);
  await flush();
  expect(second).toHaveBeenLastCalledWith({ status: 'ready', database: fresh });
  expect(old.closeAsync).toHaveBeenCalledTimes(1);
});

test('rapid cancelled retries never open unused attempts or transfer their cleanup to the last attempt', async () => {
  const db = connection('last'),
    open = jest.fn(async () => db),
    initialize = jest.fn(async () => undefined);
  const controller = createDatabaseInitialization({ open, initialize });
  const first = jest.fn(),
    second = jest.fn(),
    last = jest.fn();
  const stopFirst = controller.start(first),
    stopSecond = controller.start(second),
    stopLast = controller.start(last);
  await flush();
  expect(open).toHaveBeenCalledTimes(1);
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  expect(last).toHaveBeenLastCalledWith({ status: 'ready', database: db });
  stopFirst();
  stopSecond();
  await flush();
  expect(db.closeAsync).not.toHaveBeenCalled();
  stopLast();
  await flush();
  expect(db.closeAsync).toHaveBeenCalledTimes(1);
});

test('effect cleanup before remount retains the pending attempt as a serialization barrier', async () => {
  const pending = deferred<void>(),
    old = connection('unmounted'),
    fresh = connection('remounted');
  const open = jest.fn().mockResolvedValueOnce(old).mockResolvedValueOnce(fresh);
  const initialize = jest
    .fn()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(undefined);
  const controller = createDatabaseInitialization({ open, initialize });
  const first = jest.fn(),
    next = jest.fn();
  const dispose = controller.start(first);
  await flush();
  dispose();
  controller.start(next);
  await flush();
  expect(open).toHaveBeenCalledTimes(1);
  expect(old.closeAsync).not.toHaveBeenCalled();
  pending.resolve();
  await flush();
  expect(old.closeAsync).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenLastCalledWith({ status: 'ready', database: fresh });
  expect(first).toHaveBeenCalledTimes(1);
});
