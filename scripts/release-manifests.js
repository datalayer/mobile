/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * The release manifests of MOBILE.md M-052, read from what the production
 * build generates (Check's `manifests` job: `expo prebuild` without a variant,
 * then Gradle's merge of the release Android manifest, libraries included).
 * It holds them to docs/privacy-and-store.md:
 *  - iOS PrivacyInfo.xcprivacy: no tracking, no tracking domain, and exactly
 *    the five data types declared, each linked, not tracking, for its purposes;
 *  - iOS Info.plist: no usage description (the app asks for nothing but
 *    notifications, which iOS asks without one) and exempt encryption only;
 *  - Android: every permission of the merged release manifest is one this file
 *    explains; anything a dependency adds fails until it is explained or removed
 *    (app.config.ts' android.blockedPermissions).
 * Usage: node scripts/release-manifests.js [project dir]
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONALITY = 'NSPrivacyCollectedDataTypePurposeAppFunctionality';
const ANALYTICS = 'NSPrivacyCollectedDataTypePurposeAnalytics';

/** The data types the app collects and why (docs/privacy-and-store.md, Data inventory). */
const DECLARED_DATA = {
  NSPrivacyCollectedDataTypeUserID: [FUNCTIONALITY],
  NSPrivacyCollectedDataTypeDeviceID: [FUNCTIONALITY],
  NSPrivacyCollectedDataTypeProductInteraction: [FUNCTIONALITY],
  NSPrivacyCollectedDataTypeOtherUserContent: [FUNCTIONALITY],
  NSPrivacyCollectedDataTypePerformanceData: [FUNCTIONALITY, ANALYTICS]
};

/** The permissions the release Android app may hold, each with why (docs/privacy-and-store.md). */
const ANDROID_PERMISSIONS = {
  'android.permission.INTERNET': "reaches Datalayer's services",
  'android.permission.ACCESS_NETWORK_STATE': 'knows whether it is offline (a library of React Native and Firebase Messaging)',
  'android.permission.POST_NOTIFICATIONS': 'shows notifications, asked only when the person turns them on (Android 13 and later)',
  'android.permission.VIBRATE': 'a notification may vibrate (expo-notifications)',
  'android.permission.RECEIVE_BOOT_COMPLETED': 'expo-notifications keeps its notification channels after a restart',
  'android.permission.WAKE_LOCK': 'Firebase Messaging wakes the app to deliver a push',
  'com.google.android.c2dm.permission.RECEIVE': 'receives pushes through Firebase Cloud Messaging'
};

/** Permissions the app declares itself and keeps to itself: AndroidX's guard on its own receivers. */
const OWN_PERMISSION = /\.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION$/;

function filesUnder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'Pods' || entry.name === 'node_modules' ? [] : filesUnder(full);
    }
    return [full];
  });
}

/** What is wrong with the app's PrivacyInfo.xcprivacy, parsed. */
function privacyProblems(privacy) {
  const problems = [];
  if (privacy.NSPrivacyTracking !== false) {
    problems.push('NSPrivacyTracking is not false');
  }
  if ((privacy.NSPrivacyTrackingDomains ?? []).length) {
    problems.push(`tracking domains: ${privacy.NSPrivacyTrackingDomains.join(', ')}`);
  }
  const collected = privacy.NSPrivacyCollectedDataTypes ?? [];
  const seen = new Set();
  for (const item of collected) {
    const type = item.NSPrivacyCollectedDataType;
    seen.add(type);
    if (!(type in DECLARED_DATA)) {
      problems.push(`${type} is collected but not in the data inventory`);
      continue;
    }
    if (item.NSPrivacyCollectedDataTypeLinked !== true) {
      problems.push(`${type} is not declared linked to the account`);
    }
    if (item.NSPrivacyCollectedDataTypeTracking !== false) {
      problems.push(`${type} is not declared without tracking`);
    }
    const purposes = [...(item.NSPrivacyCollectedDataTypePurposes ?? [])].sort();
    const declared = [...DECLARED_DATA[type]].sort();
    if (purposes.join() !== declared.join()) {
      problems.push(`${type} is collected for ${purposes.join(', ') || 'nothing'}, the inventory says ${declared.join(', ')}`);
    }
  }
  for (const type of Object.keys(DECLARED_DATA)) {
    if (!seen.has(type)) {
      problems.push(`${type} is in the data inventory but not in the manifest`);
    }
  }
  return problems;
}

