/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as Application from 'expo-application';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { environment } from '../config/environment';
import { checkSupport, type Support } from './minimumVersion';

/**
 * Whether this build is still supported (M-056), checked at launch and each
 * time the app comes back to the foreground. `null` while the first check runs.
 */
export function useSupport(): { support: Support | null; retry: () => void } {
  const [support, setSupport] = useState<Support | null>(null);
  const checking = useRef(false);
  const check = useCallback(() => {
    if (checking.current) return;
    checking.current = true;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    void checkSupport(environment().runUrl, platform, Application.nativeApplicationVersion)
      .then(setSupport)
      .finally(() => {
        checking.current = false;
      });
  }, []);
  useEffect(() => {
    check();
    const listening = AppState.addEventListener('change', state => state === 'active' && check());
    return () => listening.remove();
  }, [check]);
  return { support, retry: check };
}
