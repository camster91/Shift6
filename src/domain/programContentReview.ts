import type { ISODateString } from './types';

export interface ProgramContentReviewEvidence {
  programId: string;
  reviewedAt: ISODateString;
  reviewReference: string;
}

/**
 * Release evidence only. Keep this empty until a real fitness-content review
 * has been completed and linked to an auditable review record.
 */
export const programContentReviewEvidence: readonly ProgramContentReviewEvidence[] = [];
