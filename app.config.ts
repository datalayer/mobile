/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ConfigContext, ExpoConfig } from 'expo/config';

/** The build variants that are installed side by side (MOBILE.md §5.1). */
type Variant = 'development' | 'preview' | 'production';

const VARIANT: Variant =
  process.env.APP_VARIANT === 'development' || process.env.APP_VARIANT === 'preview'
    ? process.env.APP_VARIANT
    : 'production';

const BASE_ID = 'ai.datalayer.mobile';

const VARIANTS: Record<Variant, { name: string; id: string; scheme: string }> = {
  development: { name: 'Datalayer Dev', id: `${BASE_ID}.dev`, scheme: 'datalayer-dev' },
  preview: { name: 'Datalayer Preview', id: `${BASE_ID}.preview`, scheme: 'datalayer-preview' },
  production: { name: 'Datalayer', id: BASE_ID, scheme: 'datalayer' }
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[VARIANT];
  return {
    ...config,
    name: variant.name,
    slug: 'datalayer-mobile',
    owner: process.env.EXPO_OWNER ?? 'datalayer',
    version: '0.0.1',
    scheme: variant.scheme,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'appVersion' },
    ios: {
      bundleIdentifier: variant.id,
      supportsTablet: true,
      associatedDomains: VARIANT === 'production' ? ['applinks:datalayer.ai'] : [],
      config: { usesNonExemptEncryption: false }
    },
    android: {
      package: variant.id,
      intentFilters:
        VARIANT === 'production'
          ? [
              {
                action: 'VIEW',
                autoVerify: true,
                data: [{ scheme: 'https', host: 'datalayer.ai', pathPrefix: '/mobile' }],
                category: ['BROWSABLE', 'DEFAULT']
              }
            ]
          : []
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      ['expo-notifications', { defaultChannel: 'needs-attention' }]
    ],
    experiments: { typedRoutes: true },
    extra: {
      variant: VARIANT,
      eas: { projectId: process.env.EAS_PROJECT_ID }
    }
  };
};
