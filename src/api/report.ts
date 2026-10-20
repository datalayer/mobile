/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A person reports an answer an application or an agent generated, from the
 * conversation itself (Google Play's AI-generated content policy asks for
 * an in-app way to flag offensive generated content). The report goes to
 * Datalayer support through the support service, signed in as the person:
 * the reason, and the identifiers support needs to find the conversation.
 * The answer's words are sent only when the person chooses to include them.
 * Pure, but for the call.
 */

import type { Client } from './client';

export const SUPPORT_REQUEST_PATH = '/api/support/v1/support/request';

/** At most two reasons: an Android alert holds three buttons, Cancel included. */
export const REPORT_REASONS = [
  { key: 'offensive', label: 'Offensive or harmful' },
  { key: 'wrong', label: 'Wrong or misleading' }
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['key'];

/** Where the answer was given: an application's conversation, or a standalone agent's. */
export type ReportContext =
  | { kind: 'application'; name: string; appUid: string; deploymentUid: string; sessionUid: string | null }
  | { kind: 'agent'; name: string; runtimeName: string; agent: string };

export type ReportedAnswer = { id: string; text: string };

export type ReportDevice = { platform: string; version: string };

export const REPORT_WORDS = {
  link: 'Report',
  linkLabel: 'Report this answer',
  why: 'Report this answer?',
  whyDetail: 'Datalayer support reads every report. Say what is wrong with it.',
  words: 'Send the answer too?',
  wordsDetail:
    "Support gets where the answer was given and why you report it. Its words are sent only if you include them.",
  withoutWords: 'Without its words',
  withWords: 'Include its words',
  sent: 'Reported',
  sentDetail: 'Datalayer support will look at it. Thank you.',
  failed: 'Not reported'
} as const;

const label = (reason: ReportReason): string => REPORT_REASONS.find(item => item.key === reason)?.label ?? reason;

/** The support request: subject and message, with the answer's words only when `includeWords`. */
export function reportRequest(
  context: ReportContext,
  answer: ReportedAnswer,
  reason: ReportReason,
  includeWords: boolean,
  device: ReportDevice
): { subject: string; message: string; brand: string } {
  const where =
    context.kind === 'application'
      ? [
          `Application: ${context.name || '(unnamed)'} (${context.appUid})`,
          `Deployment: ${context.deploymentUid}`,
          `Conversation: ${context.sessionUid ?? '(not started)'}`
        ]
      : [`Agent: ${context.name || context.agent} (${context.agent})`, `Runtime: ${context.runtimeName}`];
  const lines = [
    'A generated answer was reported from the Datalayer mobile app.',
    '',
    `Reason: ${label(reason)}`,
    ...where,
    `Answer: ${answer.id}`,
    `App: ${device.platform} ${device.version || '?'}`,
    '',
    includeWords ? `The answer's words, sent by the person:\n\n${answer.text}` : "The answer's words were not sent: the person chose not to include them."
  ];
  return {
    subject: `Reported answer: ${label(reason)} — ${context.name || (context.kind === 'agent' ? context.agent : context.appUid)}`,
    message: lines.join('\n'),
    brand: 'datalayer'
  };
}

export async function reportAnswer(
  client: Client,
  context: ReportContext,
  answer: ReportedAnswer,
  reason: ReportReason,
  includeWords: boolean,
  device: ReportDevice
): Promise<void> {
  await client(SUPPORT_REQUEST_PATH, { method: 'POST', body: reportRequest(context, answer, reason, includeWords, device) });
}
