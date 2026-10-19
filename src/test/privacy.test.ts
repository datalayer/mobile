/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import appConfig from '../../app.config';
import { STORE_LINKS } from '../config/resources';

describe('mobile privacy and store declarations', () => {
  it('publishes HTTPS privacy, support and account-deletion destinations', () => {
    expect(Object.values(STORE_LINKS)).toHaveLength(3);
    for (const destination of Object.values(STORE_LINKS)) {
      const url = new URL(destination);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('datalayer.ai');
    }
  });

  it('declares functionality data as linked but never tracking', () => {
    const config = appConfig({ config: {} } as Parameters<typeof appConfig>[0]);
    const privacy = config.ios?.privacyManifests;
    expect(privacy?.NSPrivacyTracking).toBe(false);
    expect(privacy?.NSPrivacyTrackingDomains).toEqual([]);
    expect(privacy?.NSPrivacyCollectedDataTypes?.map((item) => item.NSPrivacyCollectedDataType)).toEqual([
      'NSPrivacyCollectedDataTypeUserID',
      'NSPrivacyCollectedDataTypeDeviceID',
      'NSPrivacyCollectedDataTypeProductInteraction',
      'NSPrivacyCollectedDataTypeOtherUserContent',
      'NSPrivacyCollectedDataTypePerformanceData'
    ]);
    // Conversation health is the one analytics use: performance data, never content.
    const [performance] = (privacy?.NSPrivacyCollectedDataTypes ?? []).slice(-1);
    expect(performance).toMatchObject({
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality', 'NSPrivacyCollectedDataTypePurposeAnalytics']
    });
    for (const item of (privacy?.NSPrivacyCollectedDataTypes ?? []).slice(0, -1)) {
      expect(item).toMatchObject({
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
      });
    }
  });
});
