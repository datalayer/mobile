/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The safe subset of Markdown an answer is drawn with on the phone (MOBILE
 * M-032): paragraphs, headings, lists, quotes, fenced code, and inline bold,
 * italic, code and links. Nothing else is interpreted: raw HTML, images and
 * scripts are shown as the words they are, and a link is kept only when it is
 * `https:` (or `mailto:`) — it opens after the person confirms its address.
 *
 * Pure: the renderer draws what this returns.
 */

export type Span =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; url: string };

export type Block =
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'heading'; level: 1 | 2 | 3; spans: Span[] }
  | { kind: 'list'; ordered: boolean; items: Span[][] }
  | { kind: 'quote'; spans: Span[] }
  | { kind: 'code'; text: string };

/** Whether an address may be offered to open: HTTPS or mail only. */
export function linkAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? Boolean(parsed.hostname) : parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

/** What the confirmation names: the host, or the mail address. */
export function linkHost(url: string): string {
  const parsed = new URL(url);
  return parsed.protocol === 'mailto:' ? parsed.pathname : parsed.hostname;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/;

/** Inline spans of one line of text. */
export function spansOf(line: string): Span[] {
  const spans: Span[] = [];
  let rest = line;
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      spans.push({ kind: 'text', text: rest });
      break;
    }
    if (match.index > 0) {
      spans.push({ kind: 'text', text: rest.slice(0, match.index) });
    }
    const token = match[0];
    if (match[1]) {
      spans.push({ kind: 'code', text: token.slice(1, -1) });
    } else if (match[2] || match[3]) {
      spans.push({ kind: 'strong', text: token.slice(2, -2) });
    } else if (match[4] || match[5]) {
      spans.push({ kind: 'em', text: token.slice(1, -1) });
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const label = link?.[1];
      const url = link?.[2];
      spans.push(label && url && linkAllowed(url) ? { kind: 'link', text: label, url } : { kind: 'text', text: token });
    }
    rest = rest.slice(match.index + token.length);
  }
  // Neighbouring plain text kept as one span.
  return spans.reduce<Span[]>((merged, span) => {
    const last = merged[merged.length - 1];
    if (span.kind === 'text' && last?.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', text: last.text + span.text };
    } else {
      merged.push(span);
    }
    return merged;
  }, []);
}

const LIST_ITEM = /^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/;

/** The blocks of an answer. */
export function blocksOf(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', spans: spansOf(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (/^\s*```/.test(line)) {
      flush();
      const code: string[] = [];
      i += 1;
      for (let next = lines[i]; next !== undefined && !/^\s*```/.test(next); next = lines[i]) {
        code.push(next);
        i += 1;
      }
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: Math.min((heading[1] ?? '').length, 3) as 1 | 2 | 3, spans: spansOf(heading[2] ?? '') });
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ kind: 'quote', spans: spansOf(quote[1] ?? '') });
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      flush();
      const ordered = Boolean(item[2]);
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'list' && last.ordered === ordered && (lines[i - 1] ?? '').trim()) {
        last.items.push(spansOf(item[3] ?? ''));
      } else {
        blocks.push({ kind: 'list', ordered, items: [spansOf(item[3] ?? '')] });
      }
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}
