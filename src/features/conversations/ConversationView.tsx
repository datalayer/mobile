/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A conversation drawn natively (MOBILE M-030 to M-034): what Agent Runtimes'
 * conversation reducer holds — messages, tool calls and steps collapsed, how
 * a wordless turn ended, failures — with the question the application asks,
 * the composer, Stop, the application's presence line, and a screen-reader
 * announcement once an answer is complete (never each token).
 *
 * Each component is the native renderer of Agent Runtimes' `portable/views`
 * contract: its props, its words and labels, and when a person may type are
 * that contract's, shared with the web; only the markup and look are here.
 */

import {
  ANSWER_BELOW, ANSWER_COMPLETE, composerOf, droppedWords, formFieldsOf, messageLabel, OPENING_WORDS, presenceLine,
  presenceOfConversation, questionWords, showsQuestion, stepLine, toolLabel,
  type ConversationItem, type ConversationQuestion, type ErrorRowProps, type MessageRowProps, type PresenceLineProps,
  type QuestionCardProps, type StepRowProps, type ToolRowProps, type TurnEndRowProps
} from '@datalayer/agent-runtimes/lib/portable';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Text } from '../../components/primitives';
import { Switch } from '../../components/native';
import { MIN_TOUCH, SPACE, useNativeTheme } from '../../theme/tokens';
import { FILE_ON_THE_WEB, type ConversationController, type ConversationView as View_ } from './controller';
import { Markdown } from './Markdown';

