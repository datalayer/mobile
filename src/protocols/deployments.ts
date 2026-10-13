/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Safe protocol capabilities already projected by ai-agents on a deployment. */

export type DeploymentProtocols = {
  known: boolean;
  protocols: string[];
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

/** `null` means the server did not supply a usable projection; the phone never guesses. */
export function deploymentProtocolsOf(raw: unknown): DeploymentProtocols | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof (raw as Record<string, unknown>).known !== 'boolean') {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const endpoints = Array.isArray(value.endpoints) ? value.endpoints : [];
  return {
    known: value.known as boolean,
    protocols: strings(value.protocols),
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

export function protocolLinesOf(protocols: DeploymentProtocols | null): string[] {
  if (!protocols || !protocols.known) return ['What this version speaks is not known.'];
  const lines = [
    protocols.protocols.length
      ? protocols.protocols.map(item => PROTOCOL_NAMES[item] ?? `${item} (unknown)`).join(', ')
      : 'No agent protocol declared.',
    protocols.company ? 'Runs as a company over PAP.' : '',
    protocols.companies.length ? `Companies: ${protocols.companies.join(', ')}` : '',
    protocols.businesses.length ? `Businesses: ${protocols.businesses.join(', ')}` : '',
    protocols.signsRequests ? 'Requests to companies and businesses are signed by Datalayer.' : ''
  ];
  return lines.filter(Boolean);
}
