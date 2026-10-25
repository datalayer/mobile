/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Host, Icon } from '@expo/ui';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';

// The platform's own eye (iOS SF Symbols, Android Material Symbols): the app
// draws no SVG, so the web's octicons (eye, eye-closed) have these as twins.
const EYES = {
  shown: Icon.select({ ios: 'eye.slash', android: import('@expo/material-symbols/visibility_off.xml') }),
  hidden: Icon.select({ ios: 'eye', android: import('@expo/material-symbols/visibility.xml') })
} as const;

/** The eye at the end of a password field: shows or hides the password in plain text. */
export function PasswordToggle({
  visible,
  onToggle,
  color
}: {
  visible: boolean;
  onToggle: () => void;
  color: ColorValue;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      hitSlop={8}
      onPress={onToggle}
      style={styles.button}
    >
      <Host matchContents>
        <Icon name={visible ? EYES.shown : EYES.hidden} size={20} color={color} />
      </Host>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' }
});
