/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { StyleSheet, View } from 'react-native';
import { Text } from '../components/primitives';

/** The app's name, Datalayer, as the title: the name alone, no eyes before it. */
export const APP_NAME = 'Datalayer';

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={APP_NAME} style={styles.row}>
      <Text weight="semibold" style={{ fontSize: size, lineHeight: size * 1.15 }}>
        {APP_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', flexWrap: 'wrap' }
});
