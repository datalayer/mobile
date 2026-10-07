/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { StyleSheet, Text as NativeText, View } from 'react-native';
import type { AppFace as Face } from '../api/faces';
import { useNativeTheme } from '../theme/tokens';
import { LoopEyes } from './LoopEyes';

/** An application's face on a tinted disc: its emoji, or the drawn eyes it has until it chooses one. */
export function AppFace({ face, size = 40 }: { face?: Face; size?: number }) {
  const { colors } = useNativeTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentMuted }]}
    >
      {face?.emoji ? (
        <NativeText style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }} allowFontScaling={false}>
          {face.emoji}
        </NativeText>
      ) : (
        <LoopEyes size={size * 0.42} surface={colors.accentMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
});
