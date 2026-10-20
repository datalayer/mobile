/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** What the app draws itself: screens, text and empty places. Native controls are in `./native`. */

import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text as RNText, type TextProps, type TextStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE, useColors, useNativeTheme } from '../theme/tokens';

export { Button } from './native';

const SIZES = { body: 16, small: 13, title: 20, heading: 17 } as const;

/** Text in the theme's face and colours. `tone` picks the colour, `size` the step. */
export function Text({
  tone = 'default',
  size = 'body',
  weight = 'regular',
  style,
  ...rest
}: TextProps & {
  tone?: 'default' | 'muted' | 'danger' | 'accent' | 'onEmphasis';
  size?: keyof typeof SIZES;
  weight?: 'regular' | 'semibold';
}) {
  const theme = useNativeTheme();
  const color = {
    default: theme.colors.text,
    muted: theme.colors.muted,
    danger: theme.colors.danger,
    accent: theme.colors.accent,
    onEmphasis: theme.colors.onEmphasis
  }[tone];
  const typed: TextStyle = {
    color,
    fontSize: SIZES[size],
    lineHeight: Math.round(SIZES[size] * 1.4),
    fontWeight: weight === 'semibold' ? '600' : '400',
    fontFamily: theme.fontFamily ? `${theme.fontFamily}_${weight === 'semibold' ? '600SemiBold' : '400Regular'}` : undefined
  };
  // Never cap Dynamic Type: critical approval and permission text must remain
  // available at the person's largest accessibility setting.
  return <RNText allowFontScaling {...rest} style={[typed, style]} />;
}

export function Screen({
  children,
  refreshing,
  onRefresh,
  headerless = false
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** No navigation header above it: the screen keeps its content below the status bar itself. */
  headerless?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.screen, headerless ? { paddingTop: insets.top + SPACE.md } : null]}
      contentInsetAdjustmentBehavior={headerless ? 'never' : 'automatic'}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.accentEmphasis} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** An empty place, with the one next step it offers. */
export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.empty} accessible accessibilityRole="summary">
      <Text size="title" weight="semibold" style={styles.centered}>
        {title}
      </Text>
      {detail ? (
        <Text tone="muted" style={styles.centered}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: SPACE.md, gap: SPACE.md, flexGrow: 1 },
  empty: { paddingVertical: SPACE.xl, gap: SPACE.sm, alignItems: 'center' },
  centered: { textAlign: 'center' }
});
