import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { PHASE_META } from '../../types';
import { projects, phaseBlocks } from '../../data/mockData';
import { computeProjectStatus, projectPhaseProgress } from '../../lib/projectStatus';
import {
  format, parseISO, differenceInDays, addDays, addMonths,
  eachWeekOfInterval, eachMonthOfInterval, startOfQuarter, getQuarter,
} from 'date-fns';

const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 44;
const DRAG_THRESHOLD = 4;

// Use org1's projects as demo data
const demoProjects = projects.filter(p => p.orgId === 'org1');
const demoPhaseBlocks = phaseBlocks.filter(pb => demoProjects.some(p => p.id === pb.projectId));

// ─── Initial row assignment (greedy, non-overlapping) ───────────────
function assignRows(
  pbs: Array<{ id: string; startDate: string; endDate: string }>
): Map<string, number> {
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

export default function LivePipelinePreview() {
  const boardRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month' | 'quarter'>('week');
  const [hoverPhase, setHoverPhase] = useState<string | null>(null);
    const hasScrolled = useRef(false);

  // Live block positions (mutated only on drop)
  const [blockPositions, setBlockPositions] = useState<Map<string, { startDate: string; endDate: string }>>(() => {
    const map = new Map<string, { startDate: string; endDate: string }>();
    demoPhaseBlocks.forEach(pb => map.set(pb.id, { startDate: pb.startDate, endDate: pb.endDate }));
    return map;
  });

  // Manual row overrides (set on drop)
  const [manualRows, setManualRows] = useState<Map<string, number>>(new Map());

  // Drag preview — only the block being dragged
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

  // Filter — no search in preview
  const filteredProjects = useMemo(() => {
    return demoProjects.filter(() => true);
  }, []);

  // Timeline range
  const today = useMemo(() => new Date(), []);
  // Neo biên vào hôm nay với cửa sổ cố định, chỉ nới khi phase nằm ngoài →
  // kéo/thả quanh hôm nay không làm dịch lịch.
  const minDate = useMemo(() => {
    const anchor = addDays(today, -30);
    if (demoPhaseBlocks.length === 0) return anchor;
    const earliest = Math.min(...demoPhaseBlocks.map(pb => parseISO(pb.startDate).getTime()));
    return earliest < anchor.getTime() ? addDays(new Date(earliest), -14) : anchor;
  }, [demoPhaseBlocks, today]);

  const maxDate = useMemo(() => {
    const anchor = addDays(today, 60);
    if (demoPhaseBlocks.length === 0) return anchor;
    const latest = Math.max(...demoPhaseBlocks.map(pb => parseISO(pb.endDate).getTime()));
    return latest > anchor.getTime() ? addDays(new Date(latest), 30) : anchor;
  }, [demoPhaseBlocks, today]);

  const { columns, colWidth, totalWidth } = useMemo(() => {
    let cols: Date[] = [], width = 0;
    if (zoomLevel === 'week') {
      cols = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 }); width = 100;
    } else if (zoomLevel === 'month') {
      cols = eachMonthOfInterval({ start: minDate, end: maxDate }); width = 120;
    } else {
      const quarters: Date[] = [];
      let d = startOfQuarter(minDate);
      while (d <= maxDate) { quarters.push(new Date(d)); d = addMonths(d, 3); }
      cols = quarters; width = 220;
    }
    return { columns: cols, colWidth: width, totalWidth: cols.length * width };
  }, [minDate, maxDate, zoomLevel]);

  // Position helpers
  const getDatePos = useCallback((date: Date) => {
    if (columns.length === 0) return 0;
    if (zoomLevel === 'week') return (differenceInDays(date, columns[0]) / 7) * colWidth;
    const monthsDiff = (date.getFullYear() - columns[0].getFullYear()) * 12 + (date.getMonth() - columns[0].getMonth());
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const dayFraction = (date.getDate() - 1) / daysInMonth;
    if (zoomLevel === 'month') return (monthsDiff + dayFraction) * colWidth;
    return ((monthsDiff + dayFraction) / 3) * colWidth;
  }, [columns, colWidth, zoomLevel]);

  const getPosDate = useCallback((px: number) => {
    if (columns.length === 0) return new Date();
    if (zoomLevel === 'week') {
      const ratio = px / colWidth;
      return addDays(columns[0], Math.round(ratio * 7));
    }
    if (zoomLevel === 'month') {
      const totalMonths = px / colWidth;
      const monthIndex = Math.floor(totalMonths);
      const dayFraction = totalMonths - monthIndex;
      const targetMonth = new Date(columns[0].getFullYear(), columns[0].getMonth() + monthIndex, 1);
      const daysInTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const day = Math.min(Math.max(1, Math.round(dayFraction * daysInTargetMonth) + 1), daysInTargetMonth);
      return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
    }
    const totalMonths = (px / colWidth) * 3;
    const monthIndex = Math.floor(totalMonths);
    const dayFraction = totalMonths - monthIndex;
    const targetMonth = addMonths(columns[0], monthIndex);
    const daysInTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    const day = Math.min(Math.max(1, Math.round(dayFraction * daysInTargetMonth) + 1), daysInTargetMonth);
    return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
  }, [columns, colWidth, zoomLevel]);

  const todayPos = getDatePos(today);

  // Helper: get filtered pbs for a project
  const getFilteredPbs = useCallback((projectId: string) => {
    return demoPhaseBlocks.filter(pb => pb.projectId === projectId);
  }, []);

  // Row indices (auto assign from blockPositions + manual overrides)
  const baseRowIndices = useMemo(() => {
    const result = new Map<string, number>();
    for (const project of filteredProjects) {
      const pbs = getFilteredPbs(project.id);
      const positioned = pbs.map(pb => {
        const pos = blockPositions.get(pb.id);
        return { id: pb.id, startDate: pos?.startDate ?? pb.startDate, endDate: pos?.endDate ?? pb.endDate };
      });
      assignRows(positioned).forEach((ri, id) => result.set(id, ri));
    }
    manualRows.forEach((ri, id) => result.set(id, ri));
    return result;
  }, [filteredProjects, getFilteredPbs, blockPositions, manualRows]);

  // Layout: resolves overlaps considering drag preview
  const layoutMap = useMemo(() => {
    const map = new Map<string, { startDate: string; endDate: string; row: number }>();

    for (const project of filteredProjects) {
      const pbs = getFilteredPbs(project.id);
      type BP = { id: string; startDate: string; endDate: string; row: number };
      const blocks: BP[] = pbs.map(pb => {
        const isDragged = dragPreview?.blockId === pb.id;
        const pos = blockPositions.get(pb.id);
        return {
          id: pb.id,
          startDate: isDragged ? dragPreview.startDate : (pos?.startDate ?? pb.startDate),
          endDate: isDragged ? dragPreview.endDate : (pos?.endDate ?? pb.endDate),
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
  }, [filteredProjects, getFilteredPbs, blockPositions, baseRowIndices, dragPreview]);
  layoutMapRef.current = layoutMap;

  // Per-project data
  const projectRowData = useMemo(() => {
    const data = new Map<string, { rowCount: number; pbs: typeof demoPhaseBlocks }>();
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

  // Trạng thái & tiến độ auto (derived) — tính từ vị trí phase hiện tại (kéo/thả).
  const liveStatus = useMemo(() => {
    const live = demoPhaseBlocks.map(pb => {
      const pos = blockPositions.get(pb.id);
      return pos ? { ...pb, startDate: pos.startDate, endDate: pos.endDate } : pb;
    });
    const statusMap = new Map<string, ReturnType<typeof computeProjectStatus>>();
    const progressMap = new Map<string, number>();
    for (const project of filteredProjects) {
      statusMap.set(project.id, computeProjectStatus(project, live));
      progressMap.set(project.id,
        Math.round(projectPhaseProgress(live.filter(b => b.projectId === project.id)) * 100));
    }
    return { statusMap, progressMap };
  }, [filteredProjects, blockPositions]);

  // Auto scroll to today
  useEffect(() => {
    if (boardRef.current && !hasScrolled.current && totalWidth > 0) {
      boardRef.current.scrollLeft = todayPos - (boardRef.current.clientWidth / 3);
      hasScrolled.current = true;
    }
  }, [totalWidth, todayPos, zoomLevel]);

  // Scroll sync (left panel)
  useEffect(() => {
    const board = boardRef.current, leftContent = leftContentRef.current;
    if (!board || !leftContent) return;
    const onScroll = () => {
      leftContent.style.transform = `translateY(${-board.scrollTop}px)`;
    };
    board.addEventListener('scroll', onScroll);
    return () => board.removeEventListener('scroll', onScroll);
  }, []);

  // ── Board pan (drag empty area to scroll) ──────────────────────
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const onPanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.phase-block')) return;
    const el = boardRef.current;
    if (!el) return;
    isPanning.current = true;
    panStart.current = {
      x: e.pageX, y: e.pageY,
      scrollLeft: el.scrollLeft, scrollTop: el.scrollTop,
    };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const onPanMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning.current) return;
    const el = boardRef.current;
    if (!el) return;
    el.scrollLeft = panStart.current.scrollLeft - (e.pageX - panStart.current.x);
    el.scrollTop = panStart.current.scrollTop - (e.pageY - panStart.current.y);
  }, []);

  const onPanEnd = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    isPanning.current = false;
    el.style.cursor = 'grab';
    el.style.userSelect = '';
  }, []);

  // ── Block drag with preview ────────────────────────────────────
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, pbId: string, projectId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const pos = blockPositions.get(pbId);
    if (!pos) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origRow = baseRowIndices.get(pbId) ?? 0;
    const duration = differenceInDays(parseISO(pos.endDate), parseISO(pos.startDate));
    const origLeft = getDatePos(parseISO(pos.startDate));
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
          const p = pendingPos.current;
          if (!p) { rafRef.current = 0; return; }

          const newLeft = origLeft + p.dx;
          const newStart = getPosDate(Math.max(0, newLeft));
          const newEnd = addDays(newStart, duration);

          const rd = projectRowData.get(projectId);
          const maxRow = rd?.rowCount ?? 1;
          const rowDelta = Math.round(p.dy / ROW_HEIGHT);
          let newRow = origRow + rowDelta;
          newRow = Math.max(0, Math.min(maxRow, newRow));

          setDragPreview({
            blockId: pbId,
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
        // Read resolved positions from layoutMapRef
        const currentLayout = layoutMapRef.current;
        const pbs = getFilteredPbs(projectId);

        setBlockPositions(prev => {
          const next = new Map(prev);
          for (const pb of pbs) {
            const resolved = currentLayout.get(pb.id);
            if (resolved) next.set(pb.id, { startDate: resolved.startDate, endDate: resolved.endDate });
          }
          return next;
        });

        setManualRows(prev => {
          const next = new Map(prev);
          for (const pb of pbs) {
            const resolved = currentLayout.get(pb.id);
            if (resolved) next.set(pb.id, resolved.row);
          }
          return next;
        });
      }

      setDragPreview(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [blockPositions, getDatePos, getPosDate, getFilteredPbs, baseRowIndices, projectRowData]);

  // Smooth scroll to today
  const scrollToToday = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.max(0, Math.min(todayPos - el.clientWidth / 2, maxScroll));
    const start = el.scrollLeft;
    const distance = target - start;
    if (Math.abs(distance) < 2) return;
    const duration = 400;
    const startTime = performance.now();
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.scrollLeft = start + distance * ease(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [todayPos]);

  return (
    <div className="flex flex-col bg-white overflow-hidden h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-surface-dark border-b border-white/[0.06] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] text-white/30 ml-1">TechNova Solutions · Pipeline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            <button onClick={scrollToToday}
              className="px-2 py-1 text-[10px] font-bold rounded-md text-white/80 hover:bg-white/[0.08] transition-colors">
              Hôm nay
            </button>
            <div className="w-px h-3 bg-white/10 mx-0.5" />
            {(['week', 'month', 'quarter'] as const).map(z => (
              <button key={z} onClick={() => { setZoomLevel(z); hasScrolled.current = false; }}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors
                  ${zoomLevel === z ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'}`}>
                {z === 'week' ? 'Tuần' : z === 'month' ? 'Tháng' : 'Quý'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main board */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left panel */}
        <div className="w-36 shrink-0 bg-surface-soft border-r border-hairline overflow-hidden z-20 relative">
          <div className="bg-surface-soft border-b border-hairline px-3 flex items-center text-[9px] font-bold text-muted uppercase tracking-wider sticky top-0 z-10"
            style={{ height: HEADER_HEIGHT }}>Dự án</div>
          <div ref={leftContentRef}>
            {filteredProjects.map(project => {
              const rd = projectRowData.get(project.id);
              const rowCount = rd?.rowCount ?? 1;
              const pbCount = rd?.pbs.length ?? 0;
              return (
                <div key={project.id} className="px-3 border-b border-hairline bg-surface-soft hover:bg-white transition-colors flex items-center"
                  style={{ height: rowCount * ROW_HEIGHT }}>
                  <div className="w-full min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        (liveStatus.statusMap.get(project.id) ?? project.status) === 'On Track' ? 'bg-emerald-400' :
                        (liveStatus.statusMap.get(project.id) ?? project.status) === 'At Risk' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <span className="text-[11px] font-semibold text-ink truncate">{project.name}</span>
                    </div>
                    <div className="text-[9px] text-stone-400 font-light mt-0.5">{pbCount} phase · {liveStatus.progressMap.get(project.id) ?? project.progress}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div ref={boardRef} className="flex-1 overflow-auto relative select-none cursor-grab"
          onMouseDown={onPanStart}
          onMouseMove={onPanMove}
          onMouseUp={onPanEnd}
          onMouseLeave={onPanEnd}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.currentTarget.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}>
          <div className="relative min-h-full" style={{ width: totalWidth + 100 }}>
            {/* Column headers */}
            <div className="sticky top-0 z-20 bg-surface-soft border-b border-hairline" style={{ height: HEADER_HEIGHT }}>
              <div className="flex h-full">
                {columns.map((col, i) => (
                  <div key={i}
                    className="flex-shrink-0 border-r border-hairline-soft px-1 flex flex-col items-center justify-center text-[10px] font-medium text-muted leading-tight"
                    style={{ width: colWidth }}>
                    {zoomLevel === 'week' && (
                      <>
                        <span className="font-bold text-stone-700">W{format(col, 'ww')}</span>
                        <span className="text-[8px] text-stone-400">{format(col, 'dd/MM')}</span>
                      </>
                    )}
                    {zoomLevel === 'month' && <span>{format(col, 'MM/yyyy')}</span>}
                    {zoomLevel === 'quarter' && (
                      <>
                        <span className="font-bold text-stone-700">Q{getQuarter(col)}</span>
                        <span className="text-[8px] text-stone-400">{format(col, 'yyyy')}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Today dot — at bottom edge of header, on the divider line */}
              <div className="absolute bottom-0 pointer-events-none" style={{ left: todayPos }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]/75 -translate-x-1/2 translate-y-1/2" />
              </div>
            </div>

            {/* Grid lines */}
            {columns.map((_, i) => (
              <div key={`g-${i}`} className="absolute top-0 bottom-0 border-r border-stone-100"
                style={{ left: i * colWidth, width: colWidth }} />
            ))}

            {/* Today line — z-[1]: above row borders, below phase blocks (z-10) */}
            <div className="absolute top-0 bottom-0 z-[1] pointer-events-none" style={{ left: todayPos }}>
              <div className="w-0.5 h-full bg-[#ef4444]/75 -translate-x-1/2" />
            </div>

            {/* Project rows */}
            {filteredProjects.map(project => {
              const rd = projectRowData.get(project.id);
              if (!rd) return null;
              const { rowCount, pbs } = rd;
              return (
                <div key={project.id} className="relative border-b border-hairline"
                  style={{ height: rowCount * ROW_HEIGHT }}>

                  {pbs.map(pb => {
                    const pos = layoutMap.get(pb.id);
                    if (!pos) return null;
                    const meta = PHASE_META[pb.phaseType as keyof typeof PHASE_META];
                    const left = getDatePos(parseISO(pos.startDate));
                    const right = getDatePos(parseISO(pos.endDate));
                    const width = Math.max(20, right - left);
                    const top = pos.row * ROW_HEIGHT + 4;
                    const isHover = hoverPhase === pb.id;
                    const isDragging = dragPreview?.blockId === pb.id;
                    return (
                      <div key={pb.id}
                        className={`phase-block absolute rounded-md border cursor-grab group z-10 transition-shadow duration-150
                          ${meta.bg} ${meta.border}
                          ${isDragging ? 'ring-2 ring-ink/30 ring-offset-1' : ''}
                          ${isHover ? 'shadow-lg' : 'shadow-sm'}`}
                        style={{ left, width, top, height: ROW_HEIGHT - 8 }}
                        onMouseDown={e => handleBlockMouseDown(e, pb.id, project.id)}
                        onMouseEnter={() => setHoverPhase(pb.id)}
                        onMouseLeave={() => setHoverPhase(null)}
                      >
                        <div className="px-2 py-0.5 flex items-center gap-1 h-full overflow-hidden">
                          <span className={`text-[10px] font-semibold ${meta.color} truncate`}>
                            [{pb.phaseType}] {pb.title}
                          </span>
                        </div>
                        {isHover && !isDragging && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1
                            bg-surface-dark text-white text-[9px] rounded-lg shadow-xl whitespace-nowrap z-30">
                            <div className="font-bold">{pb.title}</div>
                            <div className="text-stone-400">{meta.label}</div>
                            <div className="text-stone-500 font-light">
                              {format(parseISO(pos.startDate), 'dd/MM')} – {format(parseISO(pos.endDate), 'dd/MM')}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Spacer */}
            <div style={{ height: 28 }} />
          </div>
        </div>

      </div>
    </div>
  );
}
