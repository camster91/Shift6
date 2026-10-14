import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
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
  loadUnit: 'kg',
  contextKey: 'snapshot-1',
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

test('manual correction can delete every character and retype after an offline failure without losing the editor or applying a draft', async () => {
  const f = fixture(),
    apply = jest.fn(() => true);
  (f.adapter.listen as jest.Mock).mockRejectedValue(
    new Error(
      'The selected offline language model is not installed. Use manual entry; no cloud fallback is used.',
    ),
  );
  const timed: VoiceSetBinding = {
    ...binding,
    required: ['duration'],
    allowed: ['duration', 'rpe', 'rir'],
  };
  const screen = await render(
    <VoiceSetEntry binding={timed} adapter={f.adapter} onApply={apply} />,
  );
  await fireEvent.press(screen.getByLabelText('Speak a set entry'));
  await fireEvent.changeText(
    screen.getByLabelText('Review or correct the spoken set entry'),
    '40 pounds, 8 reps',
  );
  await fireEvent.press(screen.getByLabelText('Review corrected values'));
  expect(screen.getByLabelText('Use reviewed values in unsaved set')).toBeDisabled();
  const oldReview = screen
    .getByLabelText('Review corrected values')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  const clear = screen.getByLabelText('Review or correct the spoken set entry').props.onChangeText;
  await act(() => {
    clear('');
    oldReview();
  });
  expect(screen.getByLabelText('Review or correct the spoken set entry')).toHaveDisplayValue('');
  expect(screen.getByLabelText('Review corrected values')).toBeDisabled();
  expect(screen.queryByLabelText('Use reviewed values in unsaved set')).toBeNull();
  expect(apply).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText('Review or correct the spoken set entry'),
    '26 seconds, RPE seven',
  );
  await fireEvent.press(screen.getByLabelText('Review corrected values'));
  expect(screen.getByText('duration: 26 seconds')).toBeTruthy();
  expect(apply).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Use reviewed values in unsaved set'));
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith({ duration: '26', rpe: '7' }, voiceBindingKey(timed));
});

test.each(['dismiss', 'binding', 'disabled', 'adapter', 'background'])(
  'an empty opened correction editor closes on %s and its retained review cannot recreate a preview',
  async (reset) => {
    const originalImplementation = jest.isMockFunction(AppState.addEventListener)
      ? jest.mocked(AppState.addEventListener).getMockImplementation()
      : undefined;
    let background!: (state: AppStateStatus) => void;
    const subscription = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, callback) => {
        background = callback;
        return { remove: jest.fn() };
      });
    try {
      const f = fixture(),
        apply = jest.fn(() => true);
      (f.adapter.listen as jest.Mock).mockRejectedValue(
        new Error('Offline voice unavailable. Use manual entry.'),
      );
      const screen = await render(
        <VoiceSetEntry binding={binding} adapter={f.adapter} onApply={apply} />,
      );
      await fireEvent.press(screen.getByLabelText('Speak a set entry'));
      await fireEvent.changeText(
        screen.getByLabelText('Review or correct the spoken set entry'),
        '8 reps, 40 kilograms',
      );
      const retainedReview = screen
        .getByLabelText('Review corrected values')
        .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
      await fireEvent.changeText(
        screen.getByLabelText('Review or correct the spoken set entry'),
        '',
      );
      expect(screen.getByLabelText('Review or correct the spoken set entry')).toHaveDisplayValue(
        '',
      );
      if (reset === 'dismiss')
        await act(() => {
          screen
            .getByLabelText('Dismiss voice entry')
            .props.onStartShouldSetResponder.testOnly_pressabilityConfig()
            .onPress();
          retainedReview();
        });
      if (reset === 'binding')
        await screen.rerender(
          <VoiceSetEntry
            binding={{ ...binding, ownerId: 'new-owner' }}
            adapter={f.adapter}
            onApply={apply}
          />,
        );
      if (reset === 'disabled')
        await screen.rerender(
          <VoiceSetEntry binding={binding} adapter={f.adapter} onApply={apply} disabled />,
        );
      if (reset === 'adapter')
        await screen.rerender(
          <VoiceSetEntry binding={binding} adapter={fixture().adapter} onApply={apply} />,
        );
      if (reset === 'background') await act(() => background('background'));
      await act(() => retainedReview());
      expect(screen.queryByLabelText('Review or correct the spoken set entry')).toBeNull();
      expect(screen.queryByLabelText('Use reviewed values in unsaved set')).toBeNull();
      expect(apply).not.toHaveBeenCalled();
    } finally {
      subscription.mockRestore();
      if (originalImplementation)
        jest.mocked(AppState.addEventListener).mockImplementation(originalImplementation);
    }
  },
);

