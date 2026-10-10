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
