import { render } from '@testing-library/react-native';

import type { CycleWeek } from '../../domain/types';
import { SixWeekIndicator } from './SixWeekIndicator';

const weeks: CycleWeek[] = [
  {
    weekNumber: 1,
    label: 'Week 1',
    phase: 'Establish',
    status: 'completed',
    completedWorkoutCount: 3,
    plannedWorkoutCount: 3,
  },
  {
    weekNumber: 2,
    label: 'Week 2',
    phase: 'Repeatability',
    status: 'current',
    completedWorkoutCount: 1,
    plannedWorkoutCount: 3,
  },
  {
    weekNumber: 3,
    label: 'Week 3',
    phase: 'Build',
    status: 'partial',
    completedWorkoutCount: 1,
    plannedWorkoutCount: 3,
  },
  {
    weekNumber: 4,
    label: 'Week 4',
    phase: 'Build',
    status: 'missed',
    completedWorkoutCount: 0,
    plannedWorkoutCount: 3,
  },
  {
    weekNumber: 5,
    label: 'Week 5',
    phase: 'Challenge',
    status: 'upcoming',
    completedWorkoutCount: 0,
    plannedWorkoutCount: 3,
  },
  {
    weekNumber: 6,
    label: 'Week 6',
    phase: 'Review',
    status: 'upcoming',
    completedWorkoutCount: 0,
    plannedWorkoutCount: 3,
  },
];

describe('SixWeekIndicator', () => {
  it('communicates all supported week states in an accessible summary', async () => {
    const { getByLabelText, getByText } = await render(<SixWeekIndicator weeks={weeks} />);

    expect(
      getByLabelText(
        'Six-week cycle. Week 1: completed; Week 2: current; Week 3: partial; Week 4: missed; Week 5: upcoming; Week 6: upcoming',
      ),
    ).toBeTruthy();
    expect(getByText('W2')).toBeTruthy();
    expect(getByText('! missed')).toBeTruthy();
  });
});
