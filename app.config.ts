/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { existsSync } from 'fs';
import { join } from 'path';
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

/*
 * Over-the-air updates (MOBILE M-053): each EAS profile builds on its own
 * channel (eas.json), on the runtime of its app version. An update that can
 * reach people — preview, staging, production — is signed: the build carries
 * the public certificate, the private key stays with the account holders
 * (M-007b), and such a build is refused while the certificate is missing.
 */
const UPDATES_CERTIFICATE = './certs/updates-certificate.pem';
const SIGNED_PROFILES = new Set(['preview', 'staging', 'production']);

function updatesOf(projectId: string | undefined): ExpoConfig['updates'] {
  const profile = process.env.EAS_BUILD_PROFILE ?? '';
  const certified = existsSync(join(__dirname, UPDATES_CERTIFICATE));
  if (SIGNED_PROFILES.has(profile) && !certified) {
    throw new Error(
      `The ${profile} build receives over-the-air updates, which are signed: ${UPDATES_CERTIFICATE} is missing ` +
        '(npx expo-updates codesigning:generate, the key kept by the account holders; MOBILE M-007b, M-053).'
    );
  }
  if (SIGNED_PROFILES.has(profile) && !projectId) {
    throw new Error(`The ${profile} build needs EAS_PROJECT_ID: its updates are served from the project's address.`);
  }
  return {
    ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    ...(certified
      ? {
          codeSigningCertificate: UPDATES_CERTIFICATE,
          codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' }
        }
      : {})
  };
}

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
    updates: updatesOf(process.env.EAS_PROJECT_ID),
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
            // Conversation health (M-036, decided by the user 15 October 2026): durations, counts and
            // failure categories, never words; linked to the account, not tracking.
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePerformanceData',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              'NSPrivacyCollectedDataTypePurposeAnalytics'
            ]
          }
        ]
      }
    },
    android: {
      package: variant.id,
      // Expo's template asks for storage and drawing over other apps; the app needs neither, and
      // scripts/release-manifests.js holds the merged release manifest to docs/privacy-and-store.md (M-052).
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW'
      ],
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
      // The tokens are kept without biometrics, so no Face ID usage description (M-052).
      ['expo-secure-store', { faceIDPermission: false }],
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
