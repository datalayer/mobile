/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The tab bar's icons: SF Symbols on iOS, Material Symbols vector drawables on
 * Android, drawn natively by Expo UI. A tab without an icon would get React
 * Navigation's placeholder character, which Android's system font does not have.
 */

import { Host, Icon } from '@expo/ui';
import type { ColorValue } from 'react-native';

const TAB_ICONS = {
  inbox: Icon.select({ ios: 'tray', android: import('@expo/material-symbols/inbox.xml') }),
  agents: Icon.select({ ios: 'sparkles', android: import('@expo/material-symbols/smart_toy.xml') }),
  activity: Icon.select({ ios: 'clock.arrow.circlepath', android: import('@expo/material-symbols/history.xml') })
} as const;

export type TabIconName = keyof typeof TAB_ICONS;

export function TabIcon({ name, color, size }: { name: TabIconName; color: ColorValue; size: number }) {
  return (
    <Host matchContents>
      <Icon name={TAB_ICONS[name]} size={size} color={color} />
    </Host>
  );
}
