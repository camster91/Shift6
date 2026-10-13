import { fireEvent, render } from '@testing-library/react-native';
import { CoachWorkflowActions } from './CoachWorkflowActions';
test('fresh setup shows a small local action set and reveals disabled capability reasons on demand', async () => {
  const open = jest.fn();
  const screen = await render(
    <CoachWorkflowActions
      state={{ hasProfile: false, hasCycle: false, selection: null, guidanceId: null }}
      busy={false}
      onOpen={open}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Continue setup'));
  expect(open).toHaveBeenCalledWith('open-setup');
  expect(screen.queryByText(/Complete your setup before building/)).toBeNull();
  await fireEvent.press(screen.getByLabelText('More local controls'));
  expect(screen.getByText(/Complete your setup before building/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Build a private plan'));
  expect(open).toHaveBeenCalledTimes(1);
});
