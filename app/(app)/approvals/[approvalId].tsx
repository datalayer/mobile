/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import type { Decision } from '../../../src/api/approvals';
import { DecisionSheet } from '../../../src/components/DecisionSheet';
import { Button } from '../../../src/components/native';
import { Screen, Text } from '../../../src/components/primitives';
import { problemOf } from '@datalayer/core/lib/portable';
import { Field, ProblemView, QueryView, SectionTitle } from '../../../src/components/states';
import { DECISION_WORDS, outcomeOf, outcomeSays, statusSays } from '../../../src/features/approvals/decision';
import {
  actionOf,
  APPROVAL_WORDS,
  applicationOf,
  argumentsShown,
  messageOfApproval,
  whyAsked
} from '../../../src/features/approvals/format';
import { useApproval, useDecide, useMarkRead } from '../../../src/features/queries';
import { absoluteTime, relativeTime } from '../../../src/i18n/time';
import { ProtocolApprovalDetails } from '../../../src/protocols/ProtocolApprovalDetails';
import { isKnownProtocolApproval, protocolApprovalOf } from '../../../src/protocols/approvals';
import { SPACE, useNativeTheme } from '../../../src/theme/tokens';

/** Fetched on every open, marked read on the server; decided through the audited routes. */
export default function ApprovalDetail() {
  const { approvalId = '' } = useLocalSearchParams<{ approvalId: string }>();
  const { colors, radius } = useNativeTheme();
  const approval = useApproval(approvalId);
  const { mutate: markRead } = useMarkRead();
  const deciding = useDecide(approvalId);
  const [confirming, setConfirming] = useState<Decision | null>(null);
  const unread = approval.data ? !approval.data.read : false;

  useEffect(() => {
    if (unread) {
      markRead(approvalId);
    }
  }, [unread, approvalId, markRead]);

  const status = approval.data?.status;
  useEffect(() => {
    if (status && status !== 'pending') {
      AccessibilityInfo.announceForAccessibility(statusSays(status));
    }
  }, [status]);

  const outcome = deciding.isError ? outcomeOf(problemOf(deciding.error)) : null;

  return (
    <Screen refreshing={approval.isRefetching} onRefresh={() => void approval.refetch()}>
      <QueryView query={approval}>
        {item => {
          const message = messageOfApproval(item);
          const protocolProposal = protocolApprovalOf(item);
          const box = { borderColor: colors.border, backgroundColor: colors.inset, borderRadius: Math.min(radius.card, 16) };
          const action =
            protocolProposal?.kind === 'pap-operation'
              ? `Operation at ${protocolProposal.company}`
              : protocolProposal?.kind === 'protocol-purchase'
                ? `Purchase from ${protocolProposal.merchant}`
                : actionOf(item.toolName);
          const pending = item.status === 'pending' && outcome !== 'gone';
          return (
            <>
              <Stack.Screen options={{ title: action }} />
              <Text accessibilityRole="header" size="heading" weight="semibold">
                {statusSays(item.status)}
              </Text>
              {outcome ? (
                <Text accessibilityLiveRegion="assertive" tone={outcome === 'retry' ? 'danger' : 'muted'}>
                  {outcomeSays(outcome)}
                </Text>
              ) : null}
              {outcome === 'retry' ? <ProblemView error={deciding.error} /> : null}
              <Field label="Application" value={applicationOf(item)} />
              <Field label={APPROVAL_WORDS.why} value={whyAsked(item)} />
              <Field label="Asked" value={`${absoluteTime(item.createdAt)} (${relativeTime(item.createdAt)})`} />
              {protocolProposal ? <ProtocolApprovalDetails proposal={protocolProposal} /> : null}
              {!protocolProposal ? <SectionTitle>{APPROVAL_WORDS.arguments}</SectionTitle> : null}
              {!protocolProposal && isKnownProtocolApproval(item) ? (
                <Text tone="danger">The typed protocol proposal could not be verified. Review every raw argument before deciding.</Text>
              ) : null}
              {!protocolProposal && message ? (
                <>
                  <Field label={APPROVAL_WORDS.to} value={message.to} />
                  <Field label={APPROVAL_WORDS.cc} value={message.cc} />
                  <Field label={APPROVAL_WORDS.bcc} value={message.bcc} />
                  <Field label={APPROVAL_WORDS.subject} value={message.subject} />
                  {message.forwards ? <Text tone="muted">{APPROVAL_WORDS.forwards}</Text> : null}
                  {message.replies ? <Text tone="muted">{APPROVAL_WORDS.replies}</Text> : null}
                  <Text selectable style={[styles.body, box]}>
                    {message.body}
                  </Text>
                </>
              ) : !protocolProposal ? (
                <Text selectable size="small" style={[styles.raw, box]}>
                  {argumentsShown(item)}
                </Text>
              ) : null}
              {pending ? (
                <View style={styles.controls}>
                  <Button label={DECISION_WORDS.approve} busy={deciding.isPending} onPress={() => setConfirming('approve')} testID="approve" />
                  <Button
                    label={DECISION_WORDS.reject}
                    tone="secondary"
                    disabled={deciding.isPending}
                    onPress={() => setConfirming('reject')}
                    testID="reject"
                  />
                </View>
              ) : null}
              <DecisionSheet
                decision={confirming}
                action={action}
                busy={deciding.isPending}
                onDismiss={() => setConfirming(null)}
                onConfirm={(decision, note) =>
                  deciding.mutate({ decision, note, shown: item }, { onSettled: () => setConfirming(null) })
                }
              />
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { borderWidth: 1, padding: 12 },
  raw: { fontFamily: 'monospace', borderWidth: 1, padding: 12 },
  controls: { gap: SPACE.sm, marginTop: SPACE.md }
});