export function ToolRow({ item, expanded: open, onToggle }: ToolRowProps) {
  const { colors, radius } = useNativeTheme();
  const label = toolLabel(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open, busy: item.status === 'running' }}
      onPress={onToggle}
      style={[styles.tool, { borderColor: colors.border, borderRadius: Math.min(radius.control, 12) }]}
    >
      <Text tone={item.status === 'error' ? 'danger' : 'muted'} size="small">
        {`${open ? '▾' : '▸'} ${label}`}
      </Text>
      {open ? (
        <View style={styles.toolBody}>
          {item.args ? <Text selectable size="small" style={styles.mono}>{item.args}</Text> : null}
          {item.result ? <Text selectable size="small" style={styles.mono}>{item.result}</Text> : null}
          {item.error ? <Text selectable size="small" tone="danger">{item.error}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function MessageRow({ item }: MessageRowProps) {
  const { colors, radius } = useNativeTheme();
  const mine = item.role === 'user';
  return (
    <View
      accessible
      accessibilityLabel={messageLabel(item)}
      style={[
        styles.bubble,
        {
          alignSelf: mine ? 'flex-end' : 'stretch',
          backgroundColor: mine ? colors.accentEmphasis : colors.surface,
          borderColor: colors.border,
          borderRadius: Math.min(radius.card, 18)
        }
      ]}
    >
      {mine ? <Text tone="onEmphasis" selectable>{item.text}</Text> : <Markdown text={item.text} />}
    </View>
  );
}

export function StepRow({ item }: StepRowProps) {
  return (
    <Text tone="muted" size="small" accessibilityState={{ busy: item.status === 'running' }}>
      {stepLine(item)}
    </Text>
  );
}

export function TurnEndRow({ item }: TurnEndRowProps) {
  return <Text tone="muted" size="small">{item.words}</Text>;
}

export function ErrorRow({ item }: ErrorRowProps) {
  return (
    <Text tone="danger" accessibilityRole="alert" selectable>
      {item.text}
    </Text>
  );
}

export function PresenceLine({ state }: PresenceLineProps) {
  return (
    <Text tone={state === 'waiting' ? 'default' : 'muted'} size="small">
      {presenceLine({ state })}
    </Text>
  );
}

/** A row by its kind; a tool row's open state is the screen's, by row id. */
function ItemView({ item, expanded, onToggle }: { item: ConversationItem; expanded: boolean; onToggle: () => void }) {
  switch (item.kind) {
    case 'message':
      return <MessageRow item={item} />;
    case 'tool':
      return <ToolRow item={item} expanded={expanded} onToggle={onToggle} />;
    case 'step':
      return <StepRow item={item} />;
    case 'end':
      return <TurnEndRow item={item} />;
    case 'error':
      return <ErrorRow item={item} />;
  }
}

/** A form question's fields, drawn natively; its values are sent as a settings change. */
function FormQuestion({ question, busy, onSubmit }: { question: ConversationQuestion; busy: boolean; onSubmit: (values: Record<string, unknown>) => void }) {
  const fields = formFieldsOf(question.schema);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const set = (name: string, value: unknown) => setValues(current => ({ ...current, [name]: value }));
  const { colors } = useNativeTheme();
  const missing = fields.filter(field => field.required && (values[field.name] === undefined || values[field.name] === ''));
  return (
    <View style={styles.form}>
      {fields.map(field =>
        field.type === 'boolean' ? (
          <Switch key={field.name} label={field.title} value={values[field.name] === true} onValueChange={value => set(field.name, value)} />
        ) : field.options.length ? (
          <View key={field.name} style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={field.title}>
            <Text size="small" tone="muted">{field.title}</Text>
            {field.options.map(option => (
              <Button
                key={option}
                label={values[field.name] === option ? `✓ ${option}` : option}
                tone={values[field.name] === option ? 'primary' : 'secondary'}
                onPress={() => set(field.name, option)}
              />
            ))}
          </View>
        ) : (
          <View key={field.name} style={styles.choices}>
            <Text size="small" tone="muted">{field.title}</Text>
            <TextInput
              accessibilityLabel={field.title}
              keyboardType={field.type === 'integer' || field.type === 'number' ? 'numeric' : 'default'}
              onChangeText={value =>
                set(field.name, field.type === 'integer' || field.type === 'number' ? (value === '' ? '' : Number(value)) : value)
              }
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholderTextColor={colors.muted}
            />
          </View>
        )
      )}
      <Button label="Answer" busy={busy} disabled={missing.length > 0} onPress={() => onSubmit(values)} />
    </View>
  );
}

export function QuestionCard({ question, busy, onChoose, onForm }: QuestionCardProps) {
  const { colors, radius } = useNativeTheme();
  return (
    <View
      accessibilityRole="summary"
      style={[styles.question, { borderColor: colors.accent, borderRadius: Math.min(radius.card, 18), backgroundColor: colors.surface }]}
    >
      <Text weight="semibold">{questionWords(question)}</Text>
      {question.kind === 'choice' ? (
        <View style={styles.choices}>
          {question.options.map(option => (
            <Button key={option} label={option} tone="secondary" disabled={busy} onPress={() => onChoose(option)} />
          ))}
        </View>
      ) : question.kind === 'form' ? (
        <FormQuestion question={question} busy={busy} onSubmit={onForm} />
      ) : question.kind === 'file' ? (
        <Text tone="muted">{FILE_ON_THE_WEB}</Text>
      ) : (
        <Text tone="muted" size="small">{ANSWER_BELOW}</Text>
      )}
    </View>
  );
}

export function ConversationView({
  controller,
  view,
  placeholder,
  closed,
  paused = false
}: {
  controller: ConversationController;
  view: View_;
  placeholder: string;
  /** Why nothing can be sent, when nothing can. */
  closed?: string;
  /** Its deployment is paused: its presence says so. */
  paused?: boolean;
}) {
  const { colors } = useNativeTheme();
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (id: string) =>
    setExpanded(current => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const scroll = useRef<ScrollView>(null);
  const { conversation, opening, ended } = view;
  const running = conversation.running || controller.running;
  const wasRunning = useRef(running);

  // Announced once the answer is complete, never token by token.
  useEffect(() => {
    if (wasRunning.current && !running) {
      AccessibilityInfo.announceForAccessibility(ANSWER_COMPLETE);
    }
    wasRunning.current = running;
  }, [running]);

  const asking = conversation.asking;
  const composer = composerOf({ state: conversation, opening, ended, closed, placeholder, running });
  const { blocked, canType } = composer;
  const presence = presenceOfConversation({ ...conversation, running }, paused);
  const send = () => {
    const words = draft;
    setDraft('');
    void controller.send(words);
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView
        ref={scroll}
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.items}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        <PresenceLine state={presence} />
        {conversation.dropped ? <Text tone="muted" size="small">{droppedWords(conversation.dropped)}</Text> : null}
        {opening ? <Text tone="muted" accessibilityRole="progressbar">{OPENING_WORDS}</Text> : null}
        {conversation.items.map(item => (
          <ItemView key={item.id} item={item} expanded={expanded.has(item.id)} onToggle={() => toggle(item.id)} />
        ))}
        {asking && showsQuestion(conversation, running) ? (
          <QuestionCard
            question={asking}
            busy={running}
            onChoose={option => void controller.send(option)}
            onForm={values => void controller.answerForm(values)}
          />
        ) : null}
      </ScrollView>
      <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {blocked ? (
          <Text tone="muted" accessibilityRole="text">{blocked}</Text>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Message"
              value={draft}
              onChangeText={setDraft}
              editable={canType}
              multiline
              placeholder={composer.placeholder}
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.message, { color: colors.text, borderColor: colors.border }]}
            />
            {running ? (
              <Button label="Stop" tone="secondary" onPress={() => void controller.stop()} testID="conversation-stop" />
            ) : (
              <Button label="Send" disabled={!canType || !draft.trim()} onPress={send} testID="conversation-send" />
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  items: { padding: SPACE.md, gap: SPACE.sm },
  bubble: { borderWidth: 1, padding: SPACE.sm, maxWidth: '100%' },
  tool: { borderWidth: 1, padding: SPACE.sm, minHeight: MIN_TOUCH, justifyContent: 'center', gap: SPACE.xs },
  toolBody: { gap: SPACE.xs },
  mono: { fontFamily: 'monospace' },
  question: { borderWidth: 1, padding: SPACE.md, gap: SPACE.sm },
  choices: { gap: SPACE.xs },
  form: { gap: SPACE.sm },
  composer: { borderTopWidth: 1, padding: SPACE.sm, gap: SPACE.sm },
  input: { borderWidth: 1, borderRadius: 8, padding: SPACE.sm, minHeight: MIN_TOUCH, fontSize: 16 },
  message: { maxHeight: 160 }
});
