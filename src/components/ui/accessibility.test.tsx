import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import { Button } from './Button';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { ProgressIndicator } from './ProgressIndicator';
import { Text } from './Text';

describe('shared accessibility primitives', () => {
  it('marks a button without an action as disabled', () => {
    const { getByLabelText } = render(<Button label="Save" />);

    expect(getByLabelText('Save').props.accessibilityState).toEqual({
      busy: false,
      disabled: true,
    });
  });

  it('exposes loading buttons as busy and disabled', () => {
    const { getByLabelText } = render(<Button label="Save" loading onPress={jest.fn()} />);

    expect(getByLabelText('Save').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
  });

  it('keeps icon-button disabled semantics aligned with its actual action state', () => {
    const { getByLabelText } = render(
      <IconButton icon={<View />} label="Close" accessibilityHint="Closes this screen" />,
    );
    const button = getByLabelText('Close');

    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(button.props.accessibilityHint).toBe('Closes this screen');
  });

  it('adds a visible non-colour cue for selected chips', () => {
    const { getByLabelText, getByText } = render(
      <Chip label="Strength" selected onPress={jest.fn()} />,
    );

    expect(getByText('✓ Strength')).toBeTruthy();
    expect(getByLabelText('Strength').props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
  });

  it('clamps progress values and exposes the bounded value to assistive technology', () => {
    const { getByLabelText } = render(<ProgressIndicator label="Cycle progress" value={1.4} />);
    const progress = getByLabelText('Cycle progress: 100%');

    expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('keeps app text opted into system font scaling', () => {
    const { getByText } = render(<Text>Readable</Text>);

    expect(getByText('Readable').props.allowFontScaling).toBe(true);
  });
});
