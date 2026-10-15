/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ConfigContext, ExpoConfig } from 'expo/config';

/** The build variants that are installed side by side (MOBILE.md §5.1). */
type Variant = 'development' | 'preview' | 'production';

const VARIANT: Variant =
  process.env.APP_VARIANT === 'development' || process.env.APP_VARIANT === 'preview' ? process.env.APP_VARIANT : 'production';

const BASE_ID = 'ai.datalayer.mobile';

const VARIANTS: Record<Variant, { name: string; id: string; scheme: string; icon: string }> = {
  development: {
    name: 'Datalayer Dev',
    id: `${BASE_ID}.dev`,
    scheme: 'datalayer-dev',
    icon: './assets/icon-development.png'
  },
  preview: {
    name: 'Datalayer Preview',
    id: `${BASE_ID}.preview`,
    scheme: 'datalayer-preview',
    icon: './assets/icon-preview.png'
  },
  production: {
    name: 'Datalayer',
    id: BASE_ID,
    scheme: 'datalayer',
    icon: './assets/icon.png'
  }
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[VARIANT];
  return {
    ...config,
    name: variant.name,
    slug: 'datalayer-mobile',
    owner: process.env.EXPO_OWNER ?? 'datalayer',
    version: '0.0.1',
    // The second is the OAuth redirect's private scheme, named by the build's id (RFC 8252 §7.1).
    scheme: [variant.scheme, variant.id],
    icon: variant.icon,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'appVersion' },
    ios: {
      bundleIdentifier: variant.id,
      supportsTablet: true,
      associatedDomains: VARIANT === 'production' ? ['applinks:datalayer.ai'] : [],
      config: { usesNonExemptEncryption: false },
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
          },
          {
            // Conversation health (M-036): durations, counts and failure categories, never words.
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePerformanceData',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics']
          }
        ]
      }
    },
    android: {
      package: variant.id,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        monochromeImage: './assets/adaptive-icon-monochrome.png',
        backgroundColor: VARIANT === 'development' ? '#7ADBB8' : VARIANT === 'preview' ? '#8CCBF9' : '#FFFFFF'
      },
      intentFilters:
        VARIANT === 'production'
          ? [
              {
                action: 'VIEW',
                autoVerify: true,
                data: [
                  {
                    scheme: 'https',
                    host: 'datalayer.ai',
                    pathPrefix: '/mobile'
                  }
                ],
                category: ['BROWSABLE', 'DEFAULT']
              }
            ]
          : []
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 160,
          resizeMode: 'contain',
          backgroundColor: '#FFFFFF',
          dark: {
            image: './assets/splash-icon-dark.png',
            backgroundColor: '#131314'
          }
        }
      ],
      ['expo-notifications', { defaultChannel: 'needs-attention' }]
    ],
    experiments: { typedRoutes: true },
    // The development preview of `make dev-web`; the app ships on iOS and Android only.
    web: { bundler: 'metro', output: 'single' },
    extra: {
      variant: VARIANT,
      applicationId: variant.id,
      eas: { projectId: process.env.EAS_PROJECT_ID }
    }
  };
};
