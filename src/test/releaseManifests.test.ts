/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import fs from 'fs';
import path from 'path';

const {
  DECLARED_DATA,
  ANDROID_PERMISSIONS,
  privacyProblems,
  infoPlistProblems,
  permissionsOf,
  permissionProblems
} = require('../../scripts/release-manifests.js');

const appConfig = require('../../app.config').default;

const DOCS = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'privacy-and-store.md'), 'utf8');

function productionConfig() {
  const saved = { variant: process.env.APP_VARIANT, profile: process.env.EAS_BUILD_PROFILE };
  delete process.env.APP_VARIANT;
  delete process.env.EAS_BUILD_PROFILE;
  try {
    return appConfig({ config: {} });
  } finally {
    if (saved.variant !== undefined) process.env.APP_VARIANT = saved.variant;
    if (saved.profile !== undefined) process.env.EAS_BUILD_PROFILE = saved.profile;
  }
}

describe('the release manifests (M-052)', () => {
  it("declares in app.config.ts exactly what the script holds the generated manifest to", () => {
    const privacy = productionConfig().ios.privacyManifests;
    expect(privacyProblems(privacy)).toEqual([]);
    expect(Object.keys(DECLARED_DATA)).toHaveLength(5);
  });

  it('refuses tracking, an undeclared type, a missing one and a changed purpose', () => {
    const privacy = productionConfig().ios.privacyManifests;
    const collected = privacy.NSPrivacyCollectedDataTypes.filter(
      (item: { NSPrivacyCollectedDataType: string }) => item.NSPrivacyCollectedDataType !== 'NSPrivacyCollectedDataTypeDeviceID'
    );
    const problems = privacyProblems({
      NSPrivacyTracking: true,
      NSPrivacyTrackingDomains: ['ads.example'],
      NSPrivacyCollectedDataTypes: [
        ...collected.map((item: Record<string, unknown>) =>
          item.NSPrivacyCollectedDataType === 'NSPrivacyCollectedDataTypeUserID'
            ? { ...item, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising'] }
            : item
        ),
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePreciseLocation',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: []
        }
      ]
    });
    expect(problems).toEqual([
      'NSPrivacyTracking is not false',
      'tracking domains: ads.example',
      'NSPrivacyCollectedDataTypeUserID is collected for NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising, the inventory says NSPrivacyCollectedDataTypePurposeAppFunctionality',
      'NSPrivacyCollectedDataTypePreciseLocation is collected but not in the data inventory',
      'NSPrivacyCollectedDataTypeDeviceID is in the data inventory but not in the manifest'
    ]);
  });

  it('refuses a usage description and an encryption answer other than exempt', () => {
    expect(infoPlistProblems({ ITSAppUsesNonExemptEncryption: false, CFBundleName: 'Datalayer' })).toEqual([]);
    expect(infoPlistProblems({ NSFaceIDUsageDescription: 'Allow Face ID' })).toEqual([
      'NSFaceIDUsageDescription asks for a permission the app never uses ("Allow Face ID")',
      'ITSAppUsesNonExemptEncryption is not false (docs/store-listing.md answers export compliance with it)'
    ]);
  });

  it('reads the permissions a merged manifest grants, leaving out the removed ones', () => {
    const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
      <uses-permission android:name="android.permission.INTERNET" />
      <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove" />
      <uses-permission-sdk-23 android:name="android.permission.POST_NOTIFICATIONS"/>
      <uses-permission android:name="ai.datalayer.mobile.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION" />
      <uses-permission android:name="android.permission.INTERNET" />
    </manifest>`;
    const permissions = permissionsOf(manifest);
    expect(permissions).toEqual([
      'ai.datalayer.mobile.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
      'android.permission.INTERNET',
      'android.permission.POST_NOTIFICATIONS'
    ]);
    expect(permissionProblems(permissions)).toEqual([]);
  });

  it('refuses an unexplained permission, and a manifest without the notification permission', () => {
    expect(permissionProblems(['android.permission.INTERNET', 'android.permission.READ_EXTERNAL_STORAGE'])).toEqual([
      'android.permission.READ_EXTERNAL_STORAGE is in the release manifest and docs/privacy-and-store.md does not explain it',
      'android.permission.POST_NOTIFICATIONS is missing: notifications could not be asked for'
    ]);
  });

  it("blocks the template's storage and overlay permissions and asks for no Face ID text", () => {
    const config = productionConfig();
    expect(config.android.blockedPermissions).toEqual([
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW'
    ]);
    expect(config.plugins).toContainEqual(['expo-secure-store', { faceIDPermission: false }]);
    expect(config.ios.config.usesNonExemptEncryption).toBe(false);
  });

  it('documents every permission the release may hold', () => {
    for (const name of Object.keys(ANDROID_PERMISSIONS)) {
      expect(DOCS).toContain(`\`${name}\``);
    }
  });
});
