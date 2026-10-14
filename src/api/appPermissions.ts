/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Read-only rules and permissions from the exact Appspec version a deployment runs (M-044). */

import type { Client } from './client';
import { record, records, segment, text, type Raw } from './fields';

export type RunningPermissions = {
  known: boolean;
  version: number;
  rules: string[];
  permissions: string[];
  problem: string;
};

const BEHAVIOURS: Record<string, string> = {
  do_it: 'does it without asking',
  if_asked: 'does it only when approved in advance',
  ask_first: 'asks first',
  leave_to_me: 'leaves it to the person'
};

const safeName = (value: unknown): string => {
  const found = text(value).trim();
  return found && found.length <= 256 && !/[\r\n]/.test(found) ? found : '';
};

const strings = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const found = value.map(safeName);
  return found.every(Boolean) ? found : value.length === 0 ? [] : null;
};

const parseModel = (item: Raw, expected: 'app' | 'appversion'): { spec: Raw; revision: number } | null => {
  if (item.type_s !== expected || typeof item.model_s !== 'string') return null;
  try {
    const stored = JSON.parse(item.model_s) as unknown;
    const value = record(stored);
    const state = record(value.state);
    const revision = Number(state.revision);
    if (value.format !== 'loop.app.item/v1' || !value.spec || !Number.isInteger(revision) || revision < 1) return null;
    return { spec: record(value.spec), revision };
  } catch {
    return null;
  }
};

const documentOf = (body: Raw): Raw => record(body.document);

const versionOfItem = (item: Raw): { appUid: string; version: number } | null => {
  if (typeof item.metadata_s !== 'string') return null;
  try {
    const metadata = record(JSON.parse(item.metadata_s));
    const version = Number(metadata.version);
    return typeof metadata.app === 'string' && Number.isInteger(version) && version > 0
      ? { appUid: metadata.app, version }
      : null;
  } catch {
    return null;
  }
};

async function exactSpec(client: Client, appUid: string, version: number): Promise<Raw | null> {
  const current = parseModel(documentOf(await client(`/api/spacer/v1/lexicals/${segment(appUid)}`)), 'app');
  if (!current) return null;
  if (current.revision === version) return current.spec;
  if (version > current.revision) return null;
  const listed = await client('/api/spacer/v1/spaces/items/types/appversion');
  const item = records(listed.items).find(candidate => {
    const kept = versionOfItem(candidate);
    return kept?.appUid === appUid && kept.version === version;
  });
  if (!item) return null;
  const kept = parseModel(documentOf(await client(`/api/spacer/v1/lexicals/${segment(text(item.uid))}`)), 'appversion');
  return kept?.revision === version ? kept.spec : null;
}

function ruleLines(spec: Raw): string[] | null {
  if (!Array.isArray(spec.rules)) return null;
  const lines: string[] = [];
  for (const value of spec.rules) {
    const rule = record(value);
    const action = safeName(rule.action);
    const applies = strings(rule.applies_to ?? rule.appliesTo);
    const behaviour = BEHAVIOURS[text(rule.behaviour)];
    if (!action || !applies || !behaviour) return null;
    lines.push(`${action}: ${behaviour}${applies.length ? ` (${applies.join(', ')})` : ''}.`);
  }
  return lines;
}

