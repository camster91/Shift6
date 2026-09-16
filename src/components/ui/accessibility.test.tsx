import { render } from '@testing-library/react-native';
import { View } from 'react-native';

import type { CoachProposal, Program, Workout } from '../../domain/types';
import { Button } from './Button';
import { Chip } from './Chip';
import { CoachProposalCard } from './CoachProposalCard';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
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

const coachProposal: CoachProposal = {
  id: 'proposal-1',
  summary: 'Keep the same exercises and add one rep next time.',
  confidence: 'high',
  evidence: ['All working sets were completed.'],
  changes: [
    {
      id: 'change-1',
      type: 'target-change',
      field: 'reps',
      from: '8',
      to: '9',
      requiresUserConfirmation: true,
    },
  ],
  safetyNotes: [],
  status: 'pending',
  createdAt: '2026-09-16T12:00:00.000Z',
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

  it('supports contextual spoken labels without changing visible button copy', () => {
    const { getByLabelText, getByText } = render(
      <Button
        label="Complete"
        accessibilityLabel="Complete Bench Press set 2"
        onPress={jest.fn()}
      />,
    );

    expect(getByText('Complete')).toBeTruthy();
    expect(getByLabelText('Complete Bench Press set 2')).toBeTruthy();
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

  it('supports semantic radio chips for single-choice workout context', () => {
    const { getByRole } = render(
      <Chip
        accessibilityRole="radio"
        label="Ready to train"
        selected
        onPress={jest.fn()}
      />,
    );
    const radio = getByRole('radio');

    expect(radio.props.accessibilityState).toEqual({ disabled: false, selected: true });
  });

  it('keeps retry actions outside the grouped alert focus target', () => {
    const { getByLabelText } = render(
      <ErrorState message="The set could not be saved." onRetry={jest.fn()} />,
    );

    expect(
      getByLabelText('Something needs attention. The set could not be saved.').props
        .accessibilityRole,
    ).toBe('alert');
    expect(getByLabelText('Try again')).toBeTruthy();
  });

  it('keeps empty-state actions outside the grouped empty-state copy', () => {
    const { getByLabelText } = render(
      <EmptyState
        title="No workouts yet"
        message="Start a program to begin."
        actionLabel="Browse programs"
        onAction={jest.fn()}
      />,
    );

    expect(getByLabelText('No workouts yet. Start a program to begin.')).toBeTruthy();
    expect(getByLabelText('Browse programs')).toBeTruthy();
  });

  it('keeps coach proposal decisions outside the grouped proposal summary', () => {
    const { getByLabelText } = render(
      <CoachProposalCard proposal={coachProposal} onApprove={jest.fn()} onReject={jest.fn()} />,
    );

    expect(
      getByLabelText(
        'Coach proposal. Keep the same exercises and add one rep next time. 1 proposed changes.',
      ),
    ).toBeTruthy();
    expect(getByLabelText('Keep current')).toBeTruthy();
    expect(getByLabelText('Approve & apply')).toBeTruthy();
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
