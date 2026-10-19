/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** An answer drawn natively from Markdown's safe subset (`markdownBlocks.ts`); a link opens after its address is confirmed. */

import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Text } from '../../components/primitives';
import { SPACE, useColors } from '../../theme/tokens';
import { blocksOf, linkHost, type Span } from './markdownBlocks';

/** Ask before leaving the app: the address is named, nothing opens by itself. */
export function confirmLink(url: string): void {
  Alert.alert('Open this link?', `It opens ${linkHost(url)} outside Datalayer Agents.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open', onPress: () => void Linking.openURL(url) }
  ]);
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => {
        switch (span.kind) {
          case 'strong':
            return <Text key={index} weight="semibold">{span.text}</Text>;
          case 'em':
            return <Text key={index} style={styles.em}>{span.text}</Text>;
          case 'code':
            return <Text key={index} style={styles.mono}>{span.text}</Text>;
          case 'link':
            return (
              <Text
                key={index}
                tone="accent"
                style={styles.link}
                accessibilityRole="link"
                accessibilityHint={`Asks before opening ${linkHost(span.url)}`}
                onPress={() => confirmLink(span.url)}
              >
                {span.text}
              </Text>
            );
          default:
            return <Text key={index}>{span.text}</Text>;
        }
      })}
    </>
  );
}

export function Markdown({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.blocks}>
      {blocksOf(text).map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Text key={index} accessibilityRole="header" size={block.level === 1 ? 'title' : 'heading'} weight="semibold">
                <Spans spans={block.spans} />
              </Text>
            );
          case 'list':
            return (
              <View key={index} style={styles.list}>
                {block.items.map((item, at) => (
                  <Text key={at} selectable>
                    {block.ordered ? `${at + 1}. ` : '• '}
                    <Spans spans={item} />
                  </Text>
                ))}
              </View>
            );
          case 'quote':
            return (
              <Text key={index} tone="muted" selectable style={[styles.quote, { borderColor: colors.border }]}>
                <Spans spans={block.spans} />
              </Text>
            );
          case 'code':
            return (
              <Text key={index} selectable style={[styles.mono, styles.code, { backgroundColor: colors.background }]}>
                {block.text}
              </Text>
            );
          default:
            return (
              <Text key={index} selectable>
                <Spans spans={block.spans} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: SPACE.sm },
  list: { gap: SPACE.xs },
  em: { fontStyle: 'italic' },
  link: { textDecorationLine: 'underline' },
  mono: { fontFamily: 'monospace' },
  code: { padding: SPACE.sm },
  quote: { borderLeftWidth: 3, paddingLeft: SPACE.sm }
});
