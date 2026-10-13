import journeyPoster from '../../assets/higgsfield/runtime/journey-v01.jpg';
import journeyMotion from '../../assets/higgsfield/runtime/journey-v01.mp4';
import returnPoster from '../../assets/higgsfield/runtime/return-v01.jpg';
import savedPoster from '../../assets/higgsfield/runtime/session-saved-v01.jpg';
import savedMotion from '../../assets/higgsfield/runtime/session-saved-v01.mp4';

/** Bundled local media: no remote asset request, user data or network dependency. */
export const shiftArtwork = {
  journey: { poster: journeyPoster, motionSource: journeyMotion },
  return: { poster: returnPoster },
  sessionSaved: { poster: savedPoster, motionSource: savedMotion },
} as const;