function permissionLines(spec: Raw): string[] | null {
  if (!Array.isArray(spec.connections) || !Array.isArray(spec.backend_tools ?? spec.backendTools)) return null;
  const permissions = record(spec.permissions);
  if (!Array.isArray(permissions.spaces) || !permissions.computer || typeof permissions.computer !== 'object') return null;
  const lines: string[] = [];
  for (const value of spec.connections) {
    const connection = record(value);
    const server = safeName(connection.server);
    const only = strings(connection.only);
    if (!server || !only || (connection.access !== 'read' && connection.access !== 'write') || (connection.as !== 'owner' && connection.as !== 'user')) return null;
    const restricted = only.length ? `, limited to ${only.join(', ')}` : '';
    lines.push(`${connection.access === 'write' ? 'Reads and writes' : 'Reads'} ${server} as ${connection.as === 'owner' ? 'the owner' : 'each signed-in person'}${restricted}.`);
  }
  for (const tool of (spec.backend_tools ?? spec.backendTools) as unknown[]) {
    const name = safeName(tool);
    if (!name) return null;
    lines.push(`Uses ${name}.`);
  }
  for (const value of permissions.spaces) {
    const space = record(value);
    const name = safeName(space.space);
    if (!name || (space.access !== 'read' && space.access !== 'write')) return null;
    lines.push(`${space.access === 'write' ? 'Reads and writes' : 'Reads'} Space ${name}.`);
  }
  const computer = record(permissions.computer);
  for (const [part, words] of [['browse', 'Browses the web'], ['files', 'Reads and writes files'], ['shell', 'Runs commands']] as const) {
    if (typeof computer[part] !== 'boolean') return null;
    if (computer[part]) lines.push(`${words} on its computer.`);
  }
  const pap = spec.pap === undefined ? null : record(spec.pap);
  if (pap) {
    if (!Array.isArray(pap.connections)) return null;
    for (const value of pap.connections) {
      const connection = record(value);
      const company = safeName(connection.company);
      const scopes = strings(connection.scopes);
      if (!company || !scopes || (connection.access !== 'read' && connection.access !== 'write') || (connection.as !== 'owner' && connection.as !== 'user')) return null;
      lines.push(`${connection.access === 'write' ? 'Reads and changes things' : 'Reads'} at ${company} over PAP for ${connection.as === 'owner' ? 'the owner' : 'each signed-in person'}${scopes.length ? `, asking for ${scopes.join(', ')}` : ''}.`);
    }
  }
  const pact = spec.pact === undefined ? null : record(spec.pact);
  if (pact) {
    if (!Array.isArray(pact.connections)) return null;
    for (const value of pact.connections) {
      const connection = record(value);
      const business = safeName(connection.brand);
      const scopes = strings(connection.scopes);
      if (!business || !scopes || (connection.access !== 'read' && connection.access !== 'write')) return null;
      lines.push(`${connection.access === 'write' ? 'Reads and changes things' : 'Reads'} at ${business} over PACT for each signed-in person${scopes.length ? `, asking for ${scopes.join(', ')}` : ''}.`);
    }
  }
  const commerce = spec.commerce === undefined ? null : record(spec.commerce);
  if (commerce) {
    if (!Array.isArray(commerce.merchants)) return null;
    for (const value of commerce.merchants) {
      const merchant = record(value);
      const domain = safeName(merchant.merchant);
      if (!domain || (merchant.protocol !== 'ucp' && merchant.protocol !== 'acp') || (merchant.access !== 'read' && merchant.access !== 'write')) return null;
      const limit = merchant.limit === undefined ? null : record(merchant.limit);
      if (merchant.access === 'write' && (!limit || !safeName(limit.amount) || !/^[A-Z]{3}$/.test(text(limit.currency)))) return null;
      const spending = limit ? `, at most ${safeName(limit.amount)} ${text(limit.currency)} per purchase` : '';
      lines.push(`${merchant.access === 'write' ? 'Shops and asks before buying' : 'Browses'} at test merchant ${domain} over ${String(merchant.protocol).toUpperCase()}${spending}.`);
    }
  }
  const signedFetch = spec.signed_fetch === undefined ? null : record(spec.signed_fetch);
  if (signedFetch) {
    if (!Array.isArray(signedFetch.sites)) return null;
    for (const value of signedFetch.sites) {
      const site = record(value);
      const domain = safeName(site.site);
      if (!safeName(site.id) || !domain) return null;
      lines.push(`Reads pages at ${domain} with GET only, signing every request with this application's key.`);
    }
  }
  return lines;
}

export async function readRunningPermissions(client: Client, appUid: string, version: number): Promise<RunningPermissions> {
  const spec = await exactSpec(client, appUid, version);
  if (!spec) return { known: false, version, rules: [], permissions: [], problem: 'The exact running version is not available.' };
  const rules = ruleLines(spec);
  const permissions = permissionLines(spec);
  if (!rules || !permissions) {
    return { known: false, version, rules: [], permissions: [], problem: 'This version does not contain a complete rules and permissions projection.' };
  }
  return { known: true, version, rules, permissions, problem: '' };
}
