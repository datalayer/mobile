/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/** The build variants that are installed side by side. */
type Variant = 'development' | 'preview' | 'production';

const VARIANT: Variant =
  process.env.APP_VARIANT === 'development' || process.env.APP_VARIANT === 'preview' ? process.env.APP_VARIANT : 'production';

const BASE_ID = 'ai.datalayer.mobile';

/** The app's name on the phone and in the stores. */
const APP_NAME = 'Datalayer Agents';

/** The Expo project: https://expo.dev/accounts/datalayer/projects/datalayer-agents */
const EXPO_OWNER = 'datalayer';
const EXPO_SLUG = 'datalayer-agents';
export const EAS_PROJECT_ID = '790468fa-e6ee-44a8-9fff-b303c45f4f84';

const VARIANTS: Record<Variant, { name: string; id: string; scheme: string; icon: string }> = {
  development: {
    name: `${APP_NAME} Dev`,
    id: `${BASE_ID}.dev`,
    scheme: 'datalayer-dev',
    icon: './assets/icon-development.png'
  },
  preview: {
    name: `${APP_NAME} Preview`,
    id: `${BASE_ID}.preview`,
    scheme: 'datalayer-preview',
    icon: './assets/icon-preview.png'
  },
  production: {
    name: APP_NAME,
    id: BASE_ID,
    scheme: 'datalayer',
    icon: './assets/icon.png'
  }
};

/*
 * Over-the-air updates: each EAS profile builds on its own channel (eas.json),
 * on the runtime of its app version, served from the Expo project's address. An
 * update that can reach people — preview, staging, production — is signed: the
 * build carries the public certificate, the private key stays with the account
 * holders, and such a build is refused while the certificate is missing.
 */
const UPDATES_CERTIFICATE = './certs/updates-certificate.pem';
const SIGNED_PROFILES = new Set(['preview', 'staging', 'production']);

function updatesOf(): ExpoConfig['updates'] {
  const profile = process.env.EAS_BUILD_PROFILE ?? '';
  const certified = existsSync(join(__dirname, UPDATES_CERTIFICATE));
  if (SIGNED_PROFILES.has(profile) && !certified) {
    throw new Error(
      `The ${profile} build receives over-the-air updates, which are signed: ${UPDATES_CERTIFICATE} is missing ` +
        '(npx expo-updates codesigning:generate; the private key is kept by the account holders, never committed).'
    );
  }
  return {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
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
    slug: EXPO_SLUG,
    owner: EXPO_OWNER,
    version: '0.0.1',
    // The second is the OAuth redirect's private scheme, named by the build's id (RFC 8252 §7.1).
    scheme: [variant.scheme, variant.id],
    icon: variant.icon,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'appVersion' },
    updates: updatesOf(),
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
            // Conversation health: durations, counts and
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
      // Expo's template asks for storage and drawing over other apps, expo-secure-store's biometric
      // library for biometrics and expo-application's install-referrer library for the Play Store's
      // referrer: the app uses none of them. scripts/release-manifests.js holds the merged release
      // manifest to docs/privacy-and-store.md.
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE'
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
      // The tokens are kept without biometrics, so no Face ID usage description.
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
      eas: { projectId: EAS_PROJECT_ID }
    }
  };
};
