import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Keyboard } from 'react-native';
import CoachReviewScreen from '../../app/coach-review';
import { demoCycle } from '../domain/fixtures/home';
import {
  prepareCoachReview,
  previewCoachReviewChoice,
  confirmCoachReviewChoice,
  type CoachReviewInput,
} from '../domain/coachReview';
import type { SavedCoachReview } from '../db/coachReviewRepository';
import type { Shift } from '../domain/shift';
import type { ButtonProps } from './ui/Button';
import type { ScreenProps } from './ui/Screen';
import { formatRecordedDateTime } from '../domain/datePresentation';
let mockOwner = 'guest-user';
let mockBlur: (() => void) | undefined;
let mockFocus: (() => () => void) | undefined;
let mockDb = {};
const mockLoad = jest.fn(),
  mockHistory = jest.fn(),
  mockConfirm = jest.fn(),
  mockCycle = jest.fn(),
  mockNavigate = jest.fn();
const stamp = '2026-10-13T16:00:00.000Z';
const cycle = { ...demoCycle, userId: 'guest-user' };
let packet: CoachReviewInput;
// Keep the real Button while capturing the screen's handler before React can
// commit a disabled state, to exercise two callbacks in the same event.
const mockButtonHandlers = new Map<string, (() => void) | undefined>();
const mockRenderFrames: { db: object; owner: string; text: string }[] = [];
let mockBeforeEffects: (() => void) | undefined;
function mockVisibleText(node: unknown): string {
  if (Array.isArray(node)) return node.map(mockVisibleText).join(' ');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: unknown; label?: string } }).props;
    return `${props.label ?? ''} ${mockVisibleText(props.children)}`;
  }
  return '';
}
jest.mock('./ui', () => {
  const actual = jest.requireActual('./ui'),
    React = jest.requireActual('react');
  return {
    ...actual,
    Button: (props: ButtonProps) => {
      mockButtonHandlers.set(props.label, props.onPress);
      return React.createElement(actual.Button, props);
    },
    Screen: (props: ScreenProps) => {
      mockRenderFrames.push({
        db: mockDb,
        owner: mockOwner,
        text: `${mockVisibleText(props.children)} ${mockVisibleText(props.footer)}`,
      });
      mockBeforeEffects?.();
      return React.createElement(actual.Screen, props);
    },
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (callback: () => () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocus = callback;
      mockBlur = callback();
      return () => mockBlur?.();
    }, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: (...args: unknown[]) => mockCycle(...args),
}));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: async () => ({ user: { unitSystem: 'imperial' } }),
}));
jest.mock('../db/coachReviewRepository', () => ({
  loadDatedCoachReview: (...args: unknown[]) => mockLoad(...args),
  getSavedCoachReviews: (...args: unknown[]) => mockHistory(...args),
  confirmDatedCoachReview: (...args: unknown[]) => mockConfirm(...args),
}));
jest.mock('../services/coachNavigation', () => ({
  resolveCoachNavigation: (...args: unknown[]) => mockNavigate(...args),
}));
beforeEach(() => {
  jest.resetAllMocks();
  mockButtonHandlers.clear();
  mockRenderFrames.length = 0;
  mockBeforeEffects = undefined;
  mockDb = {};
  mockOwner = 'guest-user';
  mockBlur = undefined;
  mockFocus = undefined;
  jest.useFakeTimers();
  jest.setSystemTime(new Date(stamp));
  packet = {
    ownerId: cycle.userId,
    cycle,
    programVersionId: cycle.programVersionId,
    now: stamp,
    window: { startDate: '2026-10-07', endDate: '2026-10-13', timeZone: 'America/Toronto' },
    goal: null,
    observations: [],
    sessions: [
      {
        id: 'actual-partial',
        cycleId: cycle.id,
        programVersionId: cycle.programVersionId,
        workoutId: 'private-workout',
        cycleWeek: 1,
        workoutFocus: 'mixed',
        isOffline: true,
        status: 'partial',
        completionReason: 'time-limited',
        startedAt: '2026-10-12T12:00:00.000Z',
        completedAt: '2026-10-12T12:30:00.000Z',
      },
    ],
  };
  mockCycle.mockResolvedValue(cycle);
  mockHistory.mockResolvedValue([]);
  mockLoad.mockImplementation(async (_db, _owner, _cycle, window, now) =>
    prepareCoachReview({ ...packet, window, now }),
  );
  mockConfirm.mockImplementation(
    async (_db, preview, id, parent, confirmedAt, confirmed, isCurrent) => {
      if (!isCurrent()) throw new Error('Review context changed.');
      const saved = {
        id,
        previousReviewId: parent,
        receipt: confirmCoachReviewChoice(
          preview,
          prepareCoachReview({ ...packet, window: preview.window, now: confirmedAt }),
          confirmedAt,
          confirmed,
        ),
      };
      mockHistory.mockResolvedValue([saved]);
      return saved;
    },
  );
  mockNavigate.mockResolvedValue({
    status: 'ready-to-open',
    owner: 'guest-user',
    route: '/coach-onboarding',
  });
});
test.each([
  ['owner', 'preview'],
  ['database', 'preview'],
  ['owner', 'receipt'],
  ['database', 'receipt'],
] as const)(
  'a %s transition hides the old %s and private history during the first render and rejects its retained callback before focus effects',
  async (kind, phase) => {
    const screen = await ready();
    await fireEvent.press(screen.getByLabelText('Review availability'));
    if (phase === 'receipt') {
      await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
      await waitFor(() => expect(screen.getByText('Saved dated review history')).toBeTruthy());
    }
    const retained = mockButtonHandlers.get(
      phase === 'receipt' ? 'Continue to setup' : 'Confirm and save intent',
    )!;
    mockConfirm.mockClear();
    const oldDb = mockDb;
    mockLoad.mockImplementation(() => new Promise(() => {}));
    if (kind === 'owner') {
      mockOwner = 'other-owner';
      mockCycle.mockResolvedValue({ ...cycle, userId: mockOwner });
    } else mockDb = {};
    const changedDb = mockDb,
      changedOwner = mockOwner;
    let tapped = false;
    mockBeforeEffects = () => {
      if (!tapped) {
        tapped = true;
        retained();
      }
    };
    await screen.rerender(<CoachReviewScreen />);
    mockBeforeEffects = undefined;
    const frames = mockRenderFrames.filter(
      (frame) =>
        frame.owner === changedOwner &&
        frame.db === changedDb &&
        (kind === 'owner' || frame.db !== oldDb),
    );
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames)
      expect(frame.text).not.toMatch(
        /Sessions started in this date range|Confirm dated intent|Dated intent saved locally|Saved dated review history|One optional question|Keep plan/,
      );
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Confirm and save intent')).toBeNull();
  },
);
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function ready() {
  const screen = await render(<CoachReviewScreen />);
  await waitFor(() => expect(screen.getByText('Sessions started in this date range')).toBeTruthy());
  return screen;
}
test('dated session evidence is explicit, bounded and local with a single skippable question; reading and preview never save', async () => {
  const screen = await ready();
  expect(screen.getByText(/0 complete · 1 partial · 0 skipped · 0 in progress/)).toBeTruthy();
  expect(screen.getByText(/original start date/)).toBeTruthy();
  expect(screen.getByText(/Planned coverage and adherence are unavailable/)).toBeTruthy();
  expect(screen.getAllByText('One optional question')).toHaveLength(1);
  await fireEvent.press(screen.getByLabelText('Skip question'));
  await fireEvent.press(screen.getByLabelText('Review availability'));
  expect(screen.getByText('Confirm dated intent: Review availability')).toBeTruthy();
  expect(screen.getByText(/any changes require its own confirmation/)).toBeTruthy();
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Cancel preview'));
  expect(screen.queryByLabelText('Confirm and save intent')).toBeNull();
  expect(mockConfirm).not.toHaveBeenCalled();
});

