/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A bottom sheet whose native controls carry the theme. Expo UI's universal
 * `BottomSheet` draws in a `Host` of its own, without a seed colour, so its
 * buttons and fields took Material's default palette; this one is the same
 * Compose `ModalBottomSheet` in a `Host` seeded like every other (`./native`).
 */

import { Column, Host, ModalBottomSheet, type ModalBottomSheetRef } from '@expo/ui/jetpack-compose';
import { padding } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const sheet = useRef<ModalBottomSheetRef>(null);
  const [mounted, setMounted] = useState(isPresented);
  if (isPresented && !mounted) {
    setMounted(true);
  }

  // Closing animates the sheet away before it leaves the tree.
  useEffect(() => {
    if (isPresented) {
      return;
    }
    let cancelled = false;
    void sheet.current?.hide().then(() => {
      if (!cancelled) {
        setMounted(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isPresented]);

  if (!mounted) {
    return null;
  }
  const { top, right, bottom, left } = SHEET_PADDING;
  return (
    <Host colorScheme={theme.mode} seedColor={theme.seedColor} style={{ position: 'absolute' }} pointerEvents="none">
      <ModalBottomSheet ref={sheet} onDismissRequest={onDismiss} showDragHandle containerColor={theme.colors.surface}>
        <Column modifiers={[padding(left, top, right, bottom)]}>{children}</Column>
      </ModalBottomSheet>
    </Host>
  );
}
