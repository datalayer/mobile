/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { StyleSheet, View } from 'react-native';
import { Text } from '../components/primitives';
import { Eyes } from './Eyes';

/** The app's name, Datalayer Agents, after the eyes; a screen reader says the name. */
export const APP_NAME = 'Datalayer Agents';

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={APP_NAME} style={styles.row}>
      <Eyes size={size * 0.72} />
      <Text weight="semibold" style={{ fontSize: size, lineHeight: size * 1.15, marginLeft: size * 0.3 }}>
        {APP_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', flexWrap: 'wrap' }
});
