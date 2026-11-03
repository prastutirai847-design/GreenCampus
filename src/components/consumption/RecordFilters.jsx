import { Search, X } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { inputClasses } from '../ui/styles.js';
import { monthLabel } from '../../utils/dates.js';

export function RecordFilters({
  search,
  onSearchChange,
  buildingId,
  onBuildingChange,
  period,
  onPeriodChange,
  buildings,
  periods,
  showUnassigned = false,
  showBuilding = true,
  filtersActive,
  onClear,
  resultCount,
  totalCount,
  searchPlaceholder = 'Search notes, provider, department…',
}) {
  return (
    <div className="border-t border-line bg-sand-50/60 px-5 py-4">
      <div
        className={
          showBuilding
            ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_190px_auto]'
            : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_auto]'
        }
      >
        <div>
          <label
            htmlFor="record-search"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400"
          >
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              id="record-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={inputClasses(false, 'pl-9')}
            />
          </div>
        </div>

        {showBuilding ? (
          <div>
            <label
              htmlFor="record-building"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400"
            >
              Building
            </label>
            <select
              id="record-building"
              value={buildingId}
              onChange={(event) => onBuildingChange(event.target.value)}
              className={inputClasses(false)}
            >
              <option value="all">All buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
              {showUnassigned ? <option value="__none">No building assigned</option> : null}
            </select>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="record-period"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400"
          >
            Reporting period
          </label>
          <select
            id="record-period"
            value={period}
            onChange={(event) => onPeriodChange(event.target.value)}
            className={inputClasses(false)}
          >
            <option value="all">All periods</option>
            {periods.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!filtersActive}
            className="w-full sm:w-auto"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-400" aria-live="polite">
        Showing <span className="font-medium text-ink-700">{resultCount}</span> of{' '}
        <span className="font-medium text-ink-700">{totalCount}</span> records
        {filtersActive ? ' with the current filters' : ''}.
      </p>
    </div>
  );
}
