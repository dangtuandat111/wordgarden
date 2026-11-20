import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateFilterError, emptyDateFilter, matchesDateFilter, recentDays, type DateFilter } from '../src/lib/date-filter';

const entry = { createdAt: new Date(2026, 10, 20, 23, 59).toISOString(), reviewedAt: null as string | null };
const range = (from: string, to: string): DateFilter => ({ ...emptyDateFilter(), from, to });
test('local inclusive dates and open-ended ranges', () => {
  assert.ok(matchesDateFilter(entry, range('2026-11-20', '2026-11-20')));
  assert.ok(matchesDateFilter(entry, range('', '2026-11-20')));
  assert.ok(matchesDateFilter(entry, range('2026-11-20', '')));
  assert.equal(matchesDateFilter(entry, range('2026-11-21', '')), false);
  assert.equal(matchesDateFilter(entry, range('', '2026-11-19')), false);
});
test('last-review ranges exclude null and follow updated review timestamps', () => {
  const filter: DateFilter = { ...range('2026-11-20', '2026-11-20'), field: 'reviewedAt' };
  assert.equal(matchesDateFilter(entry, filter), false);
  assert.ok(matchesDateFilter({ ...entry, reviewedAt: entry.createdAt }, filter));
  assert.equal(matchesDateFilter({ ...entry, reviewedAt: new Date(2026, 10, 21).toISOString() }, filter), false);
  assert.ok(matchesDateFilter(entry, { ...filter, mode: 'unreviewed' }));
  assert.equal(matchesDateFilter({ ...entry, reviewedAt: entry.createdAt }, { ...filter, mode: 'unreviewed' }), false);
  assert.ok(matchesDateFilter(entry, emptyDateFilter()));
});
test('invalid ranges match nothing; never-reviewed ignores range', () => {
  const filter = range('2026-12-01', '2026-11-01');
  assert.ok(dateFilterError(filter));
  assert.equal(matchesDateFilter(entry, filter), false);
  assert.ok(matchesDateFilter(entry, { ...filter, field: 'reviewedAt', mode: 'unreviewed' }));
});
test('calendar presets include today across year, leap month and DST boundaries', () => {
  assert.deepEqual(recentDays(1, new Date(2026, 0, 2)), { from: '2026-01-02', to: '2026-01-02' });
  assert.deepEqual(recentDays(7, new Date(2026, 0, 2)), { from: '2025-12-27', to: '2026-01-02' });
  assert.deepEqual(recentDays(30, new Date(2024, 2, 1)), { from: '2024-02-01', to: '2024-03-01' });
  assert.deepEqual(recentDays(7, new Date(2026, 2, 10)), { from: '2026-03-04', to: '2026-03-10' });
});
