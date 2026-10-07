/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Expo UI's native controls (SwiftUI on iOS, Jetpack Compose on Android),
 * tinted with the current Primer Addons theme. Everything the app does not
 * draw itself goes through here, so one `Host` carries the theme.
 */

import { Button as NativeButton, Host, Picker as NativePicker, Switch as NativeSwitch } from '@expo/ui';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function ThemedHost({
  children,
  style,
  matchContents = true
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
}) {
  const { theme } = useTheme();
  return (
    <Host colorScheme={theme.mode} seedColor={theme.seedColor} matchContents={matchContents} style={style}>
      {children}
    </Host>
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  busy = false,
  tone = 'primary',
  testID
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'primary' | 'secondary' | 'plain';
  testID?: string;
}) {
  const variant = tone === 'primary' ? 'filled' : tone === 'secondary' ? 'outlined' : 'text';
  return (
    <ThemedHost matchContents={{ vertical: true }}>
      <NativeButton label={busy ? `${label}…` : label} variant={variant} onPress={onPress} disabled={disabled || busy} testID={testID} />
    </ThemedHost>
  );
}

export function Switch({
  label,
  value,
  onValueChange,
  disabled
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ThemedHost>
      <NativeSwitch label={label} value={value} onValueChange={onValueChange} disabled={disabled} />
    </ThemedHost>
  );
}

export function Picker<T extends string>({
  selectedValue,
  onValueChange,
  options
}: {
  selectedValue: T;
  onValueChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
}) {
  return (
    <ThemedHost>
      <NativePicker selectedValue={selectedValue} onValueChange={value => onValueChange(value as T)} appearance="menu">
        {options.map(option => (
          <NativePicker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </NativePicker>
    </ThemedHost>
  );
}
