import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import type { Currency } from '../core/currency';
import { SCHEMA_VERSION } from '../data/schema';
import { buildBackup, minorToDecimal, toCsv } from '../domain/backup';

/** Write `content` to a cache file and open the system share sheet. Returns false if sharing is unavailable. */
async function shareFile(name: string, content: string, mimeType: string, uti: string, title: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: title });
  return true;
}

const stamp = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function shareJsonBackup(tables: Record<string, Record<string, unknown>[]>, now: Date, title: string) {
  const json = JSON.stringify(buildBackup({ schemaVersion: SCHEMA_VERSION, now, tables }), null, 2);
  return shareFile(`tharwati-backup-${stamp(now)}.json`, json, 'application/json', 'public.json', title);
}

export function shareExpensesCsv(args: { tables: Record<string, Record<string, unknown>[]>; currency: Currency; header: string[]; categoryName: (id: number) => string; now: Date; title: string }) {
  const rows = (args.tables.expenses ?? [])
    .map((e) => [String(e.day), args.categoryName(Number(e.category_id)), minorToDecimal(Number(e.amount_minor), args.currency.exponent), args.currency.code, String(e.note ?? '')])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return shareFile(`tharwati-expenses-${stamp(args.now)}.csv`, toCsv(args.header, rows), 'text/csv', 'public.comma-separated-values-text', args.title);
}

/**
 * Lets the user pick a backup file and returns its text, or null if they
 * cancelled. Reading only: validation and the write happen in the controller
 * (D-058), so the picker never decides whether a file is trustworthy.
 */
export async function pickBackupText(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.[0]) return null;
  return new File(r.assets[0].uri).text();
}
