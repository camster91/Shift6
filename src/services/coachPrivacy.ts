import type { CoachProposal } from '../domain/types';
import type { CoachContext, CoachGateway, CoachMessageResult, CoachTask } from './contracts';
import { CoachGatewayUnavailableError } from './coach';
import { buildLocalCoachMessage } from './localCoach';

export interface PrivacyAwareCoachMessage {
  source: 'local' | 'remote';
  result: CoachMessageResult;
}

export interface GeneratePrivacyAwareCoachMessageInput {
  providerCoachEnabled: boolean;
  gateway: CoachGateway;
  context: CoachContext;
  task: CoachTask;
  prompt?: string;
}

export interface GeneratePrivacyAwareCoachProposalInput {
  providerCoachEnabled: boolean;
  gateway: CoachGateway;
  context: CoachContext;
  task: CoachTask;
}

/**
 * The local deterministic Coach is the default. A provider gateway is called
 * only after the user has explicitly enabled provider-backed Coach processing.
 */
export async function generatePrivacyAwareCoachMessage({
  providerCoachEnabled,
  gateway,
  context,
  task,
  prompt = '',
}: GeneratePrivacyAwareCoachMessageInput): Promise<PrivacyAwareCoachMessage> {
  if (!providerCoachEnabled) {
    return {
      source: 'local',
      result: buildLocalCoachMessage(context, task, prompt),
    };
  }

  try {
    const result = await gateway.generateMessage(context, task, prompt);
    if (result.kind !== 'unavailable') {
      return {
        source: result.kind === 'safety-route' ? 'local' : 'remote',
        result,
      };
    }
  } catch {
    // Provider failure falls back to the local explainer without changing plan state.
  }

  return {
    source: 'local',
    result: buildLocalCoachMessage(context, task, prompt),
  };
}

/**
 * Plan proposals have no local fallback because the local Coach cannot mutate
 * or invent plan changes. Remote proposal generation is therefore impossible
 * until provider-backed Coach processing has been explicitly enabled.
 */
export async function generatePrivacyAwareCoachProposal({
  providerCoachEnabled,
  gateway,
  context,
  task,
}: GeneratePrivacyAwareCoachProposalInput): Promise<CoachProposal> {
  if (!providerCoachEnabled) {
    throw new CoachGatewayUnavailableError(
      'Enable provider-backed Coach processing before requesting a plan proposal.',
    );
  }

  return gateway.generateProposal(context, task);
}
