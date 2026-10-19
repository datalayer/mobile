/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A mediated sign-in typed on the phone:
 * what the company asks — a name and a password, or a code it sent — read
 * with the sign-in's one-use protected ticket and sent once to IAM, which
 * passes it to the company. The agent never sees it; nothing typed is kept,
 * not even in an error. Agent Runtimes' `portable/protectedInput` is the
 * client and the rules.
 */

import {
  emptyFields,
  fieldProblems,
  PROTECTED_INPUT_WORDS,
  sentWords,
  submitWords,
  type ProtectedRequest,
  type protectedInputClient
} from '@datalayer/agent-runtimes/lib/portable';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Text } from '../../components/primitives';
import { MIN_TOUCH, SPACE, useNativeTheme } from '../../theme/tokens';

export type ProtectedInput = ReturnType<typeof protectedInputClient>;

const said = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function MediatedForm({ ticket, input }: { ticket: string; input: ProtectedInput }) {
  const { colors } = useNativeTheme();
  const [request, setRequest] = useState<ProtectedRequest | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState('');
  const [state, setState] = useState<'reading' | 'typing' | 'sending' | 'sent'>('reading');

  useEffect(() => {
    let current = true;
    input
      .read(ticket)
      .then(read => current && (setRequest(read), setState('typing')))
      .catch(error => current && setProblem(said(error)));
    return () => {
      current = false;
    };
  }, [input, ticket]);

  if (state === 'sent') {
    return <Text size="small">{PROTECTED_INPUT_WORDS.done}</Text>;
  }
  if (!request) {
    return <Text size="small" tone={problem ? 'danger' : 'muted'}>{problem || PROTECTED_INPUT_WORDS.reading}</Text>;
  }
  const send = async () => {
    setState('sending');
    setProblem('');
    try {
      await input.send(ticket, request, values);
      setValues({});
      setState('sent');
    } catch (error) {
      // The words stay where they were typed; the error never names them.
      setProblem(said(error));
      setState('typing');
    }
  };
  const missing = emptyFields(request, values).length > 0;
  return (
    <View style={{ gap: SPACE.xs }}>
      <Text size="small">{PROTECTED_INPUT_WORDS.intro(request.companyName)}</Text>
      <Text size="small" tone="muted">{`${PROTECTED_INPUT_WORDS.where}: ${request.companyDomain}`}</Text>
      {request.purpose === 'one_time_code' ? <Text size="small">{sentWords(request)}</Text> : null}
      {request.fields.map(field => (
        <TextInput
          key={field.name}
          accessibilityLabel={field.label}
          placeholder={field.label}
          placeholderTextColor={colors.muted}
          secureTextEntry={field.secret}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          textContentType={field.secret ? (request.purpose === 'one_time_code' ? 'oneTimeCode' : 'password') : 'none'}
          value={values[field.name] ?? ''}
          onChangeText={text => setValues(current => ({ ...current, [field.name]: text }))}
          style={{ borderWidth: 1, borderColor: colors.border, color: colors.text, borderRadius: 8, padding: SPACE.sm, minHeight: MIN_TOUCH }}
        />
      ))}
      {problem ? <Text tone="danger" accessibilityRole="alert">{problem}</Text> : null}
      <Button
        label={submitWords(request)}
        busy={state === 'sending'}
        disabled={missing || fieldProblems(request, values).length > 0}
        onPress={() => void send()}
        testID="mediated-send"
      />
      <Text size="small" tone="muted">{PROTECTED_INPUT_WORDS.expires(request.expiresAt)}</Text>
    </View>
  );
}
