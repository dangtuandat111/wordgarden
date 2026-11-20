'use client';

import { useId } from 'react';
import { dateFilterError, emptyDateFilter, recentDays, type DateFilter } from '@/lib/date-filter';

export function DateFilters({ value, onChange }: { value: DateFilter; onChange: (value: DateFilter) => void }) {
  const errorId = useId();
  const error = dateFilterError(value);
  const unreviewed = value.mode === 'unreviewed';
  return <fieldset className="date-filters no-print">
    <legend>Lọc theo ngày</legend>
    <div className="date-filter-fields">
      <label>Loại ngày<select value={value.field} onChange={e => onChange({ ...value, field: e.target.value as DateFilter['field'], mode: 'range' })}>
        <option value="createdAt">Ngày thêm</option><option value="reviewedAt">Lần ôn cuối</option>
      </select></label>
      <label>Từ ngày<input type="date" value={value.from} disabled={unreviewed} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={e => onChange({ ...value, from: e.target.value })}/></label>
      <label>Đến ngày<input type="date" value={value.to} disabled={unreviewed} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={e => onChange({ ...value, to: e.target.value })}/></label>
    </div>
    <div className="date-filter-presets">
      {([1, 7, 30] as const).map(days => <button type="button" className="filter-pill" key={days} onClick={() => onChange({ ...value, mode: 'range', ...recentDays(days) })}>{days === 1 ? 'Hôm nay' : `${days} ngày qua`}</button>)}
      {value.field === 'reviewedAt' && <button type="button" className={`filter-pill ${unreviewed ? 'selected' : ''}`} aria-pressed={unreviewed} onClick={() => onChange({ ...value, mode: unreviewed ? 'range' : 'unreviewed', from: '', to: '' })}>Chưa ôn</button>}
      <button type="button" className="text-button" onClick={() => onChange(emptyDateFilter())}>Xóa lọc ngày</button>
    </div>
    {error && <p id={errorId} role="alert" className="date-filter-error">{error}</p>}
  </fieldset>;
}
