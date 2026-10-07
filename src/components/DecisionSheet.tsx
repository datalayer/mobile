/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The confirmation sheet of a decision: names the action, takes an optional note, sends once. */

import { BottomSheet, Button as NativeButton, Column, Text as NativeText, TextInput } from '@expo/ui';
import { useState } from 'react';
import type { Decision } from '../api/approvals';
import { confirmTitle, DECISION_WORDS } from '../features/approvals/decision';
import { useTheme } from '../theme/ThemeProvider';

export function DecisionSheet({
  decision,
  action,
  busy,
  onConfirm,
  onDismiss
}: {
  /** Which decision is being confirmed; `null` keeps the sheet closed. */
  decision: Decision | null;
  action: string;
  busy: boolean;
  onConfirm: (decision: Decision, note: string) => void;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const [note, setNote] = useState('');
  const open = decision !== null;
  const dismiss = () => {
    if (!busy) {
      setNote('');
      onDismiss();
    }
  };
  return (
    <BottomSheet isPresented={open} onDismiss={dismiss} containerColor={theme.colors.surface} contentPadding={{ bottom: 24 }}>
      <Column spacing={16}>
        <NativeText textStyle={{ fontSize: 20, fontWeight: '600', color: theme.colors.text }}>
          {decision ? confirmTitle(decision, action) : ''}
        </NativeText>
        <TextInput
          placeholder={DECISION_WORDS.note}
          defaultValue={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          editable={!busy}
          testID="decision-note"
        />
        <NativeButton
          label={busy ? DECISION_WORDS.sending : decision === 'reject' ? DECISION_WORDS.reject : DECISION_WORDS.approve}
          variant="filled"
          disabled={busy || !decision}
          onPress={() => decision && onConfirm(decision, note)}
          testID="decision-confirm"
        />
        <NativeButton label={DECISION_WORDS.cancel} variant="text" disabled={busy} onPress={dismiss} testID="decision-cancel" />
      </Column>
    </BottomSheet>
  );
}