/** What is wrong with the app's Info.plist, parsed: usage descriptions and the encryption answer. */
function infoPlistProblems(info) {
  const problems = Object.keys(info)
    .filter(key => /UsageDescription$/.test(key))
    .map(key => `${key} asks for a permission the app never uses ("${info[key]}")`);
  if (info.ITSAppUsesNonExemptEncryption !== false) {
    problems.push('ITSAppUsesNonExemptEncryption is not false (docs/store-listing.md answers export compliance with it)');
  }
  return problems;
}

/** The permissions a merged Android manifest grants, leaving out those it removes. */
function permissionsOf(manifest) {
  const tags = manifest.match(/<uses-permission(?:-sdk-23)?\b[^>]*>/g) ?? [];
  return [
    ...new Set(
      tags
        .filter(tag => !/tools:node\s*=\s*"remove"/.test(tag))
        .map(tag => (tag.match(/android:name\s*=\s*"([^"]+)"/) ?? [])[1])
        .filter(Boolean)
    )
  ].sort();
}

/** The permissions nobody explained, and the one notifications cannot work without. */
function permissionProblems(permissions) {
  const problems = permissions
    .filter(name => !(name in ANDROID_PERMISSIONS) && !OWN_PERMISSION.test(name))
    .map(name => `${name} is in the release manifest and docs/privacy-and-store.md does not explain it`);
  if (!permissions.includes('android.permission.POST_NOTIFICATIONS')) {
    problems.push('android.permission.POST_NOTIFICATIONS is missing: notifications could not be asked for');
  }
  return problems;
}

module.exports = {
  DECLARED_DATA,
  ANDROID_PERMISSIONS,
  privacyProblems,
  infoPlistProblems,
  permissionsOf,
  permissionProblems
};

if (require.main === module) {
  const plist = require('@expo/plist').default;
  const root = path.resolve(process.argv[2] || '.');
  const iosFiles = filesUnder(path.join(root, 'ios'));
  const one = (files, what) => {
    if (files.length !== 1) {
      console.error(`${what}: expected one, found ${files.length}${files.length ? ` (${files.join(', ')})` : ''}`);
      process.exit(1);
    }
    return files[0];
  };
  const privacyFile = one(
    iosFiles.filter(file => path.basename(file) === 'PrivacyInfo.xcprivacy'),
    "the app's PrivacyInfo.xcprivacy"
  );
  const infoFile = path.join(path.dirname(privacyFile), 'Info.plist');
  const manifestFile = one(
    filesUnder(path.join(root, 'android', 'app', 'build', 'intermediates')).filter(
      file => path.basename(file) === 'AndroidManifest.xml' && /merged_manifest[^/]*\/release\//.test(file)
    ),
    'the merged release AndroidManifest.xml'
  );
  const privacy = plist.parse(fs.readFileSync(privacyFile, 'utf8'));
  const info = plist.parse(fs.readFileSync(infoFile, 'utf8'));
  const permissions = permissionsOf(fs.readFileSync(manifestFile, 'utf8'));
  const why = name => ANDROID_PERMISSIONS[name] ?? (OWN_PERMISSION.test(name) ? "the app's own receivers (AndroidX)" : 'unexplained');
  const lines = [
    `iOS PrivacyInfo.xcprivacy (${path.relative(root, privacyFile)}): tracking ${privacy.NSPrivacyTracking}, ` +
      `collected ${(privacy.NSPrivacyCollectedDataTypes ?? []).map(item => item.NSPrivacyCollectedDataType.replace('NSPrivacyCollectedDataType', '')).join(', ')}; ` +
      `required-reason APIs declared by the app: ${(privacy.NSPrivacyAccessedAPITypes ?? []).map(item => item.NSPrivacyAccessedAPIType).join(', ') || 'none'}`,
    `iOS Info.plist: usage descriptions ${Object.keys(info).filter(key => /UsageDescription$/.test(key)).join(', ') || 'none'}; ` +
      `ITSAppUsesNonExemptEncryption ${info.ITSAppUsesNonExemptEncryption}; UIBackgroundModes ${(info.UIBackgroundModes ?? []).join(', ') || 'none'}`,
    '',
    '| Android permission (merged release manifest) | Why |',
    '|---|---|',
    ...permissions.map(name => `| ${name} | ${why(name)} |`)
  ];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Release manifests (M-052)\n\n${lines.join('\n')}\n`);
  }
  const problems = [...privacyProblems(privacy), ...infoPlistProblems(info), ...permissionProblems(permissions)];
  if (problems.length) {
    problems.forEach(problem => console.error(problem));
    process.exit(1);
  }
}
