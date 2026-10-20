/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A bottom sheet whose native controls carry the theme. Expo UI's universal
 * `BottomSheet` draws in a `Host` of its own, without the theme's tint, so
 * its controls took the system blue; the tint is set on the sheet's content.
 */

import { BottomSheet } from '@expo/ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { SHEET_PADDING } from './sheetPadding';

export function ThemedBottomSheet({
  isPresented,
  onDismiss,
  children
}: {
  isPresented: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      containerColor={theme.colors.surface}
      contentPadding={SHEET_PADDING}
      modifiers={[tint(theme.seedColor)]}
    >
      {children}
    </BottomSheet>
  );
}
