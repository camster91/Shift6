import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import type { Program, Workout } from '../../domain/types';
import { Button } from './Button';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { ProgramCard } from './ProgramCard';
import { ProgressIndicator } from './ProgressIndicator';
import { Text } from './Text';
import { WorkoutCard } from './WorkoutCard';

const program: Program = {
  id: 'program-1',
  slug: 'barbell-30',
  title: 'Barbell 30',
  description: 'A focused strength program.',
  goals: ['strength'],
  targetUser: 'Lifters who want focused sessions',
  experience: ['beginner', 'intermediate'],
  daysPerWeek: 3,
  sessionLengthMinutes: 30,
  requiredEquipmentIds: ['barbell'],
  optionalEquipmentIds: [],
  progressionStrategy: 'double-progression',
  currentVersionId: 'program-version-1',
  isTemplate: true,
};

const workout: Workout = {
  id: 'workout-1',
  programVersionId: 'program-version-1',
  title: 'Full Body A',
  dayOfWeek: 1,
  focus: 'strength',
  estimatedDurationMinutes: 30,
  equipmentIds: ['barbell'],
  exercises: [],
};

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

  it('gives an interactive program card one labelled focus target', () => {
    const label = 'Barbell 30. A focused strength program.';
    const { getAllByLabelText } = render(<ProgramCard program={program} onPress={jest.fn()} />);

    expect(getAllByLabelText(label)).toHaveLength(1);
  });

  it('gives an interactive workout card one labelled focus target', () => {
    const label = 'Full Body A, 30 minutes';
    const { getAllByLabelText } = render(<WorkoutCard workout={workout} onPress={jest.fn()} />);

    expect(getAllByLabelText(label)).toHaveLength(1);
  });
});
