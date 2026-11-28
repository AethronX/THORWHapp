/**
 * Manual export — pure, tested (__tests__/backup.test.ts).
 * - JSON: every table as stored (integer minor units), with format/schema
 *   versions, so a future "restore" can read it.
 * - CSV of expenses for Excel/Sheets: UTF-8 with BOM (Arabic shows
 *   correctly in Excel), RFC 4180 quoting, amounts as plain decimals.
 */
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: 'tharwati';
  format: number;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export function buildBackup(args: { schemaVersion: number; now: Date; tables: Record<string, Record<string, unknown>[]> }): BackupFile {
  return { app: 'tharwati', format: BACKUP_FORMAT, schemaVersion: args.schemaVersion, exportedAt: args.now.toISOString(), tables: args.tables };
}

/** RFC 4180: quote when needed, double inner quotes. Formula-like cells are prefixed with ' (CSV injection). */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** 12500 with exponent 3 → "12.500"; negative kept. */
export function minorToDecimal(minor: number, exponent: number): string {
  if (exponent === 0) return String(minor);
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const per = 10 ** exponent;
  return `${neg ? '-' : ''}${Math.floor(abs / per)}.${String(abs % per).padStart(exponent, '0')}`;
}

// -- restore (D-058) ------------------------------------------------------------

/** Tables a backup may contain, parent tables first (the order rows are written back in). */
export const BACKUP_TABLES = ['settings', 'categories', 'expenses', 'incomes', 'budgets', 'goals', 'goal_contributions', 'debts', 'debt_payments', 'assets'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupRow = Record<string, string | number | null>;

export type ParsedBackup =
  | { ok: true; schemaVersion: number; exportedAt: string; tables: Partial<Record<BackupTable, BackupRow[]>>; counts: Record<BackupTable, number> }
  | { ok: false; reason: 'notJson' | 'notTharwati' | 'unknownFormat' | 'newerSchema' | 'malformed' };

/** A column name we will ever put into SQL: lower-case letters, digits and underscores only. */
const SAFE_COLUMN = /^[a-z][a-z0-9_]{0,40}$/;

/**
 * Reads a backup file WITHOUT trusting it (D-058).
 *
 * The file can come from anywhere — another app, an edited copy, a message —
 * so nothing in it reaches the database until it has passed every check here:
 * it must be ours, in a format we know, from a schema no newer than this app;
 * tables must be ones we have; every column name must be a plain identifier
 * (column names end up in SQL, so this is the injection guard); every value
 * must be a string, a number or null; and every amount must be a safe integer,
 * because money is stored in minor units and a fraction or a huge number there
 * is a corrupt file, not data.
 */
export function parseBackup(text: string, currentSchemaVersion: number): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'malformed' };
  const f = raw as Record<string, unknown>;
  if (f.app !== 'tharwati') return { ok: false, reason: 'notTharwati' };
  if (f.format !== BACKUP_FORMAT) return { ok: false, reason: 'unknownFormat' };
  if (typeof f.schemaVersion !== 'number' || !Number.isInteger(f.schemaVersion) || f.schemaVersion < 1) return { ok: false, reason: 'malformed' };
  if (f.schemaVersion > currentSchemaVersion) return { ok: false, reason: 'newerSchema' };
  if (!f.tables || typeof f.tables !== 'object' || Array.isArray(f.tables)) return { ok: false, reason: 'malformed' };

  const tables: Partial<Record<BackupTable, BackupRow[]>> = {};
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, 0])) as Record<BackupTable, number>;
  for (const [name, rows] of Object.entries(f.tables as Record<string, unknown>)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(name)) return { ok: false, reason: 'malformed' };
    if (!Array.isArray(rows)) return { ok: false, reason: 'malformed' };
    const clean: BackupRow[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return { ok: false, reason: 'malformed' };
      const out: BackupRow = {};
      for (const [col, v] of Object.entries(row as Record<string, unknown>)) {
        if (!SAFE_COLUMN.test(col)) return { ok: false, reason: 'malformed' };
        if (v !== null && typeof v !== 'string' && typeof v !== 'number') return { ok: false, reason: 'malformed' };
        if (typeof v === 'number' && !Number.isFinite(v)) return { ok: false, reason: 'malformed' };
        if (col.endsWith('_minor') && (typeof v !== 'number' || !Number.isSafeInteger(v))) return { ok: false, reason: 'malformed' };
        out[col] = v;
      }
      clean.push(out);
    }
    tables[name as BackupTable] = clean;
    counts[name as BackupTable] = clean.length;
  }
  return { ok: true, schemaVersion: f.schemaVersion, exportedAt: typeof f.exportedAt === 'string' ? f.exportedAt : '', tables, counts };
}
