import { act, fireEvent, render } from '@testing-library/react-native';
import { VoiceSetEntry } from './VoiceSetEntry';
import { voiceBindingKey, type VoiceSetBinding } from '../domain/voiceSetDraft';
import type { LocalVoiceAdapter } from '../services/localVoice';
const binding: VoiceSetBinding = {
  ownerId: 'a',
  sessionId: 's',
  programVersionId: 'v',
  workoutExerciseId: 'w',
  exerciseId: 'e',
  setNumber: 1,
  loadUnit: 'metric',
  required: ['reps'],
  allowed: ['reps', 'load'],
};
function fixture() {
  let resolve!: (value: string) => void;
  const adapter: LocalVoiceAdapter = {
    capability: jest.fn(async () => ({ available: true })),
    cancel: jest.fn(),
    listen: jest.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    ),
  };
  return { adapter, resolve: (text: string) => resolve(text) };
}
test('transcript does not apply automatically; ambiguity requires correction and repeat callback applies once', async () => {
  const f = fixture(),
    apply = jest.fn(() => true);
  const screen = await render(
    <VoiceSetEntry binding={binding} adapter={f.adapter} onApply={apply} />,
  );
  expect(f.adapter.listen).not.toHaveBeenCalled();
  const start = screen
    .getByLabelText('Speak a set entry')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    void start();
    void start();
  });
  expect(f.adapter.listen).toHaveBeenCalledTimes(1);
  await act(async () => f.resolve('eight reps, forty'));
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Use reviewed values in unsaved set')).toBeDisabled();
  await fireEvent.changeText(
    screen.getByLabelText('Review or correct the spoken set entry'),
    'eight reps, forty kilograms',
  );
  await fireEvent.press(screen.getByLabelText('Review corrected values'));
  const press = screen
    .getByLabelText('Use reviewed values in unsaved set')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    press();
    press();
  });
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith({ reps: '8', load: '40' }, voiceBindingKey(binding));
  expect(screen.getByText(/choose Save set when ready/)).toBeTruthy();
});
test('owner or active set change invalidates an in-flight transcript and old review callback', async () => {
  const f = fixture(),
    apply = jest.fn(() => true);
  const screen = await render(
    <VoiceSetEntry binding={binding} adapter={f.adapter} onApply={apply} />,
  );
  await act(async () => {
    void screen
      .getByLabelText('Speak a set entry')
      .props.onStartShouldSetResponder.testOnly_pressabilityConfig()
      .onPress();
  });
  await screen.rerender(
    <VoiceSetEntry
      binding={{ ...binding, ownerId: 'b', setNumber: 2 }}
      adapter={f.adapter}
      onApply={apply}
    />,
  );
  await act(async () => f.resolve('eight reps'));
  expect(screen.queryByLabelText('Use reviewed values in unsaved set')).toBeNull();
  expect(apply).not.toHaveBeenCalled();
  expect(f.adapter.cancel).toHaveBeenCalled();
});
test('dismiss aborts capture and rejects stale results', async () => {
  const f = fixture(),
    apply = jest.fn(() => true);
  const screen = await render(
    <VoiceSetEntry binding={binding} adapter={f.adapter} onApply={apply} />,
  );
  await act(async () => {
    void screen
      .getByLabelText('Speak a set entry')
      .props.onStartShouldSetResponder.testOnly_pressabilityConfig()
      .onPress();
  });
  await fireEvent.press(screen.getByLabelText('Dismiss voice entry'));
  await act(async () => f.resolve('eight reps'));
  expect(screen.queryByLabelText('Use reviewed values in unsaved set')).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
