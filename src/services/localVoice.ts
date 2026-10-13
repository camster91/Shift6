import { Platform, AppState } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
interface Permission {
  granted: boolean;
}
interface Result {
  isFinal: boolean;
  results: { transcript: string }[];
}
export interface LocalSpeechModule {
  supportsOnDeviceRecognition(): boolean;
  supportsOnDeviceRecognitionForLocale?: (locale: string) => boolean;
  getSupportedLocales(options: Record<string, never>): Promise<{ installedLocales: string[] }>;
  requestMicrophonePermissionsAsync(): Promise<Permission>;
  requestSpeechRecognizerPermissionsAsync(): Promise<Permission>;
  addListener(event: string, callback: (value: unknown) => void): { remove(): void };
  start(options: {
    lang: string;
    requiresOnDeviceRecognition: true;
    continuous: false;
    interimResults: true;
    maxAlternatives: 1;
    recordingOptions: { persist: false };
  }): void;
  abort(): void;
}
export interface VoiceCapability {
  available: boolean;
  reason?: string;
}
export interface LocalVoiceAdapter {
  capability(locale: string): Promise<VoiceCapability>;
  listen(locale: string, onPartial: (text: string) => void): Promise<string>;
  cancel(): void;
}
export function createLocalVoiceAdapter(
  module: LocalSpeechModule | null,
  platform: string,
  sdk: number,
  subscribeBackground: (callback: () => void) => { remove(): void } = (callback) =>
    AppState.addEventListener('change', (state) => {
      // Permission dialogs can transiently mark iOS inactive. Never cancel merely
      // for that dialog, but require actual active state before any capture.
      if (state === 'background') callback();
    }),
  currentAppState: () => string | null = () => AppState.currentState,
): LocalVoiceAdapter {
  let pending: { reject: (error: Error) => void; cleanup: () => void } | null = null;
  let preparing = false;
  let preparingCleanup: (() => void) | null = null;
  let generation = 0;
  const capability = async (locale: string): Promise<VoiceCapability> => {
    if (!module)
      return {
        available: false,
        reason: 'Offline voice is not included in this installed build. Use manual entry.',
      };
    if (platform === 'android') {
      if (sdk < 33 || !module.supportsOnDeviceRecognition())
        return {
          available: false,
          reason: 'A supported on-device recognizer is unavailable. Use manual entry.',
        };
      try {
        const locales = await module.getSupportedLocales({});
        if (
          !locales.installedLocales.some(
            (item) => item.replaceAll('_', '-').toLowerCase() === locale.toLowerCase(),
          )
        )
          return {
            available: false,
            reason:
              'The selected offline language model is not installed. Use manual entry; no cloud fallback is used.',
          };
      } catch {
        return {
          available: false,
          reason: 'Offline language availability could not be checked. Use manual entry.',
        };
      }
      return { available: true };
    }
    if (platform === 'ios' && module.supportsOnDeviceRecognitionForLocale?.(locale))
      return { available: true };
    return {
      available: false,
      reason: 'On-device recognition for this language is unavailable. Use manual entry.',
    };
  };
  const cancel = () => {
    generation++;
    preparing = false;
    preparingCleanup?.();
    preparingCleanup = null;
    const active = pending;
    pending = null;
    if (active) {
      active.cleanup();
      try {
        module?.abort();
      } catch {
        /* Manual remains available. */
      }
      active.reject(new Error('Voice entry cancelled. Use manual entry.'));
    }
  };
  return {
    capability,
    cancel,
    async listen(locale, onPartial) {
      if (pending || preparing) throw new Error('Voice entry is already active.');
      const request = ++generation;
      preparing = true;
      const preparationSubscription = subscribeBackground(cancel);
      const preparationCleanup = () => preparationSubscription.remove();
      preparingCleanup = preparationCleanup;
      const checkCurrent = () => {
        if (request !== generation) throw new Error('Voice entry cancelled. Use manual entry.');
        if (currentAppState() !== 'active')
          throw new Error('Return to the app before starting voice entry. Use manual entry.');
      };
      try {
        checkCurrent();
        const supported = await capability(locale);
        checkCurrent();
        if (!supported.available) throw new Error(supported.reason);
        const mic = await module!.requestMicrophonePermissionsAsync();
        checkCurrent();
        if (!mic.granted) throw new Error('Microphone access was declined. Use manual entry.');
        if (platform === 'ios') {
          const speech = await module!.requestSpeechRecognizerPermissionsAsync();
          checkCurrent();
          if (!speech.granted) throw new Error('Speech permission was declined. Use manual entry.');
        }
        const current = await capability(locale);
        checkCurrent();
        if (!current.available) throw new Error(current.reason);
      } catch (error) {
        preparationCleanup();
        if (preparingCleanup === preparationCleanup) preparingCleanup = null;
        throw error;
      } finally {
        if (request === generation) preparing = false;
      }
      return new Promise<string>((resolve, reject) => {
        const subscriptions: { remove(): void }[] = [preparationSubscription];
        if (preparingCleanup === preparationCleanup) preparingCleanup = null;
        let timeout: ReturnType<typeof setTimeout>;
        const cleanup = () => {
          clearTimeout(timeout);
          subscriptions.forEach((item) => item.remove());
        };
        const finish = (text?: string, error?: Error) => {
          if (!pending || request !== generation) return;
          pending = null;
          cleanup();
          try {
            module!.abort();
          } catch {
            /* No fallback. */
          }
          if (error) reject(error);
          else resolve(text!);
        };
        pending = { reject, cleanup };
        try {
          subscriptions.push(
            module!.addListener('result', (value) => {
              if (request !== generation || !pending) return;
              const event = value as Result;
              const text = event.results?.[0]?.transcript?.trim();
              if (!text || text.length > 500) {
                if (event.isFinal)
                  finish(
                    undefined,
                    new Error('No usable short set entry was recognized. Use manual entry.'),
                  );
                return;
              }
              if (!event.isFinal) {
                onPartial(text);
                return;
              }
              if (event.results.length !== 1) {
                finish(undefined, new Error('Recognition was ambiguous. Use manual entry.'));
                return;
              }
              finish(text);
            }),
          );
          subscriptions.push(
            module!.addListener('error', () =>
              finish(undefined, new Error('Offline recognition failed. Use manual entry.')),
            ),
          );
          subscriptions.push(
            module!.addListener('end', () =>
              finish(undefined, new Error('No final set entry was recognized. Use manual entry.')),
            ),
          );
          timeout = setTimeout(
            () => finish(undefined, new Error('Voice entry timed out. Use manual entry.')),
            20000,
          );
          checkCurrent();
          module!.start({
            lang: locale,
            requiresOnDeviceRecognition: true,
            continuous: false,
            interimResults: true,
            maxAlternatives: 1,
            recordingOptions: { persist: false },
          });
        } catch {
          finish(undefined, new Error('Offline recognition could not start. Use manual entry.'));
        }
      });
    },
  };
}
export function createPlatformLocalVoiceAdapter(): LocalVoiceAdapter {
  return createLocalVoiceAdapter(
    requireOptionalNativeModule<LocalSpeechModule>('ExpoSpeechRecognition'),
    Platform.OS,
    Number(Platform.Version),
  );
}
