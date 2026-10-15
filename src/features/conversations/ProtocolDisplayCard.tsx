/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A protocol display under its tool row (MOBILE M-037): the native renderer
 * of Agent Runtimes' `ProtocolDisplayProps`. What it says is the display's
 * own, read strictly by `protocolDisplayOf`; what the person does goes out
 * through the host — a sign-in page in the system browser after its address
 * is named, an operation answered in Approvals, *I have signed in* as their
 * next message. An unknown display shows its text and type, nothing of its data.
 */

import {
  ticketOfPage,
  DIRECT_WORDS,
  displayLine,
  PAP_SIGN_IN_WORDS,
  replyAuthor,
  type ProtocolDisplay,
  type ProtocolDisplayProps
} from '@datalayer/agent-runtimes/lib/portable';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '../../components/primitives';
import { SPACE, useNativeTheme } from '../../theme/tokens';
import { MediatedForm, type ProtectedInput } from './MediatedForm';
import { QrCode } from './QrCode';
import type { SignInWatch } from './signInWatch';

/** A term's value in words: a JSON value said as it is, never interpreted. */
const termWords = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

const DOES: Record<string, string> = {
  read: 'It reads',
  write: 'It changes something',
  send: 'It sends something',
  buy: 'It moves money',
  delete: 'It deletes something',
  publish: 'It shares something'
};

const STATUS: Record<string, string> = {
  working: 'The company is working on it.',
  idle: 'The company is waiting for you.',
  queued: 'Waiting for one of the company’s people.',
  closed: 'The conversation is closed.'
};

/** The contract's props, and how a sign-in shown is watched on this phone (M-039). */
export type NativeDisplayProps = ProtocolDisplayProps & {
  watch?: SignInWatch;
  /** A mediated sign-in typed here, with its one-use protected ticket (M-039). */
  typed?: ProtectedInput;
};

const WATCH_WORDS: Record<SignInWatch['state'], string> = {
  watching: 'Waiting for you to sign in: this conversation goes on by itself once you have.',
  signed_in: 'Signed in: the conversation goes on.',
  refused: '',
  expired: 'This sign-in has expired: ask again to start a new one.',
  unread: 'How the sign-in stands could not be read: it is asked again.'
};

function Body({ display, onOpenSignIn, onOpenApproval, onSignedIn, onOpenDirect, watch, typed }: NativeDisplayProps) {
  switch (display.kind) {
    case 'sign-in': {
      const at = display.company || display.host;
      return (
        <>
          <Text weight="semibold">
            {display.mode === 'mediated' ? PAP_SIGN_IN_WORDS.mediatedTitle(display.host) : PAP_SIGN_IN_WORDS.title(at)}
          </Text>
          <Text size="small">{PAP_SIGN_IN_WORDS[display.mode]}</Text>
          {display.code ? (
            <Text selectable weight="semibold" accessibilityLabel={`${PAP_SIGN_IN_WORDS.code}: ${display.code.split('').join(' ')}`}>
              {`${PAP_SIGN_IN_WORDS.code}: ${display.code}`}
            </Text>
          ) : null}
          {display.sentTo ? <Text size="small">{PAP_SIGN_IN_WORDS.sentTo(display.sentTo)}</Text> : null}
          {display.needs?.length ? <Text size="small">{PAP_SIGN_IN_WORDS.needs(display.needs)}</Text> : null}
          {display.expiresAt ? <Text size="small" tone="muted">{PAP_SIGN_IN_WORDS.until(display.expiresAt)}</Text> : null}
          {display.mode === 'device' ? <QrCode value={display.open} label={PAP_SIGN_IN_WORDS.qr(display.host)} /> : null}
          {watch ? (
            <Text size="small" tone={watch.state === 'refused' ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
              {watch.state === 'refused' ? watch.reason || 'The sign-in was refused: ask again.' : WATCH_WORDS[watch.state]}
            </Text>
          ) : null}
          {display.mode === 'mediated' && typed && ticketOfPage(display.open) ? (
            <MediatedForm ticket={ticketOfPage(display.open)} input={typed} />
          ) : (
            <Button label={PAP_SIGN_IN_WORDS.open(display.host)} onPress={() => onOpenSignIn(display.open)} testID="display-open-sign-in" />
          )}
          <Button label={PAP_SIGN_IN_WORDS.checkAgain} tone="secondary" onPress={() => onSignedIn(PAP_SIGN_IN_WORDS.checkMessage(at))} testID="display-signed-in" />
        </>
      );
    }
    case 'confirm':
      return (
        <>
          <Text weight="semibold">{`${display.company} asks you to confirm`}</Text>
          {/* The company's words, verbatim. */}
          <Text selectable>{display.summary}</Text>
          {Object.entries(display.terms).map(([name, value]) => (
            <Text key={name} size="small" selectable>{`${name}: ${termWords(value)}`}</Text>
          ))}
          <Text size="small" tone="muted">
            {[
              `Version ${display.revision}${display.was ? `, changed since version ${display.was.revision}` : ''}`,
              display.does ? DOES[display.does] : 'What it does is not said',
              display.onlyThePerson ? 'Only you can decide it' : ''
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Button label="Review and decide" onPress={() => onOpenApproval(display.approvalId)} testID="display-review" />
        </>
      );
    case 'replies':
      return (
        <>
          {display.replies.map((reply, index) => (
            <View key={index} accessible accessibilityLabel={`${replyAuthor(display.company, reply.sender)}: ${reply.text}`}>
              <Text size="small" tone="muted">{replyAuthor(display.company, reply.sender)}</Text>
              <Text selectable>{reply.text}</Text>
            </View>
          ))}
          {display.status ? <Text size="small" tone="muted">{STATUS[display.status]}</Text> : null}
          {display.responder === 'human' ? <Text size="small" tone="muted">One of its people is answering now.</Text> : null}
          {onOpenDirect && display.status !== 'closed' ? (
            <Button
              label={DIRECT_WORDS.write(display.company)}
              tone="secondary"
              onPress={() => onOpenDirect(display.company, display.conversation)}
              testID="display-open-direct"
            />
          ) : null}
        </>
      );
    case 'unknown':
      return (
        <>
          <Text size="small">{displayLine(display)}</Text>
          <Text size="small" tone="muted">{`Shown on the web: ${display.type}`}</Text>
        </>
      );
    default:
      return <Text size="small">{displayLine(display)}</Text>;
  }
}

export function ProtocolDisplayCard(props: NativeDisplayProps) {
  const { colors, radius } = useNativeTheme();
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={displayLine(props.display)}
      style={[styles.card, { borderColor: colors.border, borderRadius: Math.min(radius.card, 18), backgroundColor: colors.surface }]}
    >
      <Body {...props} />
    </View>
  );
}

/** Whether a display asks something of the person (drawn open), or only says something. */
export const asksThePerson = (display: ProtocolDisplay): boolean => display.kind === 'sign-in' || display.kind === 'confirm';

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: SPACE.sm, gap: SPACE.xs }
});
