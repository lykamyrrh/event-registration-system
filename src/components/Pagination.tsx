import React, { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  /** Total number of items in the current (already filtered) set. */
  totalItems: number;
  /** Currently active page, 1-indexed. */
  currentPage: number;
  /** Number of items per page. */
  pageSize: number;
  /** Called when the user picks a different page. */
  onPageChange: (page: number) => void;
  /** Called when the user changes page size. Optional — if omitted, selector is hidden. */
  onPageSizeChange?: (size: number) => void;
  /** When true, all controls are disabled (used while editing a row). */
  disabled?: boolean;
  /** Page size options to display. */
  pageSizeOptions?: number[];
  /** Label shown to the left of the controls, e.g. "delegations". */
  itemLabel?: string;
}

/**
 * Produces a compact list of page numbers with ellipses.
 * e.g. for currentPage=6, totalPages=12 → [1, '…', 5, 6, 7, '…', 12]
 */
const buildPageList = (
  currentPage: number,
  totalPages: number
): (number | 'ellipsis-l' | 'ellipsis-r')[] => {
  const pages: (number | 'ellipsis-l' | 'ellipsis-r')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push('ellipsis-l');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push('ellipsis-r');

  pages.push(totalPages);
  return pages;
};

export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'items'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page if the filtered set shrinks below the current page.
  useEffect(() => {
    if (currentPage > totalPages) onPageChange(totalPages);
  }, [currentPage, totalPages, onPageChange]);

  const pageList = useMemo(
    () => buildPageList(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const firstIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastIndex = Math.min(currentPage * pageSize, totalItems);

  const baseBtn =
    'min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center';

  const navBtn = (active: boolean, isDisabled: boolean) =>
    `${baseBtn} ${
      isDisabled
        ? 'opacity-40 cursor-not-allowed bg-white border-navy-200 text-navy-900/40'
        : active
        ? 'bg-gold-500 border-gold-600 text-navy-950 hover:bg-gold-600 hover:text-white'
        : 'bg-white border-navy-200 text-navy-900 hover:bg-gold-100'
    }`;

  const numberBtn = (active: boolean, isDisabled: boolean) =>
    `${baseBtn} ${
      isDisabled
        ? 'opacity-40 cursor-not-allowed bg-white border-navy-200 text-navy-900/40'
        : active
        ? 'bg-navy-900 border-navy-900 text-white shadow-sm'
        : 'bg-white border-navy-200 text-navy-900 hover:bg-gold-100'
    }`;

  if (totalItems === 0) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-navy-200 rounded-2xl shadow-sm">
        <span className="text-xs text-navy-900/60">
          No {itemLabel} to display.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 bg-white border border-navy-200 rounded-2xl shadow-sm">
      {/* Left: range + page-size selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-navy-900/70">
        <span>
          Showing{' '}
          <span className="font-bold text-navy-900">
            {firstIndex}–{lastIndex}
          </span>{' '}
          of <span className="font-bold text-navy-900">{totalItems}</span>{' '}
          {itemLabel}
        </span>

        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="text-navy-900/60">Per page</span>
            <select
              value={pageSize}
              onChange={e => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              disabled={disabled}
              className={`px-2 py-1 rounded-lg bg-ivory border border-navy-200 text-navy-900 text-xs font-medium focus:border-gold-500 focus:outline-none ${
                disabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Right: nav controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          className={navBtn(false, disabled || currentPage <= 1)}
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pageList.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={`p-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              disabled={disabled}
              className={numberBtn(p === currentPage, disabled)}
              title={`Page ${p}`}
            >
              {p}
            </button>
          ) : (
            <span
              key={`e-${idx}`}
              className="px-1.5 text-navy-900/40 text-xs font-bold select-none"
            >
              …
            </span>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          className={navBtn(false, disabled || currentPage >= totalPages)}
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;