test('choosing a current intent opens an immediately actionable preview and native Back cancels without saving', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Keep plan'));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('coach-review-preview-modal')).toBeTruthy();
  expect(screen.getByLabelText('Confirm and save intent')).not.toBeDisabled();
  expect(screen.getByLabelText('Cancel preview')).not.toBeDisabled();
  expect(mockConfirm).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('coach-review-preview-modal'), 'requestClose');
  expect(screen.queryByLabelText('Confirm and save intent')).toBeNull();
  expect(mockConfirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Keep plan'));
  await fireEvent.press(screen.getByLabelText('Cancel preview'));
  expect(screen.queryByLabelText('Confirm and save intent')).toBeNull();
  dismiss.mockRestore();
});
test('only confirmation saves the selected intent; optional answer stays in receipt and navigation is a separate action', async () => {
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Review available time'));
  await fireEvent.press(screen.getByLabelText('Review availability'));
  await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
  await waitFor(() => expect(screen.getByText('Dated intent saved locally')).toBeTruthy());
  expect(mockConfirm).toHaveBeenCalledTimes(1);
  expect(mockConfirm.mock.calls[0]![1]).toMatchObject({
    choice: 'review-availability',
    response: { questionId: 'time-limited-stop', answer: 'review-availability' },
  });
  expect(mockConfirm.mock.calls[0]![5]).toBe(true);
  expect(screen.getByText('Your plan was not changed by this receipt.')).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Continue to setup'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/coach-onboarding'));
  expect(mockNavigate).toHaveBeenCalledWith(mockDb, 'guest-user', 'open-setup');
});
test('same-event double confirmation uses one immediate pending mutex and controls stay frozen until receipt resolves', async () => {
  let release!: (result: SavedCoachReview) => void;
  mockConfirm.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Keep plan'));
  const onPress = mockButtonHandlers.get('Confirm and save intent')!;
  await act(() => {
    onPress();
    onPress();
  });
  expect(mockConfirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText('Review start date')).toBeNull();
  expect(screen.getByLabelText('Confirm and save intent')).toBeDisabled();
  expect(screen.getByLabelText('Cancel preview')).toBeDisabled();
  await fireEvent(screen.getByTestId('coach-review-preview-modal'), 'requestClose');
  expect(screen.getByTestId('coach-review-preview-modal')).toBeTruthy();
  const [_db, preview, id, parent] = mockConfirm.mock.calls[0]!;
  await act(() =>
    release({
      id,
      previousReviewId: parent,
      receipt: {
        ...confirmCoachReviewChoice(
          preview,
          prepareCoachReview({ ...packet, window: preview.window }),
          stamp,
          true,
        ),
        goalWitness: null,
      },
    }),
  );
  await waitFor(() => expect(screen.getByText('Dated intent saved locally')).toBeTruthy());
});
test('focus loss permanently invalidates a pending confirmation even when the same screen refocuses', async () => {
  let release!: () => void;
  mockConfirm.mockImplementationOnce(async (...args) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    if (!args[6]()) throw new Error('Review context changed.');
    throw new Error('unexpected current request');
  });
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Keep plan'));
  await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
  const guard = mockConfirm.mock.calls[0]![6];
  expect(guard()).toBe(true);
  await act(async () => {
    mockBlur?.();
    mockBlur = mockFocus?.();
  });
  expect(guard()).toBe(false);
  await act(async () => release());
  await waitFor(() => expect(screen.getByLabelText('Keep plan')).not.toBeDisabled());
  expect(screen.queryByText('Dated intent saved locally')).toBeNull();
  expect(screen.queryByText('Review context changed.')).toBeNull();
});
test('nonempty invalid dates produce actionable guidance and no stale evidence or journal mutation', async () => {
  const screen = await ready();
  await fireEvent.changeText(screen.getByLabelText('Review start date'), '2026-09-01');
  expect(screen.queryByText('Sessions started in this date range')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Review these dates'));
  await waitFor(() => expect(screen.getByText(/at most seven elapsed local dates/)).toBeTruthy());
  expect(screen.queryByLabelText('Keep plan')).toBeNull();
  expect(mockConfirm).not.toHaveBeenCalled();
});
test('changed evidence fails confirmation visibly without claiming a receipt or plan application', async () => {
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Keep plan'));
  packet.sessions = [{ ...packet.sessions[0]!, status: 'complete' }];
  await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
  await waitFor(() => expect(screen.getByText(/changed/)).toBeTruthy());
  expect(screen.queryByText('Dated intent saved locally')).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
});
test('remount reads confirmed journal history; an old receipt does not imply current evidence or plan changes', async () => {
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Keep plan'));
  await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
  const saved = await mockConfirm.mock.results[0]!.value;
  mockHistory.mockResolvedValue([saved]);
  await screen.unmount();
  const restored = await ready();
  expect(restored.getByText('Saved dated review history')).toBeTruthy();
  expect(restored.getByText(/Evidence reflects each confirmation time/)).toBeTruthy();
  expect(restored.queryByLabelText('Confirm and save intent')).toBeNull();
  expect(restored.queryByLabelText('Continue to setup')).toBeNull();
  expect(mockConfirm).toHaveBeenCalledTimes(1);
});

async function restoredAvailability() {
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Review availability'));
  await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
  const saved = await mockConfirm.mock.results[0]!.value;
  await screen.unmount();
  return { screen: await ready(), saved };
}

test.each(['Cancel preview', 'native Back'])(
  '%s restores the latest confirmed follow-up without a write and preview blocks its retained callback',
  async (exit) => {
    const { screen, saved } = await restoredAvailability();
    const canonical = JSON.stringify(saved);
    const retained = mockButtonHandlers.get('Continue to setup')!;
    const choose = mockButtonHandlers.get('Keep plan')!;
    await act(() => {
      choose();
      retained();
    });
    expect(screen.queryByLabelText('Continue to setup')).toBeNull();
    await act(() => retained());
    expect(mockNavigate).not.toHaveBeenCalled();
    if (exit === 'native Back')
      await fireEvent(screen.getByTestId('coach-review-preview-modal'), 'requestClose');
    else await fireEvent.press(screen.getByLabelText('Cancel preview'));
    expect(screen.getByLabelText('Continue to setup')).toBeTruthy();
    expect(JSON.stringify(saved)).toBe(canonical);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText('Continue to setup'));
    expect(router.push).toHaveBeenCalledWith('/coach-onboarding');
  },
);

