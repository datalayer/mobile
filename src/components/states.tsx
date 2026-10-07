/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Loading, problem and list building blocks every read-only screen uses (M-013). */

import type { UseQueryResult } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { isProblem, Problem } from '../api/problems';
import { MIN_TOUCH, SPACE, useNativeTheme } from '../theme/tokens';
import { Button, Text } from './primitives';

/** A thrown value as a Problem: anything unknown is *unexpected*. */
export const problemOf = (error: unknown): Problem =>
  isProblem(error) ? error : new Problem('unexpected', error instanceof Error ? error.message : String(error));

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { colors } = useNativeTheme();
  return (
    <View style={styles.center} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <ActivityIndicator color={colors.accentEmphasis} />
    </View>
  );
}

/** The person's words, a retry, and the diagnostic detail behind *Details*. */
export function ProblemView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const problem = problemOf(error);
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.problem} accessibilityRole="alert">
      <Text size="heading">{problem.message}</Text>
      {onRetry && problem.kind !== 'not-found' && problem.kind !== 'forbidden' ? (
        <Button label="Try again" onPress={onRetry} tone="secondary" />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(value => !value)}
        style={styles.details}
      >
        <Text tone="muted">{open ? 'Hide details' : 'Details'}</Text>
      </Pressable>
      {open ? (
        <Text selectable tone="muted" size="small" style={styles.mono}>
          {problem.status ? `${problem.status} · ` : ''}
          {problem.detail}
        </Text>
      ) : null}
    </View>
  );
}

/** Loading, problem, or the content of a query. */
export function QueryView<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) {
    return <Loading />;
  }
  if (query.isError) {
    return <ProblemView error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" tone="muted" size="small" weight="semibold" style={styles.section}>
      {children}
    </Text>
  );
}

export function Row({
  title,
  detail,
  meta,
  badge,
  leading,
  onPress,
  accessibilityHint
}: {
  title: string;
  detail?: string;
  meta?: string;
  badge?: string;
  /** Drawn before the text, outside its accessible label: a face. */
  leading?: ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
}) {
  const { colors, radius } = useNativeTheme();
  const label = [title, badge, detail, meta].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: Math.min(radius.card, 24),
          opacity: pressed ? 0.8 : 1
        }
      ]}
    >
      <View style={styles.rowHead}>
        {leading}
        <Text size="heading" weight="semibold" numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        {badge ? (
          <Text
            tone="accent"
            size="small"
            style={[styles.badge, { borderColor: colors.accent, borderRadius: Math.min(radius.control, 8) }]}
          >
            {badge}
          </Text>
        ) : null}
      </View>
      {detail ? <Text numberOfLines={2}>{detail}</Text> : null}
      {meta ? <Text tone="muted">{meta}</Text> : null}
    </Pressable>
  );
}

/** A labelled value on a detail screen. */
export function Field({ label, value }: { label: string; value: string }) {
  if (!value) {
    return null;
  }
  return (
    <View style={styles.field}>
      {label ? (
        <Text tone="muted" size="small">
          {label}
        </Text>
      ) : null}
      <Text selectable>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: SPACE.xl, alignItems: 'center' },
  problem: { gap: SPACE.sm, paddingVertical: SPACE.lg },
  details: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  mono: { fontFamily: 'monospace' },
  section: { textTransform: 'uppercase', marginTop: SPACE.sm },
  row: { minHeight: MIN_TOUCH, borderWidth: 1, padding: SPACE.md, gap: SPACE.xs },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  rowTitle: { flex: 1 },
  badge: { borderWidth: 1, paddingHorizontal: SPACE.xs },
  field: { gap: 2 }
});
