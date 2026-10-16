// #15: popover gộp bộ lọc "Của tôi" + khoảng thời gian vào 1 nút (giữ toolbar gọn).
import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, UserRound, CalendarRange, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/format';

export default function FilterPopover() {
  const { t } = useTranslation();
  const {
    onlyMine, rangeStart, rangeEnd, currentUser,
    setOnlyMine, setRangeStart, setRangeEnd, clearRange,
  } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = (onlyMine ? 1 : 0) + (rangeStart || rangeEnd ? 1 : 0);
  const hasFilters = activeCount > 0;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors
          ${hasFilters
            ? 'bg-ink text-white border-ink shadow-sm'
            : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700'}`}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> {t('filter.button')}
        {hasFilters && (
          <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-ink text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1.5 right-0 w-[320px] bg-white border border-stone-200
                        rounded-xl shadow-lg shadow-black/[0.06] p-3 space-y-3">
          {/* Của tôi */}
          <button onClick={() => currentUser && setOnlyMine(!onlyMine)}
            disabled={!currentUser}
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors
              ${onlyMine ? 'bg-ink/[0.04]' : 'hover:bg-stone-50'}
              ${!currentUser ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <UserRound className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-ink">{t('filter.onlyMine')}</div>
              <div className="text-[10px] text-stone-400 font-light">{t('filter.onlyMineHint')}</div>
            </div>
            <div className={`w-9 h-5 rounded-full flex items-center transition-colors flex-shrink-0
              ${onlyMine ? 'bg-ink' : 'bg-stone-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform
                ${onlyMine ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <div className="h-px bg-stone-100" />

          {/* Khoảng thời gian */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <CalendarRange className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('filter.dateRange')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="date" value={rangeStart ?? ''}
                onChange={e => {
                  const v = e.target.value || null;
                  if (v && rangeEnd && v > rangeEnd) { setRangeStart(rangeEnd); setRangeEnd(v); }
                  else setRangeStart(v);
                }}
                className="flex-1 min-w-0 bg-white border border-stone-200 rounded-md px-2 py-1.5 text-xs text-stone-700
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
              <span className="text-stone-300 text-xs flex-shrink-0">–</span>
              <input type="date" value={rangeEnd ?? ''}
                onChange={e => {
                  const v = e.target.value || null;
                  if (v && rangeStart && v < rangeStart) { setRangeEnd(rangeStart); setRangeStart(v); }
                  else setRangeEnd(v);
                }}
                className="flex-1 min-w-0 bg-white border border-stone-200 rounded-md px-2 py-1.5 text-xs text-stone-700
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
            </div>
            {(rangeStart || rangeEnd) && (
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-stone-400 font-light">
                  {rangeStart ? formatDate(rangeStart) : '…'} → {rangeEnd ? formatDate(rangeEnd) : '…'}
                </span>
                <button onClick={clearRange}
                  className="flex items-center gap-1 text-[10px] font-semibold text-stone-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" /> {t('filter.clearRange')}
                </button>
              </div>
            )}
          </div>

          {hasFilters && (
            <button onClick={() => { setOnlyMine(false); clearRange(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-stone-500
                         hover:text-ink border-t border-stone-100 pt-2.5 transition-colors">
              <Check className="w-3.5 h-3.5" /> {t('filter.clearAll')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
