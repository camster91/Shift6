import type { CoachContext } from './contracts';
import {
  CoachGatewayProtocolError,
  CoachGatewayUnavailableError,
  HttpCoachGateway,
  UnavailableCoachGateway,
  minimizeCoachContext,
} from './coach';

const context: CoachContext = {
  user: {
    id: 'guest-user',
    unitSystem: 'imperial',
    goals: ['strength'],
    experience: 'beginner',
  },
  cycle: {
    id: 'cycle-1',
    programVersionId: 'version-1',
    currentWeek: 2,
    status: 'active',
  },
  structuredFacts: {
    workoutTitle: 'Strength A',
    currentWeek: 2,
    privateNote: 'This free-text note must not cross the Coach boundary.',
    malformed: { nested: true },
  },
};

const proposalResponse = {
  id: 'proposal-1',
  summary: 'Add one rep to the next bench target.',
  confidence: 'medium',
  evidence: ['All prescribed reps were completed twice.'],
  changes: [
    {
      id: 'change-1',
      type: 'target-change',
      workoutId: 'workout-1',
      workoutExerciseId: 'workout-exercise-1',
      exerciseId: 'exercise-bench-press',
      field: 'reps',
      from: '6',
      to: '7',
      requiresUserConfirmation: true,
    },
  ],
  safetyNotes: [],
  status: 'pending',
  createdAt: '2026-09-14T12:00:00.000Z',
};

describe('Coach gateway boundary', () => {
  it('minimizes structured context before a provider can receive it', () => {
    const minimized = minimizeCoachContext(context);

    expect(minimized.structuredFacts).toEqual({ workoutTitle: 'Strength A', currentWeek: 2 });
  });

  it('requires an injected access token and never invents a provider result', async () => {
    const gateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => null,
    });

    await expect(gateway.generateMessage(context, 'weekly-review')).rejects.toBeInstanceOf(
      CoachGatewayUnavailableError,
    );
  });

  it('sends a bounded authenticated request and parses a message response', async () => {
    let requestUrl = '';
    let requestBody = '';
    let authorization = '';
    const gateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test/',
      getAccessToken: async () => 'test-token',
      fetcher: async (input, init) => {
        requestUrl = String(input);
        requestBody = String(init?.body);
        authorization = new Headers(init?.headers).get('Authorization') ?? '';
        return new Response(
          JSON.stringify({
            kind: 'message',
            text: 'Keep the next session repeatable.',
            factsUsed: ['current cycle week'],
          }),
          { status: 200 },
        );
      },
    });

    await expect(gateway.generateMessage(context, 'weekly-review')).resolves.toMatchObject({
      kind: 'message',
      text: 'Keep the next session repeatable.',
    });
    expect(requestUrl).toBe('https://api.example.test/v1/coach/message');
    expect(authorization).toBe('Bearer test-token');
    expect(JSON.parse(requestBody).context.structuredFacts).toEqual({
      workoutTitle: 'Strength A',
      currentWeek: 2,
    });
  });

  it('sends a trimmed bounded question separately from structured context', async () => {
    let requestBody = '';
    const gateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'test-token',
      fetcher: async (_input, init) => {
        requestBody = String(init?.body);
        return new Response(
          JSON.stringify({
            kind: 'message',
            text: 'Keep the next session repeatable.',
            factsUsed: ['current cycle week'],
          }),
          { status: 200 },
        );
      },
    });

    await gateway.generateMessage(context, 'freeform', '  How should I approach today?  ');

    expect(JSON.parse(requestBody).prompt).toBe('How should I approach today?');
    expect(JSON.parse(requestBody).context.structuredFacts).toEqual({
      workoutTitle: 'Strength A',
      currentWeek: 2,
    });
  });

  it('routes a safety-sensitive question before making a provider request', async () => {
    let requestMade = false;
    const gateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'test-token',
      fetcher: async () => {
        requestMade = true;
        return new Response('{}', { status: 200 });
      },
    });

    await expect(
      gateway.generateMessage(context, 'freeform', 'I have chest pain'),
    ).resolves.toMatchObject({
      kind: 'safety-route',
      factsUsed: ['deterministic safety classifier'],
    });
    expect(requestMade).toBe(false);
  });

  it('reroutes unsafe provider text through the deterministic safety classifier', async () => {
    const gateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'test-token',
      fetcher: async () =>
        new Response(
          JSON.stringify({
            kind: 'message',
            text: 'Change your medication dose before training.',
            factsUsed: [],
          }),
          { status: 200 },
        ),
    });

    await expect(gateway.generateMessage(context, 'freeform')).resolves.toMatchObject({
      kind: 'safety-route',
      factsUsed: ['deterministic safety classifier'],
    });
  });

  it('accepts only validated pending proposals', async () => {
    const gateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'test-token',
      fetcher: async () => new Response(JSON.stringify(proposalResponse), { status: 200 }),
    });

    await expect(gateway.generateProposal(context, 'weekly-review')).resolves.toMatchObject({
      id: 'proposal-1',
      status: 'pending',
      changes: [{ requiresUserConfirmation: true }],
    });
  });

  it('fails closed on malformed proposal responses and unavailable proposals', async () => {
    const invalidGateway = new HttpCoachGateway({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'test-token',
      fetcher: async () =>
        new Response(JSON.stringify({ ...proposalResponse, changes: [] }), { status: 200 }),
    });
    await expect(invalidGateway.generateProposal(context, 'weekly-review')).rejects.toBeInstanceOf(
      CoachGatewayProtocolError,
    );

    const unavailable = new UnavailableCoachGateway();
    await expect(unavailable.generateProposal(context, 'weekly-review')).rejects.toBeInstanceOf(
      CoachGatewayUnavailableError,
    );
  });
});
