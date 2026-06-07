import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PHASE_META, PHASE_TAG_META } from '../../types';
import type { PhaseBlock } from '../../types';
import { Search, Plus, X } from 'lucide-react';
import {
  format, parseISO, differenceInDays, addDays, addMonths,
  eachWeekOfInterval, eachMonthOfInterval, startOfQuarter, getQuarter
} from 'date-fns';
import PhaseDetailModal from './PhaseDetailModal';
import CreatePhaseModal from '../Modals/CreatePhaseModal';

const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 52;
const DRAG_THRESHOLD = 4;

// ─── Initial row assignment (greedy, non-overlapping) ───────────────
function assignRows(pbs: PhaseBlock[]): Map<string, number> {
  const rowMap = new Map<string, number>();
  const sorted = [...pbs].sort((a, b) =>
    a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)
  );
  const rowEnds: string[] = [];
  for (const pb of sorted) {
    let assigned = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (pb.startDate >= rowEnds[r]) { assigned = r; break; }
    }
    if (assigned === -1) { assigned = rowEnds.length; rowEnds.push(''); }
    rowEnds[assigned] = pb.endDate;
    rowMap.set(pb.id, assigned);
  }
  return rowMap;
}

// ─── Overlap resolution: push non-dragged blocks right ──────────────
function resolveOverlaps(
  blocks: Array<{ id: string; startDate: string; endDate: string }>,
  dragId?: string
): Map<string, { startDate: string; endDate: string }> {
  const result = new Map<string, { startDate: string; endDate: string }>();
  const sorted = [...blocks].sort((a, b) =>
    a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id)
  );

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const duration = differenceInDays(parseISO(curr.endDate), parseISO(curr.startDate));
    let start = parseISO(curr.startDate);

    if (curr.id !== dragId) {
      for (let j = 0; j < i; j++) {
        const prevEnd = parseISO(result.get(sorted[j].id)!.endDate);
        if (start < prevEnd) start = prevEnd;
      }
    }

    result.set(curr.id, {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(addDays(start, duration), 'yyyy-MM-dd'),
    });
  }
  return result;
}

