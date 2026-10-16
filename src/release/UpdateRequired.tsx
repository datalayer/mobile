/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Button, Screen, Text } from '../components/primitives';
import { LoopWordmark } from '../identity/LoopWordmark';
import { SUPPORT_WORDS, type Support } from './minimumVersion';

/** What stands in front of everything when this build may not go on (M-056). */
export function UpdateRequired({ support, onRetry }: { support: Exclude<Support, { kind: 'supported' }>; onRetry: () => void }) {
  const update = support.kind === 'update';
  return (
    <Screen>
      <LoopWordmark />
      <Text accessibilityRole="header" size="title" weight="semibold">
        {update ? SUPPORT_WORDS.updateTitle : SUPPORT_WORDS.unknownTitle}
      </Text>
      <Text accessibilityLiveRegion="polite">
        {update ? SUPPORT_WORDS.update(support.minimum, support.current) : SUPPORT_WORDS.unknown}
      </Text>
      {update ? null : <Button label={SUPPORT_WORDS.retry} onPress={onRetry} testID="support-retry" />}
    </Screen>
  );
}
