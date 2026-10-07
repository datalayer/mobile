/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { StyleSheet, View } from 'react-native';
import { Text } from '../components/primitives';
import { LoopEyes } from './LoopEyes';

/** L👀P: the eyes stand for the two O's, and a screen reader says *LOOP*. */
export function LoopWordmark({ size = 34 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="LOOP" style={styles.row}>
      <Text weight="semibold" style={{ fontSize: size, lineHeight: size * 1.15 }}>
        L
      </Text>
      <View style={{ marginHorizontal: size * 0.04 }}>
        <LoopEyes size={size * 0.72} />
      </View>
      <Text weight="semibold" style={{ fontSize: size, lineHeight: size * 1.15 }}>
        P
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }
});