// ─── Component ──────────────────────────────────────────────────────
export default function PipelineTimeline() {
  const {
    orgProjects, phaseBlocks, searchQuery, statusFilter, zoomLevel,
    selectedProjectIds,
    setSearchQuery, setZoomLevel, openPhaseDetail, openCreatePhase,
    updatePhaseBlock, toggleProjectSelection, selectAllProjects,
  } = useApp();

  const boardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const panScrollLeft = useRef(0);
  const panScrollTop = useRef(0);
  const [hoverPhase, setHoverPhase] = useState<string | null>(null);
  const [manualRows, setManualRows] = useState<Map<string, number>>(new Map());

  // Drag preview state
  const [dragPreview, setDragPreview] = useState<{
    blockId: string;
    projectId: string;
    startDate: string;
    endDate: string;
    row: number;
  } | null>(null);

  // RAF throttle
  const rafRef = useRef(0);
  const pendingPos = useRef<{ dx: number; dy: number } | null>(null);

  // Keep latest layoutMap in ref so drop handler reads current value
  const layoutMapRef = useRef<Map<string, { startDate: string; endDate: string; row: number }>>(new Map());

  // Left panel content ref for transform-based scroll sync
  const leftContentRef = useRef<HTMLDivElement>(null);

  // ─── Filtered projects ────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return orgProjects.filter(p => {
      const ms = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const mst = statusFilter === 'All' || p.status === statusFilter;
      const mproj = selectedProjectIds === null || selectedProjectIds.includes(p.id);
      return ms && mst && mproj;
    });
  }, [orgProjects, searchQuery, statusFilter, selectedProjectIds]);

  // ─── Timeline range ───────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);

  const minDate = useMemo(() => {
    if (phaseBlocks.length === 0) return addDays(today, -30);
    const dates = phaseBlocks.map(pb => parseISO(pb.startDate));
    return addDays(new Date(Math.min(...dates.map(d => d.getTime()))), -14);
  }, [phaseBlocks, today]);

  const maxDate = useMemo(() => {
    if (phaseBlocks.length === 0) return addDays(today, 60);
    const dates = phaseBlocks.map(pb => parseISO(pb.endDate));
    return addDays(new Date(Math.max(...dates.map(d => d.getTime()))), 30);
  }, [phaseBlocks, today]);

  // ─── Columns & widths ─────────────────────────────────────────────
  const { columns, colWidth, totalWidth } = useMemo(() => {
    let cols: Date[] = [], width = 0;
    if (zoomLevel === 'week') {
      cols = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 }); width = 120;
    } else if (zoomLevel === 'month') {
      cols = eachMonthOfInterval({ start: minDate, end: maxDate }); width = 140;
    } else {
      const quarters: Date[] = [];
      let d = startOfQuarter(minDate);
      while (d <= maxDate) { quarters.push(new Date(d)); d = addMonths(d, 3); }
      cols = quarters; width = 260;
    }
    return { columns: cols, colWidth: width, totalWidth: cols.length * width };
  }, [minDate, maxDate, zoomLevel]);

  // ─── Position helpers ─────────────────────────────────────────────
  const getDatePos = useCallback((date: Date) => {
    if (columns.length === 0) return 0;
    if (zoomLevel === 'week') return (differenceInDays(date, columns[0]) / 7) * colWidth;

    // For month & quarter: include day-fraction within the month for precision
    const monthsDiff = (date.getFullYear() - columns[0].getFullYear()) * 12 + (date.getMonth() - columns[0].getMonth());
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const dayFraction = (date.getDate() - 1) / daysInMonth; // 0.0 = 1st, ~1.0 = last day

    if (zoomLevel === 'month') {
      return (monthsDiff + dayFraction) * colWidth;
    }
    // Quarter: each column = 3 months
    return ((monthsDiff + dayFraction) / 3) * colWidth;
  }, [columns, colWidth, zoomLevel]);

  const getPosDate = useCallback((px: number) => {
    if (zoomLevel === 'week') {
      const ratio = px / colWidth;
      return addDays(columns[0], Math.round(ratio * 7));
    }

    if (zoomLevel === 'month') {
      // px → fractional month count → exact date
      const totalMonths = px / colWidth;
      const monthIndex = Math.floor(totalMonths);
      const dayFraction = totalMonths - monthIndex;
      const targetMonth = new Date(columns[0].getFullYear(), columns[0].getMonth() + monthIndex, 1);
      const daysInTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const day = Math.min(Math.max(1, Math.round(dayFraction * daysInTargetMonth) + 1), daysInTargetMonth);
      return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
    }

    // Quarter: each column = 3 months
    const totalMonths = (px / colWidth) * 3;
    const monthIndex = Math.floor(totalMonths);
    const dayFraction = totalMonths - monthIndex;
    const targetMonth = addMonths(columns[0], monthIndex);
    const daysInTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    const day = Math.min(Math.max(1, Math.round(dayFraction * daysInTargetMonth) + 1), daysInTargetMonth);
    return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
  }, [columns, colWidth, zoomLevel]);

  const todayPos = getDatePos(today);

  // ─── Helper: get pbs for a project ───────────────────────
  const getFilteredPbs = useCallback((projectId: string) => {
    return phaseBlocks.filter(pb => pb.projectId === projectId);
  }, [phaseBlocks]);

  // ─── Row indices (auto + manual) ──────────────────────────────────
  const baseRowIndices = useMemo(() => {
    const result = new Map<string, number>();
    for (const project of filteredProjects) {
      assignRows(getFilteredPbs(project.id)).forEach((ri, id) => result.set(id, ri));
    }
    manualRows.forEach((ri, id) => result.set(id, ri));
    return result;
  }, [filteredProjects, getFilteredPbs, manualRows]);

  // ─── Layout: resolves overlaps considering drag preview ───────────
  const layoutMap = useMemo(() => {
    const map = new Map<string, { startDate: string; endDate: string; row: number }>();

    for (const project of filteredProjects) {
      const pbs = getFilteredPbs(project.id);
      type BP = { id: string; startDate: string; endDate: string; row: number };
      const blocks: BP[] = pbs.map(pb => {
        const isDragged = dragPreview?.blockId === pb.id;
        return {
          id: pb.id,
          startDate: isDragged ? dragPreview.startDate : pb.startDate,
          endDate: isDragged ? dragPreview.endDate : pb.endDate,
          row: isDragged ? dragPreview.row : (baseRowIndices.get(pb.id) ?? 0),
        };
      });

      const rows = new Map<number, BP[]>();
      for (const b of blocks) {
        if (!rows.has(b.row)) rows.set(b.row, []);
        rows.get(b.row)!.push(b);
      }

      for (const [_, rowBlocks] of rows) {
        const resolved = resolveOverlaps(rowBlocks, dragPreview?.blockId);
        resolved.forEach((pos, id) => {
          const b = rowBlocks.find(x => x.id === id)!;
          map.set(id, { ...pos, row: b.row });
        });
      }
    }
    return map;
  }, [filteredProjects, getFilteredPbs, baseRowIndices, dragPreview]);
  layoutMapRef.current = layoutMap;

  // ─── Per-project data ─────────────────────────────────────────────
  const projectRowData = useMemo(() => {
    const data = new Map<string, { rowCount: number; pbs: PhaseBlock[] }>();
    for (const project of filteredProjects) {
      const pbs = getFilteredPbs(project.id);
      let rowCount = 1;
      for (const pb of pbs) {
        const pos = layoutMap.get(pb.id);
        if (pos) rowCount = Math.max(rowCount, pos.row + 1);
      }
      data.set(project.id, { rowCount, pbs });
    }
    return data;
  }, [filteredProjects, getFilteredPbs, layoutMap]);

  // ─── Scroll sync (transform-based for left panel) ───
  useEffect(() => {
    const right = boardRef.current, leftContent = leftContentRef.current;
    if (!right || !leftContent) return;
    const onScroll = () => {
      leftContent.style.transform = `translateY(${-right.scrollTop}px)`;
    };
    right.addEventListener('scroll', onScroll);
    return () => right.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Pan (scroll by dragging empty area) ───────────────

  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.phase-block')) return;
    isPanning.current = true;
    panStartX.current = e.clientX;
    panStartY.current = e.clientY;
    panScrollLeft.current = boardRef.current?.scrollLeft || 0;
    panScrollTop.current = boardRef.current?.scrollTop || 0;
  }, []);

  const handleBoardMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !boardRef.current) return;
    boardRef.current.scrollLeft = panScrollLeft.current - (e.clientX - panStartX.current);
    boardRef.current.scrollTop = panScrollTop.current - (e.clientY - panStartY.current);
    boardRef.current.style.cursor = 'grabbing';
  }, []);

  const handleBoardMouseUp = useCallback(() => {
    isPanning.current = false;
    if (boardRef.current) boardRef.current.style.cursor = '';
  }, []);

  // ─── Block drag with preview ──────────────────────────────────────
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, pb: PhaseBlock, projectId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const origRow = baseRowIndices.get(pb.id) ?? 0;
    const duration = differenceInDays(parseISO(pb.endDate), parseISO(pb.startDate));
    const origLeft = getDatePos(parseISO(pb.startDate));
    let hasMoved = false;

    const blockEl = e.currentTarget as HTMLElement;
    const blockRect = blockEl.getBoundingClientRect();

    // Create ghost
    const ghost = blockEl.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.left = blockRect.left + 'px';
    ghost.style.top = blockRect.top + 'px';
    ghost.style.width = blockRect.width + 'px';
    ghost.style.height = blockRect.height + 'px';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
    ghost.style.opacity = '0.92';
    ghost.style.transition = 'none';
    document.body.appendChild(ghost);

    blockEl.style.opacity = '0.15';

    const handleMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!hasMoved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) hasMoved = true;
      if (!hasMoved) return;

      ghost.style.left = (blockRect.left + dx) + 'px';
      ghost.style.top = (blockRect.top + dy) + 'px';

      pendingPos.current = { dx, dy };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const pos = pendingPos.current;
          if (!pos) { rafRef.current = 0; return; }

          const newLeft = origLeft + pos.dx;
          const newStart = getPosDate(Math.max(0, newLeft));
          const newEnd = addDays(newStart, duration);

          const rd = projectRowData.get(projectId);
          const maxRow = rd?.rowCount ?? 1;
          const rowDelta = Math.round(pos.dy / ROW_HEIGHT);
          let newRow = origRow + rowDelta;
          newRow = Math.max(0, Math.min(maxRow, newRow));

          setDragPreview({
            blockId: pb.id,
            projectId,
            startDate: format(newStart, 'yyyy-MM-dd'),
            endDate: format(newEnd, 'yyyy-MM-dd'),
            row: newRow,
          });
          rafRef.current = 0;
        });
      }
    };

    const handleUp = () => {
      ghost.remove();
      blockEl.style.opacity = '';
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;

      if (hasMoved) {
        const currentLayout = layoutMapRef.current;
        const pbs = getFilteredPbs(projectId);
        for (const pb of pbs) {
          const pos = currentLayout.get(pb.id);
          if (pos && (pos.startDate !== pb.startDate || pos.endDate !== pb.endDate)) {
            updatePhaseBlock(pb.id, { startDate: pos.startDate, endDate: pos.endDate });
          }
        }
        setManualRows(prev => {
          const next = new Map(prev);
          for (const pb of pbs) {
            const pos = currentLayout.get(pb.id);
            if (pos) next.set(pb.id, pos.row);
          }
          return next;
        });
      } else {
        openPhaseDetail(pb.id);
      }

      setDragPreview(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [getDatePos, getPosDate, getFilteredPbs, baseRowIndices, projectRowData, updatePhaseBlock, openPhaseDetail]);

  // ─── Scroll to today ──────────────────────────────────────────────
  const hasScrolled = useRef(false);
  useEffect(() => {
    if (boardRef.current && !hasScrolled.current && totalWidth > 0) {
      boardRef.current.scrollLeft = todayPos - (boardRef.current.clientWidth / 3);
      hasScrolled.current = true;
    }
  }, [totalWidth, todayPos, zoomLevel]);

  // ─── Smooth scroll helper ─────────────────────────────────────────
  const smoothScrollTo = useCallback((target: number) => {
    const el = boardRef.current;
    if (!el) return;
    const start = el.scrollLeft;
    const distance = target - start;
    if (Math.abs(distance) < 2) return;
    const duration = 400;
    const startTime = performance.now();
    // ease-in-out cubic
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + distance * ease(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden relative">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-hairline px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-ink">Development Pipeline</h1>
            <span className="text-xs text-stone-400 font-light">{filteredProjects.length} dự án · {phaseBlocks.length} phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input type="text" placeholder="Tìm kiếm dự án..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className={`pl-8 pr-8 py-1.5 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink
                           w-44 transition-all ${searchQuery ? 'border-ink/30 bg-ink/[0.02]' : ''}`} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md
                             bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors">
                  <X className="w-3 h-3 text-stone-500" />
                </button>
              )}
            </div>
            <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
              <button onClick={() => {
                if (!boardRef.current) return;
                const target = todayPos - (boardRef.current.clientWidth / 2);
                smoothScrollTo(target);
              }}
                className="px-2.5 py-1 text-xs font-bold rounded-md text-ink hover:bg-ink/[0.06] transition-colors">
                Hôm nay
              </button>
              <div className="w-px h-4 bg-stone-300 mx-0.5" />
              {(['week', 'month', 'quarter'] as const).map(z => (
                <button key={z} onClick={() => { setZoomLevel(z); hasScrolled.current = false; }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors
                    ${zoomLevel === z ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                  {z === 'week' ? 'Tuần' : z === 'month' ? 'Tháng' : 'Quý'}
                </button>
              ))}
            </div>
            <button onClick={() => openCreatePhase()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tạo Phase
            </button>
          </div>
        </div>
      </div>

      {/* Main board — relative container for the fixed-at-bottom marker */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left - Project List — z-20 covers marker when scrolling */}
        <div ref={leftPanelRef}
          className="w-56 flex-shrink-0 bg-surface-soft border-r border-hairline overflow-hidden z-20 relative">
          <div className="bg-stone-50 border-b border-hairline px-4 flex items-center text-[10px] font-bold text-stone-500 uppercase tracking-wider relative z-10"
            style={{ height: HEADER_HEIGHT }}>Dự án</div>
          <div ref={leftContentRef}>
            {filteredProjects.map(project => {
              const rd = projectRowData.get(project.id);
              const rowCount = rd?.rowCount ?? 1;
              const pbCount = rd?.pbs.length ?? 0;
              return (
                <div key={project.id} className="px-4 border-b border-hairline bg-surface-soft hover:bg-white transition-colors flex items-center"
                  style={{ height: rowCount * ROW_HEIGHT }}>
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        project.status === 'On Track' ? 'bg-emerald-400' :
                        project.status === 'At Risk' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <span className="text-sm font-semibold text-ink truncate">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-stone-400 font-light">{pbCount} phase</span>
                      <span className="text-[10px] text-stone-300">·</span>
                      <span className="text-[10px] text-stone-400 font-light">{project.progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right - Timeline scrollable area */}
        <div ref={boardRef} className="flex-1 overflow-auto relative select-none"
          onMouseDown={handleBoardMouseDown} onMouseMove={handleBoardMouseMove} onMouseUp={handleBoardMouseUp}>
          <div className="relative min-h-full" style={{ width: totalWidth + 200 }}>
            {/* Sticky header: column labels only — z-20 covers blocks */}
            <div className="sticky top-0 z-20 bg-stone-50 border-b border-hairline" style={{ height: HEADER_HEIGHT }}>
              <div className="flex h-full">
                {columns.map((col, i) => (
                  <div key={i}
                    className="flex-shrink-0 border-r border-stone-200/40 px-2 flex flex-col items-center justify-center text-xs font-medium text-stone-500 leading-tight"
                    style={{ width: colWidth }}>
                    {zoomLevel === 'week' && (
                      <>
                        <span className="font-bold text-stone-700">W{format(col, 'ww')}</span>
                        <span className="text-[10px] text-stone-400 font-light">{format(col, 'dd/MM')} – {format(addDays(col, 6), 'dd/MM')}</span>
                      </>
                    )}
                    {zoomLevel === 'month' && format(col, 'MM/yyyy')}
                    {zoomLevel === 'quarter' && (
                      <>
                        <span className="font-bold text-stone-700">Q{getQuarter(col)}</span>
                        <span className="text-[10px] text-stone-400 font-light">{format(col, 'yyyy')}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Today dot — at bottom edge of header, on the divider line */}
              <div className="absolute bottom-0 pointer-events-none" style={{ left: todayPos }}>
                <div className="w-2 h-2 rounded-full bg-[#ef4444]/75 -translate-x-1/2 translate-y-1/2" />
              </div>
            </div>
            {columns.map((_, i) => (
              <div key={`g-${i}`} className="absolute top-0 bottom-0 border-r border-stone-100"
                style={{ left: i * colWidth, width: colWidth }} />
            ))}

            {/* Today line — z-[1]: above row borders, below phase blocks (z-10) */}
            <div className="absolute top-0 bottom-0 z-[1] pointer-events-none" style={{ left: todayPos }}>
              <div className="w-0.5 h-full bg-[#ef4444]/75 -translate-x-1/2" />
            </div>

            {/* Project rows */}
            {filteredProjects.map((project) => {
              const rd = projectRowData.get(project.id);
              if (!rd) return null;
              const { rowCount, pbs } = rd;
              return (
                <div key={project.id} className="relative border-b border-hairline"
                  style={{ height: rowCount * ROW_HEIGHT }}>

                  {pbs.map(pb => {
                    const pos = layoutMap.get(pb.id);
                    if (!pos) return null;
                    const meta = PHASE_META[pb.phaseType];
                    const left = getDatePos(parseISO(pos.startDate));
                    const right = getDatePos(parseISO(pos.endDate));
                    const width = Math.max(24, right - left);
                    const top = pos.row * ROW_HEIGHT + 6;
                    const isHover = hoverPhase === pb.id;
                    const isDragging = dragPreview?.blockId === pb.id;
                    return (
                      <div key={pb.id}
                        className={`phase-block absolute rounded-lg border cursor-pointer group z-10 transition-shadow duration-150
                          ${meta.bg} ${meta.border}
                          ${isDragging ? 'ring-2 ring-ink/30 ring-offset-1' : ''}
                          ${isHover ? 'shadow-lg' : 'shadow-sm'}`}
                        style={{ left, width, top, height: ROW_HEIGHT - 12 }}
                        onMouseDown={e => handleBlockMouseDown(e, pb, project.id)}
                        onMouseEnter={() => setHoverPhase(pb.id)}
                        onMouseLeave={() => setHoverPhase(null)}
                      >
                        <div className="px-2.5 py-1 flex items-center gap-1.5 h-full overflow-hidden">
                          <span className={`text-[11px] font-semibold ${meta.color} truncate`}>
                            [{pb.phaseType}] {pb.title}
                          </span>
                        </div>
                        {isHover && !isDragging && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5
                            bg-surface-dark text-white text-[10px] rounded-lg shadow-xl whitespace-nowrap z-30">
                            <div className="font-bold">{pb.title}</div>
                            <div className="text-stone-400">{meta.label}</div>
                            <div className="text-stone-500 font-light">{format(parseISO(pos.startDate), 'dd/MM/yyyy')} – {format(parseISO(pos.endDate), 'dd/MM/yyyy')}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Spacer */}
            <div style={{ height: 32 }} />
          </div>
        </div>

      </div>

      <PhaseDetailModal />
      <CreatePhaseModal />
    </div>
  );
}
