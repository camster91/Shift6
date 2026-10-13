import { createLocalVoiceAdapter, type LocalSpeechModule } from './localVoice';
function fixture(platform = 'android', sdk = 36) {
  const callbacks = new Map<string, (value: unknown) => void>();
  let background = () => {};
  const remove = jest.fn();
  const module: LocalSpeechModule = {
    supportsOnDeviceRecognition: jest.fn(() => true),
    supportsOnDeviceRecognitionForLocale: jest.fn(() => true),
    getSupportedLocales: jest.fn(async () => ({ installedLocales: ['en-US'] })),
    requestMicrophonePermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestSpeechRecognizerPermissionsAsync: jest.fn(async () => ({ granted: true })),
    addListener: jest.fn((event, cb) => {
      callbacks.set(event, cb);
      return { remove };
    }),
    start: jest.fn(),
    abort: jest.fn(),
  };
  return {
    module,
    callbacks,
    remove,
    background: () => background(),
    adapter: createLocalVoiceAdapter(module, platform, sdk, (cb) => {
      background = cb;
      return { remove };
    }),
  };
}
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
test('API32 refuses offline hint fallback without permissions or capture', async () => {
  const f = fixture('android', 32);
  await expect(f.adapter.listen('en-US', jest.fn())).rejects.toThrow('unavailable');
  expect(f.module.requestMicrophonePermissionsAsync).not.toHaveBeenCalled();
  expect(f.module.start).not.toHaveBeenCalled();
});
test('uninstalled locale and unsupported requested iOS locale fail closed', async () => {
  const f = fixture();
  await expect(f.adapter.listen('fr-FR', jest.fn())).rejects.toThrow('not installed');
  expect(f.module.getSupportedLocales).toHaveBeenCalledWith({});
  const ios = fixture('ios');
  ios.module.supportsOnDeviceRecognitionForLocale = () => false;
  await expect(ios.adapter.listen('en-US', jest.fn())).rejects.toThrow('unavailable');
  expect(ios.module.requestMicrophonePermissionsAsync).not.toHaveBeenCalled();
});
test('final resolves once, interim ephemeral, options never record or use regular/cloud fallback', async () => {
  const f = fixture();
  const partial = jest.fn();
  const result = f.adapter.listen('en-US', partial);
  await flush();
  expect(f.module.start).toHaveBeenCalledWith({
    lang: 'en-US',
    requiresOnDeviceRecognition: true,
    continuous: false,
    interimResults: true,
    maxAlternatives: 1,
    recordingOptions: { persist: false },
  });
  f.callbacks.get('result')!({ isFinal: false, results: [{ transcript: 'eight' }] });
  expect(partial).toHaveBeenCalledWith('eight');
  f.callbacks.get('result')!({ isFinal: true, results: [{ transcript: 'eight reps' }] });
  await expect(result).resolves.toBe('eight reps');
  expect(f.module.abort).toHaveBeenCalledTimes(1);
  expect(f.remove).toHaveBeenCalledTimes(4);
  f.callbacks.get('result')!({ isFinal: false, results: [{ transcript: 'stale' }] });
  expect(partial).toHaveBeenCalledTimes(1);
});
test('dismiss while permission dialog is pending cannot start later', async () => {
  const f = fixture();
  let permit!: (value: { granted: boolean }) => void;
  f.module.requestMicrophonePermissionsAsync = () =>
    new Promise((resolve) => {
      permit = resolve;
    });
  const result = f.adapter.listen('en-US', jest.fn());
  await flush();
  f.adapter.cancel();
  permit({ granted: true });
  await expect(result).rejects.toThrow('cancelled');
  expect(f.module.start).not.toHaveBeenCalled();
});
test('background aborts and stale old result cannot reach a new capture', async () => {
  const f = fixture();
  const partial = jest.fn();
  const first = f.adapter.listen('en-US', partial);
  await flush();
  const old = f.callbacks.get('result')!;
  f.background();
  await expect(first).rejects.toThrow('cancelled');
  const second = f.adapter.listen('en-US', partial);
  await flush();
  old({ isFinal: true, results: [{ transcript: 'old' }] });
  f.callbacks.get('result')!({ isFinal: true, results: [{ transcript: 'new' }] });
  await expect(second).resolves.toBe('new');
});
test('timeout and permission denial leave manual entry, no persistence', async () => {
  jest.useFakeTimers();
  const f = fixture();
  const result = f.adapter.listen('en-US', jest.fn());
  await flush();
  const rejection = expect(result).rejects.toThrow('timed out');
  jest.advanceTimersByTime(20000);
  await rejection;
  jest.useRealTimers();
  const denied = fixture();
  denied.module.requestMicrophonePermissionsAsync = async () => ({ granted: false });
  await expect(denied.adapter.listen('en-US', jest.fn())).rejects.toThrow('declined');
  expect(denied.module.start).not.toHaveBeenCalled();
});

test('iOS speech authorization is separate and denial never starts capture', async () => {
  const f = fixture('ios');
  f.module.requestSpeechRecognizerPermissionsAsync = async () => ({ granted: false });
  await f.adapter.capability('en-US');
  expect(f.module.requestMicrophonePermissionsAsync).not.toHaveBeenCalled();
  await expect(f.adapter.listen('en-US', jest.fn())).rejects.toThrow('Speech permission');
  expect(f.module.requestMicrophonePermissionsAsync).toHaveBeenCalledTimes(1);
  expect(f.module.start).not.toHaveBeenCalled();
});

test('listener registration failure cleans up and allows a later manual retry', async () => {
  const f = fixture();
  const original = f.module.addListener;
  f.module.addListener = jest.fn(() => {
    throw new Error('listener unavailable');
  });
  await expect(f.adapter.listen('en-US', jest.fn())).rejects.toThrow('could not start');
  expect(f.module.start).not.toHaveBeenCalled();
  f.module.addListener = original;
  const result = f.adapter.listen('en-US', jest.fn());
  await flush();
  f.callbacks.get('result')!({ isFinal: true, results: [{ transcript: 'eight reps' }] });
  await expect(result).resolves.toBe('eight reps');
});
