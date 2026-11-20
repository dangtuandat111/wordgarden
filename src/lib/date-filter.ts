export type DateFilter = { field: 'createdAt' | 'reviewedAt'; mode: 'range' | 'unreviewed'; from: string; to: string };
export const emptyDateFilter = (): DateFilter => ({ field: 'createdAt', mode: 'range', from: '', to: '' });
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function recentDays(days: 1 | 7 | 30, now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return { from: localDay(start), to: localDay(now) };
}
export function dateFilterError(filter: DateFilter): string {
  return filter.mode === 'range' && filter.from && filter.to && filter.from > filter.to
    ? 'Từ ngày phải trước hoặc bằng Đến ngày.' : '';
}
export function matchesDateFilter(entry: { createdAt: string; reviewedAt: string | null }, filter: DateFilter): boolean {
  if (dateFilterError(filter)) return false;
  if (filter.field === 'reviewedAt' && filter.mode === 'unreviewed') return entry.reviewedAt === null;
  if (!filter.from && !filter.to) return true;
  const value = entry[filter.field];
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const day = localDay(date);
  return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
}
