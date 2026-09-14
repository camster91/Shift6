import {
  MAX_COACH_PROMPT_LENGTH,
  type CoachContext,
  type CoachGateway,
  type CoachMessageResult,
  type CoachTask,
} from './contracts';
import { classifyCoachSafety, validateCoachProposal } from './coachSafety';
import type { CoachProposal, CoachProposalChange } from '../domain/types';

const coachFactKeys = new Set([
  'workoutTitle',
  'workoutFocus',
  'estimatedDurationMinutes',
  'currentWeek',
  'completedWorkoutCount',
  'plannedWorkoutCount',
  'completionRate',
  'cardioMinutes',
  'personalRecordCount',
  'readiness',
]);

const coachChangeTypes = new Set<CoachProposalChange['type']>([
  'target-change',
  'exercise-substitution',
  'set-count-change',
  'schedule-change',
  'program-change',
]);

const coachMessageKinds = new Set<CoachMessageResult['kind']>([
  'message',
  'safety-route',
  'unavailable',
]);

export class CoachGatewayUnavailableError extends Error {
  readonly code = 'coach-gateway-unavailable';

  constructor(message = 'Provider-backed Coach is not available.', cause?: unknown) {
    super(message, { cause });
    this.name = 'CoachGatewayUnavailableError';
  }
}

export class CoachGatewayProtocolError extends Error {
  readonly code = 'coach-gateway-protocol-error';

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'CoachGatewayProtocolError';
  }
}

/** Explicit local-only adapter used until a backend and provider are configured. */
export class UnavailableCoachGateway implements CoachGateway {
  async generateMessage(
    _context: CoachContext,
    _task: CoachTask,
    _prompt?: string,
  ): Promise<CoachMessageResult> {
    return {
      kind: 'unavailable',
      text: 'Provider-backed Coach is not configured. SHIFT6 can still explain the local record.',
      factsUsed: [],
    };
  }

  async generateProposal(_context: CoachContext, _task: CoachTask): Promise<CoachProposal> {
    throw new CoachGatewayUnavailableError(
      'Provider-backed Coach proposals are not configured. No plan change was created.',
    );
  }
}

export interface HttpCoachGatewayOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}

/**
 * Vendor-neutral transport for server-side Coach generation. The mobile
 * client sends only a bounded context packet and accepts proposals only after
 * strict protocol and safety validation.
 */
export class HttpCoachGateway implements CoachGateway {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly fetcher: typeof fetch;

  constructor({ baseUrl, getAccessToken, fetcher = fetch }: HttpCoachGatewayOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.getAccessToken = getAccessToken;
    this.fetcher = fetcher;
  }

  async generateMessage(
    context: CoachContext,
    task: CoachTask,
    prompt?: string,
  ): Promise<CoachMessageResult> {
    const rawPrompt = prompt?.trim() ?? '';
    const safety = classifyCoachSafety(rawPrompt);
    if (safety.route !== 'standard') {
      return {
        kind: 'safety-route',
        text: safety.response,
        factsUsed: ['deterministic safety classifier'],
      };
    }
    const normalizedPrompt = normalizeCoachPrompt(rawPrompt);

    const value = await this.post('/v1/coach/message', {
      task,
      ...(normalizedPrompt ? { prompt: normalizedPrompt } : {}),
      context: minimizeCoachContext(context),
    });
    return parseCoachMessageResult(value);
  }

  async generateProposal(context: CoachContext, task: CoachTask): Promise<CoachProposal> {
    const value = await this.post('/v1/coach/proposal', {
      task,
      context: minimizeCoachContext(context),
    });
    return parseCoachProposal(value);
  }

  private async post(pathname: string, body: Record<string, unknown>): Promise<unknown> {
    if (!this.baseUrl) throw new CoachGatewayUnavailableError();

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new CoachGatewayUnavailableError('Sign in to enable provider-backed Coach guidance.');
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${pathname}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new CoachGatewayUnavailableError('The Coach service could not be reached.', error);
    }

    if (!response.ok) {
      throw new CoachGatewayUnavailableError(`The Coach service returned HTTP ${response.status}.`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new CoachGatewayProtocolError('The Coach service returned invalid JSON.', error);
    }
  }
}

export function normalizeCoachPrompt(prompt?: string): string | undefined {
  if (prompt === undefined) return undefined;
  const normalized = prompt.trim();
  if (!normalized) return undefined;
  if (normalized.length > MAX_COACH_PROMPT_LENGTH) {
    throw new CoachGatewayProtocolError(
      `The Coach question exceeds ${MAX_COACH_PROMPT_LENGTH} characters.`,
    );
  }
  return normalized;
}

/**
 * Keeps free text and unbounded provider fields outside the network contract.
 * The server may add richer facts later, but the mobile boundary must opt in
 * to each field explicitly.
 */
export function minimizeCoachContext(context: CoachContext): CoachContext {
  const structuredFacts = Object.fromEntries(
    Object.entries(context.structuredFacts)
      .filter(([key]) => coachFactKeys.has(key))
      .flatMap(([key, value]) => {
        const boundedValue = boundedFactValue(value);
        return boundedValue === undefined ? [] : [[key, boundedValue]];
      }),
  );

  return {
    user: {
      id: context.user.id,
      unitSystem: context.user.unitSystem,
      goals: [...context.user.goals],
      experience: context.user.experience,
    },
    cycle: { ...context.cycle },
    structuredFacts,
  };
}

