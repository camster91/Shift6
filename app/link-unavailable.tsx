import { useRouter } from 'expo-router';

import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';
import { Text } from '../src/components/ui/Text';
import { spacing } from '../src/design/tokens';

export default function LinkUnavailableScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Text variant="h1" accessibilityRole="header">
        Link unavailable
      </Text>
      <Text tone="muted" style={{ marginVertical: spacing.lg }}>
        This link could not be opened. You can continue from Home or try the link again.
      </Text>
      <Button label="Go to Home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