test.each([
  ['duration', 'thirty seconds', 'Report hold time in seconds.', { duration: '30' }],
  [
    'distance',
    'five hundred meters',
    'Report distance in meters, kilometers or miles.',
    { distance: '500' },
  ],
] as const)(
  'voice guidance and preview use only the %s field for this set',
  async (field, spoken, guidance, expected) => {
    const f = fixture(),
      apply = jest.fn(() => true);
    const scopedBinding: VoiceSetBinding = {
      ...binding,
      allowed: [field],
      required: [field],
      loadUnit: 'lb',
    };
    const screen = await render(
      <VoiceSetEntry binding={scopedBinding} adapter={f.adapter} onApply={apply} />,
    );
    expect(
      screen.getByText(`Report actual results, for example “${spoken}”. ${guidance}`),
    ).toBeTruthy();
    expect(screen.queryByText(/Load for this set/)).toBeNull();
    expect(screen.queryByText(/eight reps|forty kilograms|forty pounds/)).toBeNull();
    await act(async () => {
      void screen
        .getByLabelText('Speak a set entry')
        .props.onStartShouldSetResponder.testOnly_pressabilityConfig()
        .onPress();
    });
    await act(async () => f.resolve(spoken));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Use reviewed values in unsaved set')).toBeEnabled();
    await fireEvent.press(screen.getByLabelText('Use reviewed values in unsaved set'));
    expect(apply).toHaveBeenCalledWith(expected, voiceBindingKey(scopedBinding));
  },
);

test.each(['kg', 'lb', 'unknown'] as const)(
  'loaded set instructions disclose %s actual units and include required reps',
  async (loadUnit) => {
    const f = fixture(),
      apply = jest.fn(() => true);
    const screen = await render(
      <VoiceSetEntry binding={{ ...binding, loadUnit }} adapter={f.adapter} onApply={apply} />,
    );
    const spokenLoad = loadUnit === 'lb' ? 'forty pounds' : 'forty kilograms';
    expect(
      screen.getByText(`Report actual results, for example “eight reps, ${spokenLoad}”.`),
    ).toBeTruthy();
    expect(
      screen.getByText(
        loadUnit === 'unknown'
          ? 'Load for this set is unknown: report kilograms or pounds explicitly.'
          : `Load for this set is ${loadUnit}.`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Report hold time|Report distance/)).toBeNull();
    expect(f.adapter.listen).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  },
);
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
  expect(apply).toHaveBeenCalledWith(
    { reps: '8', load: '40', loadUnit: 'kg' },
    voiceBindingKey(binding),
  );
  expect(screen.getByText(/choose Complete or Save correction when ready/)).toBeTruthy();
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

test.each(['typed-input', 'unit-change', 'variant-change', 'focus-return'])(
  'a changed %s binding invalidates pending transcription',
  async (change) => {
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
        binding={{ ...binding, contextKey: change }}
        adapter={f.adapter}
        onApply={apply}
      />,
    );
    await act(async () => f.resolve('8 reps, 40 kilograms'));
    expect(screen.queryByLabelText('Use reviewed values in unsaved set')).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  },
);

test('pending writes cancel capture and reject retained apply callbacks', async () => {
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
  await act(async () => f.resolve('8 reps, 40 kilograms'));
  const staleApply = screen
    .getByLabelText('Use reviewed values in unsaved set')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await screen.rerender(
    <VoiceSetEntry binding={binding} adapter={f.adapter} onApply={apply} disabled />,
  );
  await act(async () => {
    staleApply();
  });
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Speak a set entry')).toBeDisabled();
});

test('background discards an already reviewed transcript and its retained apply callback', async () => {
  let background!: (state: AppStateStatus) => void;
  const subscribe = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, callback) => {
      background = callback;
      return { remove: jest.fn() };
    });
  try {
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
    await act(async () => f.resolve('8 reps, 40 kilograms'));
    const staleApply = screen
      .getByLabelText('Use reviewed values in unsaved set')
      .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
    await act(async () => {
      background('background');
      staleApply();
    });
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Review or correct the spoken set entry')).toBeNull();
    expect(f.adapter.cancel).toHaveBeenCalled();
  } finally {
    subscribe.mockRestore();
  }
});
