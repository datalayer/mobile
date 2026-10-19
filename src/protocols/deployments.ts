/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Safe protocol capabilities already projected by ai-agents on a deployment. */

/** A protocol as the registry says it: the specification version Datalayer implements, its status. */
export type RegistryEntry = { id: string; name: string; version: string; status: string };

/** Whether the identity a deployment acts under is published as a company reads it, checked by the server. */
export type IdentityChecked = {
  checkedAt: string;
  passed: boolean;
  checks: { id: string; says: string; passed: boolean; repair: string }[];
};

export type DeploymentProtocols = {
  known: boolean;
  protocols: string[];
  /** Each protocol's registry entry, as the server says it; never inferred here. */
  registry: RegistryEntry[];
  /**
   * Asked for one application only: the identity checked now; `null` when it
   * acts under none; `undefined` when not asked.
   */
  identity?: IdentityChecked | null;
  companies: string[];
  businesses: string[];
  company: boolean;
  signsRequests: boolean;
  endpoints: { kind: 'discovery' | 'identity' | 'signing_keys'; url: string }[];
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];

const ENDPOINT_KINDS = new Set(['discovery', 'identity', 'signing_keys']);

const PROTOCOL_NAMES: Record<string, string> = {
  mcp: 'MCP',
  a2a: 'A2A',
  pap: 'PAP',
  pact: 'PACT',
  'web-bot-auth': 'Web Bot Auth',
  tap: 'TAP',
  ucp: 'UCP',
  acp: 'ACP',
  'ag-ui': 'AG-UI',
  a2ui: 'A2UI',
  'agent-client-protocol': 'Agent Client Protocol'
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const registryEntryOf = (raw: unknown): RegistryEntry | null => {
  if (!isRecord(raw)) return null;
  const { id, name, version, status } = raw;
  return typeof id === 'string' && id && typeof name === 'string' && typeof version === 'string' && typeof status === 'string' && status
    ? { id, name, version, status }
    : null;
};

/** The server's identity check, or `null` when it is not one the phone can read whole: it is then said unread. */
function identityCheckedOf(raw: unknown): IdentityChecked | null {
  if (!isRecord(raw) || typeof raw.checked_at !== 'string' || typeof raw.passed !== 'boolean' || !Array.isArray(raw.checks)) {
    return null;
  }
  const checks = raw.checks.map(check =>
    isRecord(check) && typeof check.id === 'string' && typeof check.says === 'string' && typeof check.passed === 'boolean'
      ? { id: check.id, says: check.says, passed: check.passed, repair: typeof check.repair === 'string' ? check.repair : '' }
      : null
  );
  if (checks.some(check => check === null)) return null;
  return { checkedAt: raw.checked_at, passed: raw.passed, checks: checks as IdentityChecked['checks'] };
}

/** Said when the server's identity check could not be read whole. */
export const IDENTITY_UNREAD: IdentityChecked = {
  checkedAt: '',
  passed: false,
  checks: [{ id: 'unread', says: 'Its identity check could not be read.', passed: false, repair: 'Refresh to check it again.' }]
};

/** `null` means the server did not supply a usable projection; the phone never guesses. */
export function deploymentProtocolsOf(raw: unknown): DeploymentProtocols | null {
  if (!isRecord(raw) || typeof raw.known !== 'boolean' || !Array.isArray(raw.registry)) {
    return null;
  }
  const value = raw;
  const registry = value.registry as unknown[];
  const entries = registry.map(registryEntryOf);
  if (entries.some(entry => entry === null)) {
    return null;
  }
  const endpoints = Array.isArray(value.endpoints) ? value.endpoints : [];
  return {
    known: value.known as boolean,
    protocols: strings(value.protocols),
    registry: entries as RegistryEntry[],
    ...('identity' in value ? { identity: value.identity === null ? null : (identityCheckedOf(value.identity) ?? IDENTITY_UNREAD) } : {}),
    companies: strings(value.companies),
    businesses: strings(value.businesses),
    company: value.company === true,
    signsRequests: value.signs_requests === true,
    endpoints: endpoints.flatMap(endpoint => {
      if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) return [];
      const { kind, url } = endpoint as Record<string, unknown>;
      return typeof kind === 'string' && ENDPOINT_KINDS.has(kind) && typeof url === 'string' && /^https:\/\//.test(url)
        ? [{ kind: kind as DeploymentProtocols['endpoints'][number]['kind'], url }]
        : [];
    })
  };
}

/** A protocol with its registry's word: `PAP draft 0.1 (shipped)`; one the registry does not hold, said so. */
function registryLine(id: string, registry: RegistryEntry[]): string {
  const entry = registry.find(candidate => candidate.id === id);
  const name = PROTOCOL_NAMES[id] ?? entry?.name ?? id;
  if (!entry) return `${name} (not said by the registry)`;
  if (entry.status === 'unregistered') return `${name} (not in the registry)`;
  return `${name} ${entry.version} (${entry.status})`;
}

/** The identity check in lines: what passed, or each check that did not, said by what to do. */
export function identityLinesOf(identity: IdentityChecked): string[] {
  if (identity.passed) {
    return identity.checks.map(check => check.says);
  }
  return identity.checks.filter(check => !check.passed).map(check => check.repair || check.says);
}

export function protocolLinesOf(protocols: DeploymentProtocols | null): string[] {
  if (!protocols || !protocols.known) return ['What this version speaks is not known.'];
  const lines = [
    protocols.protocols.length ? protocols.protocols.map(item => registryLine(item, protocols.registry)).join(', ') : 'No agent protocol declared.',
    protocols.company ? 'Runs as a company over PAP.' : '',
    protocols.companies.length ? `Companies: ${protocols.companies.join(', ')}` : '',
    protocols.businesses.length ? `Businesses: ${protocols.businesses.join(', ')}` : '',
    protocols.signsRequests ? 'Requests to companies and businesses are signed by Datalayer.' : ''
  ];
  return lines.filter(Boolean);
}