test.each(['just confirmed', 'cold reopened'])(
  'the %s dated follow-up is before date entry and evidence with one guarded action',
  async (phase) => {
    let screen = await ready();
    await fireEvent.press(screen.getByLabelText('Review availability'));
    await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
    const saved = await mockConfirm.mock.results[0]!.value;
    const before = JSON.stringify(saved);
    if (phase === 'cold reopened') {
      await screen.unmount();
      screen = await ready();
    }
    const frame = mockRenderFrames.at(-1)!.text;
    expect(frame.indexOf('Continue to setup')).toBeGreaterThan(-1);
    expect(frame.indexOf('Continue to setup')).toBeLessThan(
      frame.indexOf('Choose up to seven local dates'),
    );
    expect(frame.indexOf('Continue to setup')).toBeLessThan(
      frame.indexOf('Sessions started in this date range'),
    );
    expect(screen.getAllByLabelText('Continue to setup')).toHaveLength(1);
    expect(
      screen.getByText(
        `Reviewed dates: ${saved.receipt.window.startDate} through ${saved.receipt.window.endDate} · ${saved.receipt.window.timeZone}`,
      ),
    ).toBeTruthy();
    expect(JSON.stringify(saved)).toBe(before);
    await fireEvent.press(screen.getByLabelText('Continue to setup'));
    expect(router.push).toHaveBeenCalledWith('/coach-onboarding');
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  },
);

