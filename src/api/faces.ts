/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The faces of the person's applications, as Spacer keeps them beside each
 * app item (`face_s`) — the listing the web's `appFaces` reads.
 * One listing answers every line: indexed by app uid and by the agent id an
 * approval names.
 */

import type { Client } from './client';
import { type Raw, records, text } from './fields';

/** The emoji an application has until it chooses one; drawn as the Datalayer eyes, never typed. */
export const DEFAULT_APP_EMOJI = '\u{1F440}';

export type AppFace = {
  /** Its Appspec id: the agent its approvals name. */
  id: string;
  name: string;
  /** Empty when it shows the default eyes. */
  emoji: string;
  /** A drawing of the web's avatar set, by name; mobile shows the emoji or the eyes meanwhile. */
  avatar: string;
};

export type FaceIndex = {
  byUid: ReadonlyMap<string, AppFace>;
  byAgent: ReadonlyMap<string, AppFace>;
};

export const EMPTY_FACES: FaceIndex = { byUid: new Map(), byAgent: new Map() };

/** `face_s` is JSON; a malformed one is no face rather than a broken list. */
export function listedFaceOf(value: unknown): Partial<AppFace> {
  if (typeof value !== 'string' || !value) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const raw = parsed as Raw;
    return { id: text(raw.id), emoji: text(raw.emoji), avatar: text(raw.avatar) };
  } catch {
    return {};
  }
}

const agentKey = (id: string): string => id.trim().toLowerCase();

export function faceIndexOf(items: readonly Raw[]): FaceIndex {
  const byUid = new Map<string, AppFace>();
  const byAgent = new Map<string, AppFace>();
  for (const item of items) {
    const uid = text(item.uid) || text(item.id);
    if (!uid) {
      continue;
    }
    const listed = listedFaceOf(item.face_s);
    const emoji = listed.emoji && listed.emoji !== DEFAULT_APP_EMOJI ? listed.emoji : '';
    const face: AppFace = {
      id: listed.id ?? '',
      name: text(item.name_t) || text(item.name),
      emoji,
      avatar: listed.avatar ?? ''
    };
    byUid.set(uid, face);
    if (face.id) {
      byAgent.set(agentKey(face.id), face);
    }
  }
  return { byUid, byAgent };
}

/** The face of the application a line names, if it is one of the person's. */
export function faceFor(index: FaceIndex, names: { appUid?: unknown; agentId?: unknown }): AppFace | undefined {
  if (typeof names.appUid === 'string' && names.appUid) {
    const face = index.byUid.get(names.appUid);
    if (face) {
      return face;
    }
  }
  if (typeof names.agentId === 'string' && names.agentId.trim()) {
    return index.byAgent.get(agentKey(names.agentId));
  }
  return undefined;
}

export async function listFaces(client: Client): Promise<FaceIndex> {
  const body = await client('/api/spacer/v1/spaces/items/types/app');
  return faceIndexOf(records(body.items));
}
