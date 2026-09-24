import type { ISODateString } from './types';

export type ExerciseMediaSourceKind = 'original' | 'licensed' | 'generated' | 'user-provided';

export interface ExerciseMediaProvenance {
  sourceKind: ExerciseMediaSourceKind;
  sourceLabel: string;
  sourceUri?: string;
  creator?: string;
  license?: string;
  rightsConfirmedAt?: ISODateString;
  techniqueReviewedAt?: ISODateString;
}

declare module './types' {
  interface ExerciseMedia {
    /**
     * Optional while media is a draft. Required by the publication gate before
     * any media item can claim `approved` status.
     */
    provenance?: ExerciseMediaProvenance;
  }
}
