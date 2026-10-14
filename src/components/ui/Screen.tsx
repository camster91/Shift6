import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../design/tokens';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>;
  scrollViewRef?: Ref<ScrollView>;
  footer?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  scrollViewProps,
  scrollViewRef,
  footer,
}: ScreenProps) {
  const content = <View style={[styles.content, contentContainerStyle]}>{children}</View>;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {scroll ? (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollViewport}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...scrollViewProps}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.staticContainer}>{content}</View>
      )}
      {footer ? (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.footerContent}>{footer}</View>
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 128,
  },
  scrollViewport: { flex: 1 },
  footer: {
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  staticContainer: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
