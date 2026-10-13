import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { colors, radii, spacing } from '../../design/tokens';
import { useReducedMotion } from '../../design/useReducedMotion';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

interface ShiftArtworkProps {
  poster: ImageSourcePropType;
  motionSource?: number;
}

/** Decorative art only: all training facts and actions remain outside the media. */
export function ShiftArtwork({ poster, motionSource }: ShiftArtworkProps) {
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [requested, setRequested] = useState(false);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reducedMotion || !focused || !active) setRequested(false);
  }, [reducedMotion, focused, active]);

  const stop = useCallback(() => setRequested(false), []);
  const handleError = useCallback(() => {
    setRequested(false);
    setFailed(true);
  }, []);
  const playing = Boolean(motionSource && requested && !reducedMotion && focused && active);

  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <Image
          source={poster}
          resizeMode="contain"
          style={styles.media}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {playing && motionSource ? (
          <ArtworkMotion
            source={motionSource}
            poster={poster}
            onStop={stop}
            onError={handleError}
          />
        ) : null}
      </View>
      {motionSource && !reducedMotion && focused && active && !failed ? (
        <Button
          label={playing ? 'Stop animation' : 'Play animation'}
          accessibilityHint={
            playing ? 'Shows the still artwork.' : 'Plays a short, silent animation.'
          }
          variant="ghost"
          onPress={() => setRequested((current) => !current)}
          style={styles.control}
        />
      ) : null}
      {failed ? (
        <Text variant="caption" tone="muted">
          Still artwork is available.
        </Text>
      ) : null}
    </View>
  );
}

function ArtworkMotion({
  source,
  poster,
  onStop,
  onError,
}: {
  source: number;
  poster: ImageSourcePropType;
  onStop: () => void;
  onError: () => void;
}) {
  const [ready, setReady] = useState(false);
  const player = useVideoPlayer(source, (instance) => {
    instance.muted = true;
    instance.loop = false;
    instance.audioMixingMode = 'mixWithOthers';
    instance.staysActiveInBackground = false;
    instance.showNowPlayingNotification = false;
  });

  useEffect(() => {
    const ended = player.addListener('playToEnd', onStop);
    const status = player.addListener('statusChange', (event) => {
      if (event.status === 'error') onError();
    });
    try {
      if (player.status === 'error') onError();
      else player.play();
    } catch {
      onError();
    }
    return () => {
      ended.remove();
      status.remove();
      // The hook releases its player on unmount; it may already be disposed.
      try {
        player.pause();
      } catch {
        /* Already released. */
      }
    };
  }, [player, onStop, onError]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <VideoView
        player={player}
        style={styles.media}
        nativeControls={false}
        contentFit="contain"
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: false }}
        onFirstFrameRender={() => setReady(true)}
        playsInline
      />
      {!ready ? <Image source={poster} resizeMode="contain" style={styles.media} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  media: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  container: { marginVertical: spacing.md },
  frame: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.canvas,
  },
  control: { alignSelf: 'center' },
});
