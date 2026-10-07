/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH, SPACE, useColors } from '../theme/tokens';

export function Screen({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** An empty place, with the one next step it offers (LOOP §4). */
export function EmptyState({ title, detail }: { title: string; detail: string }) {
  const colors = useColors();
  return (
    <View style={styles.empty} accessible accessibilityRole="summary">
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  tone = 'primary'
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
}) {
  const colors = useColors();
  const primary = tone === 'primary';
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.accent : 'transparent',
          borderColor: primary ? colors.accent : colors.border,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1
        }
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.onAccent : colors.text} />
      ) : (
        <Text style={[styles.buttonLabel, { color: primary ? colors.onAccent : colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: SPACE.md, gap: SPACE.md, flexGrow: 1 },
  empty: { paddingVertical: SPACE.xl, gap: SPACE.sm, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  detail: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonLabel: { fontSize: 17, fontWeight: '600' }
});
