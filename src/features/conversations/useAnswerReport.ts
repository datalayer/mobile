/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Report a complete answer to Datalayer support from its conversation: the
 * reason first, then whether the answer's words go too — never sent without
 * that choice. What happened is said in an alert.
 */

import type { MessageItem } from '@datalayer/agent-runtimes/lib/portable';
import * as Application from 'expo-application';
import { Alert, Platform } from 'react-native';
import { REPORT_REASONS, REPORT_WORDS, type ReportContext, type ReportReason } from '../../api/report';
import { useReportAnswer } from '../queries';

export function useAnswerReport(context: ReportContext): (item: MessageItem) => void {
  const reporting = useReportAnswer();
  return (item: MessageItem) => {
    const send = (reason: ReportReason, includeWords: boolean) =>
      reporting.mutate(
        {
          context,
          answer: { id: item.id, text: item.text },
          reason,
          includeWords,
          device: { platform: Platform.OS, version: Application.nativeApplicationVersion ?? '' }
        },
        {
          onSuccess: () => Alert.alert(REPORT_WORDS.sent, REPORT_WORDS.sentDetail),
          onError: error => Alert.alert(REPORT_WORDS.failed, error.message)
        }
      );
    Alert.alert(REPORT_WORDS.why, REPORT_WORDS.whyDetail, [
      { text: 'Cancel', style: 'cancel' },
      ...REPORT_REASONS.map(reason => ({
        text: reason.label,
        onPress: () =>
          Alert.alert(REPORT_WORDS.words, REPORT_WORDS.wordsDetail, [
            { text: 'Cancel', style: 'cancel' },
            { text: REPORT_WORDS.withoutWords, onPress: () => send(reason.key, false) },
            { text: REPORT_WORDS.withWords, onPress: () => send(reason.key, true) }
          ])
      }))
    ]);
  };
}
