/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A conversation drawn natively (MOBILE M-032 to M-034): what Agent Runtimes'
 * conversation reducer holds — messages, tool calls and steps collapsed, how
 * a wordless turn ended, failures — with the question the application asks,
 * the composer, Stop, and a screen-reader announcement once an answer is
 * complete (never each token).
 */

import { formFieldsOf, questionWords, type ConversationItem, type ConversationQuestion } from '@datalayer/agent-runtimes/lib/portable';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Text } from '../../components/primitives';
import { Switch } from '../../components/native';
import { MIN_TOUCH, SPACE, useNativeTheme } from '../../theme/tokens';
import { FILE_ON_THE_WEB, type ConversationController, type ConversationView as View_ } from './controller';
import { Markdown } from './Markdown';

const STATUS_WORDS = { running: 'running', complete: 'done', error: 'failed' } as const;

function ToolRow({ item }: { item: Extract<ConversationItem, { kind: 'tool' }> }) {
  const [open, setOpen] = useState(false);
  const { colors, radius } = useNativeTheme();
  const label = `Tool ${item.name || 'call'}, ${STATUS_WORDS[item.status]}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open, busy: item.status === 'running' }}
      onPress={() => setOpen(!open)}
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

function ItemView({ item }: { item: ConversationItem }) {
  const { colors, radius } = useNativeTheme();
  switch (item.kind) {
    case 'message': {
      const mine = item.role === 'user';
      return (
        <View
          accessible
          accessibilityLabel={`${mine ? 'You' : 'Answer'}: ${item.text}`}
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
    case 'tool':
      return <ToolRow item={item} />;
    case 'step':
      return (
        <Text tone="muted" size="small" accessibilityState={{ busy: item.status === 'running' }}>
          {`${item.status === 'running' ? '…' : '✓'} ${item.name}`}
        </Text>
      );
    case 'end':
      return <Text tone="muted" size="small">{item.words}</Text>;
    case 'error':
      return (
        <Text tone="danger" accessibilityRole="alert" selectable>
          {item.text}
        </Text>
      );
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

function QuestionCard({ question, busy, onChoose, onForm }: { question: ConversationQuestion; busy: boolean; onChoose: (option: string) => void; onForm: (values: Record<string, unknown>) => void }) {
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
        <Text tone="muted" size="small">Answer in the message box below.</Text>
      )}
    </View>
  );
}

export function ConversationView({
  controller,
  view,
  placeholder,
  closed
}: {
  controller: ConversationController;
  view: View_;
  placeholder: string;
  /** Why nothing can be sent, when nothing can. */
  closed?: string;
}) {
  const { colors } = useNativeTheme();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const { conversation, opening, ended } = view;
  const running = conversation.running || controller.running;
  const wasRunning = useRef(running);

  // Announced once the answer is complete, never token by token.
  useEffect(() => {
    if (wasRunning.current && !running) {
      AccessibilityInfo.announceForAccessibility('The answer is complete.');
    }
    wasRunning.current = running;
  }, [running]);

  const asking = conversation.asking;
  const blocked = closed || (ended ? 'This conversation has ended. Its record stays.' : '');
  const canType = !blocked && !opening && !running && asking?.kind !== 'form' && asking?.kind !== 'file';
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
        {conversation.dropped ? (
          <Text tone="muted" size="small">{`${conversation.dropped} earlier rows are not kept on this device.`}</Text>
        ) : null}
        {opening ? <Text tone="muted" accessibilityRole="progressbar">Opening your conversation…</Text> : null}
        {conversation.items.map(item => (
          <ItemView key={item.id} item={item} />
        ))}
        {asking && !running ? (
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
              placeholder={asking?.kind === 'text' ? asking.prompt : placeholder}
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