export function parseCoachMessageResult(value: unknown): CoachMessageResult {
  if (!isRecord(value)) {
    throw new CoachGatewayProtocolError('The Coach message response was not an object.');
  }

  const kind = value.kind;
  if (typeof kind !== 'string' || !coachMessageKinds.has(kind as CoachMessageResult['kind'])) {
    throw new CoachGatewayProtocolError('The Coach message response used an unknown result kind.');
  }
  const text = readBoundedString(value.text, 'Coach response text', 2000);
  const factsUsed = readStringArray(value.factsUsed, 'Coach response facts', 8, 120);
  const safety = classifyCoachSafety(text);

  if (safety.route !== 'standard') {
    return {
      kind: 'safety-route',
      text: safety.response,
      factsUsed: ['deterministic safety classifier'],
    };
  }

  return { kind: kind as CoachMessageResult['kind'], text, factsUsed };
}

export function parseCoachProposal(value: unknown): CoachProposal {
  if (!isRecord(value)) {
    throw new CoachGatewayProtocolError('The Coach proposal response was not an object.');
  }

  const proposal: CoachProposal = {
    id: readBoundedString(value.id, 'Proposal ID', 120),
    summary: readBoundedString(value.summary, 'Proposal summary', 400),
    confidence: readEnum(value.confidence, ['low', 'medium', 'high'], 'Proposal confidence'),
    evidence: readStringArray(value.evidence, 'Proposal evidence', 8, 300, true),
    changes: readChanges(value.changes),
    safetyNotes: readStringArray(value.safetyNotes, 'Proposal safety notes', 8, 300),
    status: readEnum(value.status, ['pending'], 'Proposal status'),
    createdAt: readIsoDate(value.createdAt, 'Proposal createdAt'),
  };

  if (proposal.changes.length === 0) {
    throw new CoachGatewayProtocolError('A Coach proposal must contain at least one change.');
  }

  const validationErrors = validateCoachProposal(proposal);
  if (validationErrors.length > 0) {
    throw new CoachGatewayProtocolError(
      `The Coach proposal failed validation: ${validationErrors.join(' ')}`,
    );
  }
  return proposal;
}

function readChanges(value: unknown): CoachProposalChange[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new CoachGatewayProtocolError('Proposal changes must be an array of at most 12 items.');
  }

  return value.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new CoachGatewayProtocolError(`Proposal change ${index + 1} was not an object.`);
    }
    const type = candidate.type;
    if (typeof type !== 'string' || !coachChangeTypes.has(type as CoachProposalChange['type'])) {
      throw new CoachGatewayProtocolError(`Proposal change ${index + 1} used an unknown type.`);
    }

    const change: CoachProposalChange = {
      id: readBoundedString(candidate.id, `Proposal change ${index + 1} ID`, 120),
      type: type as CoachProposalChange['type'],
      field: readBoundedString(candidate.field, `Proposal change ${index + 1} field`, 80),
      from: readBoundedString(candidate.from, `Proposal change ${index + 1} current value`, 200),
      to: readBoundedString(candidate.to, `Proposal change ${index + 1} proposed value`, 200),
      requiresUserConfirmation: true,
    };

    if (candidate.requiresUserConfirmation !== true) {
      throw new CoachGatewayProtocolError(
        `Proposal change ${index + 1} must require explicit user confirmation.`,
      );
    }

    for (const key of ['exerciseId', 'workoutId', 'workoutExerciseId'] as const) {
      const optionalValue = candidate[key];
      if (optionalValue !== undefined) {
        if (typeof optionalValue !== 'string') {
          throw new CoachGatewayProtocolError(
            `Proposal change ${index + 1} ${key} must be a string when provided.`,
          );
        }
        change[key] = optionalValue.trim();
      }
    }
    return change;
  });
}

function readBoundedString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') throw new CoachGatewayProtocolError(`${label} must be a string.`);
  const normalized = value.trim();
  if (!normalized) throw new CoachGatewayProtocolError(`${label} cannot be empty.`);
  if (normalized.length > maxLength) {
    throw new CoachGatewayProtocolError(`${label} exceeds ${maxLength} characters.`);
  }
  return normalized;
}

function readStringArray(
  value: unknown,
  label: string,
  maxItems: number,
  maxItemLength: number,
  requireItem = false,
): string[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new CoachGatewayProtocolError(`${label} must contain at most ${maxItems} items.`);
  }
  if (requireItem && value.length === 0) {
    throw new CoachGatewayProtocolError(`${label} must contain at least one item.`);
  }
  return value.map((item, index) =>
    readBoundedString(item, `${label} ${index + 1}`, maxItemLength),
  );
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new CoachGatewayProtocolError(`${label} used an unsupported value.`);
  }
  return value as T;
}

function readIsoDate(value: unknown, label: string): string {
  const normalized = readBoundedString(value, label, 80);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new CoachGatewayProtocolError(`${label} must be an ISO date.`);
  }
  return new Date(normalized).toISOString();
}

function boundedFactValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 && normalized.length <= 240 ? normalized : undefined;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  return typeof value === 'boolean' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
