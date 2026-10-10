import { File, Paths } from 'expo-file-system';
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

export function shareExpensesCsv(args: {
  tables: Record<string, Record<string, unknown>[]>;
  currency: Currency;
  header: string[];
  categoryName: (id: number) => string;
  now: Date;
  title: string;
}) {
  const rows = (args.tables.expenses ?? [])
    .map((e) => [String(e.day), args.categoryName(Number(e.category_id)), minorToDecimal(Number(e.amount_minor), args.currency.exponent), args.currency.code, String(e.note ?? '')])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return shareFile(`tharwati-expenses-${stamp(args.now)}.csv`, toCsv(args.header, rows), 'text/csv', 'public.comma-separated-values-text', args.title);
}
