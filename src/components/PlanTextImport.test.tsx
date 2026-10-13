import { act, fireEvent, render } from '@testing-library/react-native';
import { PlanTextImport } from './PlanTextImport';
import { createCustomExercise } from '../domain/programBuilder';
const movement = createCustomExercise({
  id: 'private',
  name: 'My squat',
  movementPattern: 'squat',
  primaryMuscles: ['quadriceps'],
  equipmentIds: ['equipment-bodyweight'],
  trackingType: 'reps',
});

test('preview is inert, unresolved units block apply and edited text requires a refreshed preview', async () => {
  const apply = jest.fn();
  const screen = await render(
    <PlanTextImport available={[movement]} workoutTitle="My workout" onApply={apply} />,
  );
  await fireEvent.press(screen.getByLabelText('Import pasted targets for My workout'));
  await fireEvent.changeText(
    screen.getByLabelText('User-owned workout text for My workout'),
    'My squat | sets=3 | reps=8 | load=40 | rest=90s',
  );
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Add reviewed rows to this workout')).toBeDisabled();
  expect(screen.getByText(/Load needs an explicit/)).toBeTruthy();
  const valid = 'My squat | sets=3 | reps=8 | load=40kg | rest=90s';
  await fireEvent.changeText(
    screen.getByLabelText('User-owned workout text for My workout'),
    valid,
  );
  expect(screen.queryByLabelText('Add reviewed rows to this workout')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  expect(screen.getByText(/Original: My squat/)).toBeTruthy();
  expect(screen.getByText(/8 reps, 40 kg/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Add reviewed rows to this workout'));
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith(valid);
  expect(screen.getByText(/Rows added to your unsaved plan/)).toBeTruthy();
});

test('closing or a rejected apply never claims saved records', async () => {
  const apply = jest.fn(() => {
    throw new Error('Owner changed; reload draft.');
  });
  const screen = await render(
    <PlanTextImport available={[movement]} workoutTitle="My workout" onApply={apply} />,
  );
  await fireEvent.press(screen.getByLabelText('Import pasted targets for My workout'));
  await fireEvent.changeText(
    screen.getByLabelText('User-owned workout text for My workout'),
    'My squat | sets=3 | reps=8 | rest=90s',
  );
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  await fireEvent.press(screen.getByLabelText('Add reviewed rows to this workout'));
  expect(screen.getByText('Owner changed; reload draft.')).toBeTruthy();
  expect(screen.queryByText(/Rows added to your unsaved plan/)).toBeNull();
  await fireEvent.press(screen.getByLabelText('Close pasted targets for My workout'));
  expect(screen.queryByLabelText('User-owned workout text for My workout')).toBeNull();
});

test('one preview applies once before rerender; editing invalidates stale callbacks and repreview permits a fresh apply', async () => {
  const apply = jest.fn();
  const screen = await render(
    <PlanTextImport available={[movement]} workoutTitle="My workout" onApply={apply} />,
  );
  await fireEvent.press(screen.getByLabelText('Import pasted targets for My workout'));
  const original = 'My squat | sets=3 | reps=8 | rest=90s';
  await fireEvent.changeText(
    screen.getByLabelText('User-owned workout text for My workout'),
    original,
  );
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  const first = screen
    .getByLabelText('Add reviewed rows to this workout')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    first();
    first();
  });
  expect(apply).toHaveBeenCalledTimes(1);

  const next = 'My squat | sets=2 | reps=6 | rest=60s';
  await fireEvent.changeText(screen.getByLabelText('User-owned workout text for My workout'), next);
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  const stale = screen
    .getByLabelText('Add reviewed rows to this workout')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await fireEvent.changeText(
    screen.getByLabelText('User-owned workout text for My workout'),
    original,
  );
  await act(async () => stale());
  expect(apply).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  const fresh = screen
    .getByLabelText('Add reviewed rows to this workout')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    first();
    stale();
    fresh();
    fresh();
  });
  expect(apply).toHaveBeenCalledTimes(2);
  expect(apply).toHaveBeenLastCalledWith(original);
});
