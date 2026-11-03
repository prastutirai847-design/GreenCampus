import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { classNames } from '../../utils/format.js';

export function DataTable({
  columns,
  rows,
  getRowId = (row, index) => row?.id ?? index,
  pageSize,
  emptyState,
  className,
  tableClassName,
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rows.length, pageSize]);

  if (!rows.length) {
    return <div className={className}>{emptyState}</div>;
  }

  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages - 1);
  const visibleRows = pageSize
    ? rows.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
    : rows;
  const start = pageSize ? currentPage * pageSize + 1 : 1;
  const end = pageSize ? Math.min(rows.length, (currentPage + 1) * pageSize) : rows.length;

  return (
    <div className={className}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className={classNames('tabular w-full min-w-[640px] border-collapse text-left', tableClassName)}>
          <thead>
            <tr className="border-b border-line bg-sand-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={classNames(
                    'whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibleRows.map((row, index) => (
              <tr key={getRowId(row, index)} className="transition-colors hover:bg-sand-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={classNames(
                      'px-4 py-3.5 align-middle text-sm text-ink-700',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      column.className,
                    )}
                  >
                    {column.render ? column.render(row, index) : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && rows.length > pageSize ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-xs text-ink-400">
            Showing <span className="font-medium text-ink-700">{start}–{end}</span> of{' '}
            <span className="font-medium text-ink-700">{rows.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-500 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-xs text-ink-500">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-500 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
