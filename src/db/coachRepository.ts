import type { SQLiteDatabase } from 'expo-sqlite';

import { applyCoachProposalToProgramVersion } from '../domain/coachProposal';
import { createProgramVersionRevision } from '../domain/programBuilder';
import type { CoachProposal, CoachProposalStatus } from '../domain/types';
import type { Program, ProgramVersion, TrainingCycle } from '../domain/types';
import { isValidCoachProposal, validateCoachProposal } from '../services/coachSafety';
import { saveTrainingCycleInTransaction } from './cycleRepository';
import { saveProgramVersionInTransaction } from './programRepository';

interface CoachProposalRow {
  id: string;
  user_id: string;
  cycle_id: string;
  summary: string;
  confidence: CoachProposal['confidence'];
  evidence_json: string;
  changes_json: string;
  safety_notes_json: string;
  status: CoachProposalStatus;
  created_at: string;
  updated_at: string;
}

export type CoachProposalDecision = Extract<CoachProposalStatus, 'accepted' | 'rejected'>;

export interface AcceptedCoachProposalResult {
  status: 'updated' | 'unchanged';
  program: Program;
  version: ProgramVersion;
  cycle: TrainingCycle;
}

export async function saveCoachProposal(
  database: SQLiteDatabase,
  userId: string,
  cycleId: string,
  proposal: CoachProposal,
): Promise<void> {
  const validationErrors = validateCoachProposal(proposal);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid coach proposal: ${validationErrors.join(' ')}`);
  }

  await database.runAsync(
    `INSERT OR IGNORE INTO coach_proposals
      (id, user_id, cycle_id, summary, confidence, evidence_json, changes_json,
       safety_notes_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    proposal.id,
    userId,
    cycleId,
    proposal.summary,
    proposal.confidence,
    JSON.stringify(proposal.evidence),
    JSON.stringify(proposal.changes),
    JSON.stringify(proposal.safetyNotes),
    proposal.status,
    proposal.createdAt,
    proposal.createdAt,
  );
}

export async function getPendingCoachProposals(
  database: SQLiteDatabase,
  userId: string,
  cycleId: string,
): Promise<CoachProposal[]> {
  const rows = await database.getAllAsync<CoachProposalRow>(
    `SELECT id, user_id, cycle_id, summary, confidence, evidence_json, changes_json,
            safety_notes_json, status, created_at, updated_at
       FROM coach_proposals
      WHERE user_id = ? AND cycle_id = ? AND status = 'pending'
      ORDER BY created_at DESC, id DESC;`,
    userId,
    cycleId,
  );

  return rows.map(mapCoachProposal);
}

export async function updateCoachProposalStatus(
  database: SQLiteDatabase,
  proposalId: string,
  status: CoachProposalDecision,
  updatedAt: string,
): Promise<'updated' | 'unchanged'> {
  let result: 'updated' | 'unchanged' = 'unchanged';

  await database.withTransactionAsync(async () => {
    const update = await database.runAsync(
      `UPDATE coach_proposals
          SET status = ?, updated_at = ?
        WHERE id = ? AND status = 'pending';`,
      status,
      updatedAt,
      proposalId,
    );
    if (update.changes === 0) return;

    const row = await database.getFirstAsync<CoachProposalRow>(
      `SELECT id, user_id, cycle_id, summary, confidence, evidence_json, changes_json,
              safety_notes_json, status, created_at, updated_at
         FROM coach_proposals
        WHERE id = ?
        LIMIT 1;`,
      proposalId,
    );
    if (!row) return;

    await queueProposalSync(database, row);
    result = 'updated';
  });

  return result;
}

/**
 * Records approval and persists any supported private revision atomically.
 * The proposal must already be loaded from the user's active cycle.
 */
export async function acceptCoachProposalWithRevision(
  database: SQLiteDatabase,
  userId: string,
  proposal: CoachProposal,
  program: Program,
  sourceVersion: ProgramVersion,
  sourceCycle: TrainingCycle,
  updatedAt: string,
): Promise<AcceptedCoachProposalResult> {
  if (proposal.status !== 'pending') {
    throw new Error('Only a pending coach proposal can be approved.');
  }
  if (sourceCycle.userId !== userId || sourceCycle.programVersionId !== sourceVersion.id) {
    throw new Error('The coach proposal context is no longer the active local plan.');
  }

  const changedVersion = applyCoachProposalToProgramVersion(sourceVersion, proposal);
  const nextVersion =
    proposal.changes.length === 0
      ? sourceVersion
      : createProgramVersionRevision(
          changedVersion,
          `${sourceVersion.id}-coach-${Date.now()}`,
          updatedAt,
        );
  const nextProgram =
    nextVersion.id === sourceVersion.id
      ? program
      : { ...program, currentVersionId: nextVersion.id };
  const nextCycle =
    nextVersion.id === sourceVersion.id
      ? sourceCycle
      : { ...sourceCycle, programVersionId: nextVersion.id };

  let status: AcceptedCoachProposalResult['status'] = 'unchanged';
  await database.withTransactionAsync(async () => {
    const update = await database.runAsync(
      `UPDATE coach_proposals
          SET status = 'accepted', updated_at = ?
        WHERE id = ? AND user_id = ? AND cycle_id = ? AND status = 'pending';`,
      updatedAt,
      proposal.id,
      userId,
      sourceCycle.id,
    );
    if (update.changes === 0) return;

    const row = await database.getFirstAsync<CoachProposalRow>(
      `SELECT id, user_id, cycle_id, summary, confidence, evidence_json, changes_json,
              safety_notes_json, status, created_at, updated_at
         FROM coach_proposals
        WHERE id = ?
        LIMIT 1;`,
      proposal.id,
    );
    if (!row) throw new Error('The approved coach proposal was not available locally.');

    if (proposal.changes.length > 0) {
      await saveProgramVersionInTransaction(database, userId, nextProgram, nextVersion);
      await saveTrainingCycleInTransaction(database, nextCycle);
    }
    await queueProposalSync(database, row);
    status = 'updated';
  });

  return { status, program: nextProgram, version: nextVersion, cycle: nextCycle };
}

function mapCoachProposal(row: CoachProposalRow): CoachProposal {
  const proposal: CoachProposal = {
    id: row.id,
    summary: row.summary,
    confidence: row.confidence,
    evidence: JSON.parse(row.evidence_json) as CoachProposal['evidence'],
    changes: JSON.parse(row.changes_json) as CoachProposal['changes'],
    safetyNotes: JSON.parse(row.safety_notes_json) as CoachProposal['safetyNotes'],
    status: row.status,
    createdAt: row.created_at,
  };

  if (!isValidCoachProposal({ ...proposal, status: 'pending' })) {
    throw new Error(`Stored coach proposal ${row.id} failed validation.`);
  }

  return proposal;
}

async function queueProposalSync(database: SQLiteDatabase, row: CoachProposalRow): Promise<void> {
  await database.runAsync(
    `INSERT INTO sync_outbox
      (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       created_at = excluded.created_at,
       last_error = NULL;`,
    `outbox-coach-proposal-${row.id}`,
    `coach-proposal:${row.id}`,
    'coach-proposal',
    row.id,
    JSON.stringify({
      userId: row.user_id,
      cycleId: row.cycle_id,
      proposal: mapCoachProposal(row),
    }),
    row.updated_at,
  );
}
