/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** Reading raw server records defensively: a missing or wrong field is empty, never a crash. */

export type Raw = Record<string, unknown>;

export const text = (value: unknown): string => (typeof value === 'string' ? value : '');

export const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const record = (value: unknown): Raw =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};

export const records = (value: unknown): Raw[] =>
  Array.isArray(value) ? value.filter((item): item is Raw => Boolean(item) && typeof item === 'object') : [];

export const segment = (value: string): string => encodeURIComponent(value);