test('cold reopen recovers only the latest owned dated next step and separately rechecks its exact head', async () => {
  const { screen, saved } = await restoredAvailability();
  expect(screen.getByText('Latest saved dated intent')).toBeTruthy();
  expect(screen.queryByLabelText('Confirm and save intent')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Continue to setup'));
  expect(mockHistory).toHaveBeenCalledWith(mockDb, mockOwner, cycle.id, 1);
  expect(router.push).toHaveBeenCalledWith('/coach-onboarding');
  expect(mockConfirm).toHaveBeenCalledTimes(1);
  expect(saved.receipt.confirmedAt).toBe(stamp);
});

test.each(['head', 'same-id-content', 'version', 'goal', 'blur'])(
  'a recovered next step refuses a changed %s without saving another intent',
  async (change) => {
    const { screen, saved } = await restoredAvailability();
    const retained = mockButtonHandlers.get('Continue to setup')!;
    if (change === 'head') mockHistory.mockResolvedValue([{ ...saved, id: 'newer-keep-plan' }]);
    if (change === 'same-id-content')
      mockHistory.mockResolvedValue([
        { ...saved, receipt: { ...saved.receipt, response: null, choice: 'keep-plan' } },
      ]);
    if (change === 'version')
      mockCycle.mockResolvedValue({ ...cycle, programVersionId: 'new-version' });
    if (change === 'goal')
      mockLoad.mockImplementation(async (_db, _owner, _cycle, window, now) => {
        const fresh = prepareCoachReview({ ...packet, window, now });
        return {
          ...fresh,
          evidenceFingerprint: JSON.stringify({
            ...JSON.parse(fresh.evidenceFingerprint),
            goal: { id: 'new-goal', target: 'revised-target' },
          }),
        };
      });
    if (change === 'blur') await act(() => mockBlur?.());
    await act(() => retained());
    expect(router.push).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    if (change !== 'blur') expect(screen.getByText(/changed. Reload/)).toBeTruthy();
  },
);

test('a newer Keep plan suppresses an older availability continuation on cold reopen', async () => {
  const { screen, saved } = await restoredAvailability();
  await screen.unmount();
  const fresh = prepareCoachReview(packet);
  mockHistory.mockResolvedValue([
    {
      id: 'newer-keep-plan',
      previousReviewId: saved.id,
      receipt: {
        ...confirmCoachReviewChoice(
          previewCoachReviewChoice(fresh, 'keep-plan'),
          fresh,
          stamp,
          true,
        ),
        goalWitness: null,
      },
    },
    saved,
  ]);
  const restored = await ready();
  expect(restored.queryByLabelText('Continue to setup')).toBeNull();
  expect(mockConfirm).toHaveBeenCalledTimes(1);
});

test.each(['foreign', 'version', 'goal'])(
  'cold reopen never restores continuation from a %s saved context',
  async (change) => {
    const { screen, saved } = await restoredAvailability();
    await screen.unmount();
    const receipt = {
      ...saved.receipt,
      ...(change === 'foreign' ? { ownerId: 'another-person' } : {}),
      ...(change === 'version' ? { programVersionId: 'old-version' } : {}),
      ...(change === 'goal'
        ? { goalWitness: { state: 'unavailable-legacy-history', goalId: 'old-goal' } }
        : {}),
    };
    mockHistory.mockResolvedValue([{ ...saved, receipt }]);
    const restored = await render(<CoachReviewScreen />);
    await waitFor(() => expect(restored.queryByText(/Loading the current person/)).toBeNull());
    expect(restored.queryByLabelText('Continue to setup')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  },
);

test.each(['head', 'goal', 'owner', 'database'])(
  'navigation resolver returning after a changed %s cannot open a recovered follow-up',
  async (change) => {
    const { screen, saved } = await restoredAvailability();
    let resolve!: (value: { route: string }) => void;
    mockNavigate.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
    await fireEvent.press(screen.getByLabelText('Continue to setup'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    if (change === 'head') mockHistory.mockResolvedValue([{ ...saved, id: 'new-head' }]);
    if (change === 'goal')
      mockLoad.mockImplementation(async (_db, _owner, _cycle, window, now) => ({
        ...prepareCoachReview({ ...packet, window, now }),
        goalWitness: { state: 'unavailable-legacy-history', goalId: 'changed-goal' },
      }));
    if (change === 'owner') mockOwner = 'new-owner';
    if (change === 'database') mockDb = {};
    if (change === 'owner' || change === 'database') await screen.rerender(<CoachReviewScreen />);
    await act(() => resolve({ route: '/coach-onboarding' }));
    expect(router.push).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  },
);

test('historical confirmation dates use each saved timezone without rewriting receipt data', async () => {
  const snapshot = prepareCoachReview({
    ...packet,
    window: { ...packet.window, timeZone: 'Asia/Tokyo' },
  });
  const receipt = {
    ...confirmCoachReviewChoice(
      previewCoachReviewChoice(snapshot, 'keep-plan'),
      snapshot,
      stamp,
      true,
    ),
    goalWitness: null,
  };
  const saved = { id: 'saved-tokyo', previousReviewId: null, receipt };
  const canonicalBefore = JSON.stringify(saved);
  mockHistory.mockResolvedValue([saved]);
  const screen = await ready();
  expect(
    screen.getByText(`Keep plan · confirmed ${formatRecordedDateTime(stamp, 'Asia/Tokyo')}`),
  ).toBeTruthy();
  expect(
    screen.queryByText(`Keep plan · confirmed ${formatRecordedDateTime(stamp, 'America/Toronto')}`),
  ).toBeNull();
  expect(JSON.stringify(saved)).toBe(canonicalBefore);
  expect(saved.receipt.confirmedAt).toBe(stamp);
  expect(saved.receipt.window.timeZone).toBe('Asia/Tokyo');
  expect(mockConfirm).not.toHaveBeenCalled();
});
test('goal baseline-to-latest dates are separate from session window, and Imperial labels preserve canonical load comparison', async () => {
  const goal: Shift = {
    id: 'goal',
    userId: cycle.userId,
    cycleId: cycle.id,
    programVersionId: cycle.programVersionId,
    templateId: 'personal-entry-v1',
    blockObjective: 'Synthetic fixed-rep load',
    target: 50,
    baseline: { state: 'measured', observationId: 'baseline' },
    reviewState: 'missing',
    nextChoice: 'undecided',
    protocol: {
      id: 'protocol',
      version: 1,
      exerciseId: 'private',
      variantId: 'same',
      equipmentSetup: 'same setup',
      assistance: 'none',
      metric: 'load-for-reps',
      canonicalUnit: 'kg',
      direction: 'higher',
      repCount: 5,
    },
  };
  packet.goal = goal;
  packet.observations = [
    {
      id: 'baseline',
      shiftId: goal.id,
      protocolId: goal.protocol.id,
      protocolVersion: 1,
      measuredAt: '2026-10-01T12:00:00.000Z',
      source: 'assessment',
      value: 40,
      unit: 'kg',
    },
    {
      id: 'latest',
      shiftId: goal.id,
      protocolId: goal.protocol.id,
      protocolVersion: 1,
      measuredAt: '2026-10-12T12:00:00.000Z',
      source: 'assessment',
      value: 45,
      unit: 'kg',
    },
  ];
  const screen = await ready();
  const loadedWindow = mockLoad.mock.calls[0]![3];
  expect(
    screen.getByText(
      `Baseline: 88.184905 lb · measured ${formatRecordedDateTime(packet.observations[0]!.measuredAt, loadedWindow.timeZone)}`,
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      `Latest: 99.208018 lb · measured ${formatRecordedDateTime(packet.observations[1]!.measuredAt, loadedWindow.timeZone)}`,
    ),
  ).toBeTruthy();
  expect(screen.getByText(/separately from the selected session dates/)).toBeTruthy();
  expect(screen.getByText(/Measured change: improved/)).toBeTruthy();
  expect(packet.observations[0]!.value).toBe(40);
});
test('a changed cycle blocks the separate receipt navigation instead of opening a different goal', async () => {
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Open goal review'));
  await fireEvent.press(screen.getByLabelText('Confirm and save intent'));
  await waitFor(() => expect(screen.getByLabelText('Continue to personal goal')).toBeTruthy());
  mockCycle.mockResolvedValue({ ...cycle, id: 'different-cycle' });
  await fireEvent.press(screen.getByLabelText('Continue to personal goal'));
  await waitFor(() => expect(screen.getByText(/reviewed cycle changed/)).toBeTruthy());
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});
test('legacy goal history is explicitly unavailable rather than a fabricated comparison or missing goal claim', async () => {
  mockLoad.mockImplementation(async (_db, _owner, _cycle, window, now) => ({
    ...prepareCoachReview({ ...packet, window, now }),
    goalWitness: { state: 'unavailable-legacy-history', goalId: 'legacy-goal' },
  }));
  const screen = await ready();
  expect(screen.getByText(/dated change history is unavailable/)).toBeTruthy();
  expect(screen.queryByText('No personal goal is saved for this cycle.')).toBeNull();
  expect(screen.queryByText(/Measured change:/)).toBeNull();
  expect(screen.getByLabelText('Open goal review')).not.toBeDisabled();
});
