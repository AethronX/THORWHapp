import { buildBackup, csvCell, minorToDecimal, toCsv } from '../src/domain/backup';

test('CSV: BOM, quoting, CRLF, formula injection guard', () => {
  expect(csvCell('لولو')).toBe('لولو');
  expect(csvCell('a,b')).toBe('"a,b"');
  expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
  expect(csvCell(-5)).toBe('-5'); // numbers are not "formulas"
  expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('﻿a,b\r\n1,"x,y"\r\n');
});

test('amounts as plain decimals per currency exponent', () => {
  expect(minorToDecimal(12500, 3)).toBe('12.500');
  expect(minorToDecimal(5, 3)).toBe('0.005');
  expect(minorToDecimal(-150000, 3)).toBe('-150.000');
  expect(minorToDecimal(1999, 2)).toBe('19.99');
  expect(minorToDecimal(42, 0)).toBe('42');
});

test('backup envelope', () => {
  const b = buildBackup({ schemaVersion: 2, now: new Date(Date.UTC(2026, 9, 10, 8)), tables: { expenses: [{ id: 1 }] } });
  expect(b).toEqual({ app: 'tharwati', format: 1, schemaVersion: 2, exportedAt: '2026-10-10T08:00:00.000Z', tables: { expenses: [{ id: 1 }] } });
});
