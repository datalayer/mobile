/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Protocol, ProtocolActivityRow } from '../../api/protocolActivity';
import { protocolActivityDetail } from '../../api/protocolActivity';
import { EmptyState, Text } from '../../components/primitives';
import { Row, SectionTitle } from '../../components/states';
import { absoluteTime, relativeTime } from '../../i18n/time';
import { MIN_TOUCH, SPACE, useNativeTheme } from '../../theme/tokens';

type Choice<T extends string> = { value: T; label: string };

function Choices<T extends string>({ label, choices, value, onChange }: {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, radius } = useNativeTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choices}>
      {choices.map(choice => {
        const selected = value === choice.value;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(choice.value)}
            style={({ pressed }) => [
              styles.choice,
              {
                borderColor: selected ? colors.accentEmphasis : colors.border,
                backgroundColor: selected ? colors.accentMuted : colors.surface,
                borderRadius: Math.min(radius.control, 12),
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <Text size="small" weight={selected ? 'semibold' : 'regular'}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Safe, native protocol ledger rows with protocol and exact-counterpart filters. */
export function ProtocolActivity({ rows, appUid, nameOf }: {
  rows: ProtocolActivityRow[];
  appUid?: string;
  nameOf?: (appUid: string) => string;
}) {
  const scoped = useMemo(() => rows.filter(row => !appUid || row.appUid === appUid), [rows, appUid]);
  const [protocol, setProtocol] = useState<'all' | Protocol>('all');
  const [counterpart, setCounterpart] = useState('all');
  const counterparts = useMemo(() => [...new Set(scoped.map(row => row.counterpart))].sort(), [scoped]);
  const shown = scoped.filter(row => (protocol === 'all' || row.protocol === protocol) && (counterpart === 'all' || row.counterpart === counterpart));
  const protocolChoices: Choice<'all' | Protocol>[] = [
    { value: 'all', label: 'All' },
    ...(['pap', 'pact', 'ucp', 'acp'] as const)
      .filter(item => scoped.some(row => row.protocol === item))
      .map(item => ({ value: item, label: item.toUpperCase() }))
  ];

  return (
    <View style={styles.section}>
      <SectionTitle>Protocol activity</SectionTitle>
      <Text tone="muted" size="small">Consent, changes, test purchases, signed requests and receipts. Sensitive request content is never shown.</Text>
      <Choices label="Protocol" choices={protocolChoices} value={protocol} onChange={setProtocol} />
      {counterparts.length > 1 ? (
        <Choices
          label="Counterpart"
          choices={[{ value: 'all', label: 'Every counterpart' }, ...counterparts.map(value => ({ value, label: value }))]}
          value={counterpart}
          onChange={setCounterpart}
        />
      ) : null}
      {shown.length === 0 ? <EmptyState title="No protocol activity" detail="Nothing matches these filters." /> : null}
      {shown.map(row => (
        <Row
          key={row.uid}
          title={`${nameOf ? `${nameOf(row.appUid)}: ` : ''}${row.title}`}
          detail={protocolActivityDetail(row)}
          meta={`${row.protocol.toUpperCase()} · ${row.outcome} · ${absoluteTime(row.at)} (${relativeTime(row.at)})`}
          badge={row.kind === 'receipt' ? 'Receipt' : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACE.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  choice: { minHeight: MIN_TOUCH, justifyContent: 'center', borderWidth: 1, paddingHorizontal: SPACE.sm }
});
