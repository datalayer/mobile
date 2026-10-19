/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { EYES_VIEW, eyesGeometry } from '@datalayer/primer-addons/lib/theme/portable';
import { DEFAULT_APP_EMOJI, faceFor, faceIndexOf, listedFaceOf } from '../api/faces';
import { ovalStyle } from '../identity/Eyes';

describe('application faces', () => {
  const index = faceIndexOf([
    { uid: 'app-1', name_t: 'Inbox Triage', face_s: JSON.stringify({ id: 'inbox-triage', emoji: '\u{1F4EC}' }) },
    { uid: 'app-2', name_t: 'Digest', face_s: JSON.stringify({ emoji: DEFAULT_APP_EMOJI }) },
    { uid: 'app-3', name_t: 'Broken', face_s: '{not json' },
    { name_t: 'No uid' }
  ]);

  it('reads the face Spacer keeps beside each app', () => {
    expect(index.byUid.get('app-1')).toEqual({ id: 'inbox-triage', name: 'Inbox Triage', emoji: '\u{1F4EC}', avatar: '' });
    expect(index.byUid.size).toBe(3);
  });

  it('draws the eyes, never the emoji, for an application that has not chosen a face', () => {
    expect(index.byUid.get('app-2')!.emoji).toBe('');
  });

  it('keeps a malformed face from breaking the list', () => {
    expect(listedFaceOf('{not json')).toEqual({});
    expect(index.byUid.get('app-3')!.emoji).toBe('');
  });

  it('finds the face of the application an approval names, by uid or agent', () => {
    expect(faceFor(index, { appUid: 'app-1' })?.name).toBe('Inbox Triage');
    expect(faceFor(index, { agentId: ' Inbox-Triage ' })?.name).toBe('Inbox Triage');
    expect(faceFor(index, { agentId: 'someone-else' })).toBeUndefined();
  });
});

describe('the Datalayer eyes, drawn natively', () => {
  it('turns an ellipse into a stretched circle centred where the geometry says', () => {
    const { eyes } = eyesGeometry('ahead');
    const scale = 20 / EYES_VIEW.height;
    const style = ovalStyle(eyes[0], scale, '#000');
    const width = style.width as number;
    expect(width).toBeCloseTo(eyes[0].rx * 2 * scale);
    expect((style.left as number) + width / 2).toBeCloseTo(eyes[0].cx * scale);
    expect((style.top as number) + width / 2).toBeCloseTo(eyes[0].cy * scale);
    expect(style.transform).toEqual([{ scaleY: eyes[0].ry / eyes[0].rx }]);
  });
});
