/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The web preview's bottom sheet (`make dev-web`): Expo UI's universal sheet.
 * iOS and Android theme their native controls in `.ios.tsx` and `.android.tsx`.
 */

import { BottomSheet } from '@expo/ui';
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
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss} containerColor={theme.colors.surface} contentPadding={SHEET_PADDING}>
      {children}
    </BottomSheet>
  );
}
