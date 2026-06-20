import { useRef, useMemo, useState, useCallback, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import type { PhaseBlock } from '../../types';
import { getUserById } from '../../data/mockData';
import { Search, X, MousePointer2, Hand, SquarePen } from 'lucide-react';
import {
  format, parseISO, differenceInDays, addDays, addMonths,
  eachWeekOfInterval, eachMonthOfInterval, startOfQuarter, getQuarter
} from 'date-fns';
import PhaseDetailModal from './PhaseDetailModal';
import CreatePhaseModal from '../Modals/CreatePhaseModal';
import Avatar from '../common/Avatar';
import { computeProjectStatus, projectPhaseProgress, phaseBlockProgress } from '../../lib/projectStatus';
import { filterVisibleProjects, useProjectFilter } from '../../lib/filterProjects';
import FilterPopover from './FilterPopover';

const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 52;
const DRAG_THRESHOLD = 4;
const MIN_CREATE_WIDTH = 16; // px tối thiểu để coi là kéo tạo phase

// ─── Tooltip bám con trỏ, tự kẹp trong viewport ─────────────────────
// Dọc: ưu tiên phía trên con trỏ, chạm mép trên (boundary) thì lật xuống dưới.
// Ngang: kẹp vào trong — sát trái dạt phải, sát phải dạt trái.
function CursorTooltip({ x, y, boundary, children }: {
  x: number; y: number; boundary: number; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 220, h: 72 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w !== size.w || h !== size.h) setSize({ w, h });
  });

  const MARGIN = 8;
  const OFFSET = 14;
  const showBelow = y - OFFSET - size.h < boundary;
  const top = showBelow ? y + OFFSET : y - OFFSET - size.h;
  const left = Math.max(MARGIN, Math.min(x - size.w / 2, window.innerWidth - size.w - MARGIN));

  return (
    <div ref={ref}
      className="fixed z-[9999] px-2.5 py-1.5 bg-surface-dark text-white text-[10px] rounded-lg shadow-xl
                 whitespace-nowrap pointer-events-none"
      style={{ left, top }}>
      {children}
    </div>
  );
}

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

// ─── Component ──────────────────────────────────────────────────────
export default function PipelineTimeline() {
  const {
    orgProjects, phaseBlocks, searchQuery, zoomLevel,
    setSearchQuery, setZoomLevel,
    openPhaseDetail, openCreatePhase,
    openProjectDetail, updatePhaseBlock,
  } = useApp();

  const boardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  // Tooltip hover: bám theo tọa độ con trỏ (viewport)
  const [hoverInfo, setHoverInfo] = useState<{ id: string; x: number; y: number } | null>(null);
  const [manualRows, setManualRows] = useState<Map<string, number>>(new Map());
  // 'view': kéo chuột trên vùng trống = pan lịch; 'edit': kéo ngang trên hàng dự án = tạo phase
  const [boardMode, setBoardMode] = useState<'view' | 'edit'>('view');

  // Drag preview state (di chuyển hoặc resize block)
  const [dragPreview, setDragPreview] = useState<{
    blockId: string;
    projectId: string;
    startDate: string;
    endDate: string;
    row: number;
  } | null>(null);

  // Drag-to-create preview state
  const [createPreview, setCreatePreview] = useState<{
    projectId: string;
    rowTop: number; // px top trong content (đã gồm header)
    x1: number;
    x2: number;
  } | null>(null);

  // RAF throttle
  const rafRef = useRef(0);
  const pendingPos = useRef<{ dx: number; dy: number } | null>(null);

  // Keep latest layoutMap in ref so drop handler reads current value
  const layoutMapRef = useRef<Map<string, { startDate: string; endDate: string; row: number }>>(new Map());

  // Left panel content ref for transform-based scroll sync
  const leftContentRef = useRef<HTMLDivElement>(null);

  // ─── Trạng thái & tiến độ auto (derived) ──────────────────────────
  const statusOf = useMemo(() => {
    const m = new Map<string, ReturnType<typeof computeProjectStatus>>();
    orgProjects.forEach(p => m.set(p.id, computeProjectStatus(p, phaseBlocks)));
    return m;
  }, [orgProjects, phaseBlocks]);

  const progressOf = useMemo(() => {
    const m = new Map<string, number>();
    orgProjects.forEach(p => m.set(p.id,
      Math.round(projectPhaseProgress(phaseBlocks.filter(b => b.projectId === p.id)) * 100)));
    return m;
  }, [orgProjects, phaseBlocks]);

  // ─── Filtered projects ────────────────────────────────────────────
  // #15: useProjectFilter là nguồn sự thật chung cho sidebar + timeline.
  // displayRange = khoảng hiệu dụng (snap tuần + mở rộng phase bị cắt) → dùng cho cột.
  const { ctx: filterCtx, displayRange } = useProjectFilter();
  const filteredProjects = useMemo(
    () => filterVisibleProjects(orgProjects, filterCtx),
    [orgProjects, filterCtx],
  );

  // ─── Timeline range ───────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);

  // Neo biên lịch vào HÔM NAY với cửa sổ rộng cố định, chỉ nới ra khi phase
  // nằm ngoài. Nhờ vậy kéo/thả phase quanh hôm nay không làm dịch columns[0]
  // → lịch đứng im (muốn ra ngày xa thì tự cuộn lịch rồi kéo).
  // #15: khi có range filter → biên lịch = khoảng hiệu dụng (zoom đúng tuần đã
  // chọn, mở rộng cho phase bị cắt ở 2 đầu).
  const minDate = useMemo(() => {
    if (displayRange) return displayRange.start;
    const anchor = addDays(today, -30);
    if (phaseBlocks.length === 0) return anchor;
    const earliest = Math.min(...phaseBlocks.map(pb => parseISO(pb.startDate).getTime()));
    return earliest < anchor.getTime() ? addDays(new Date(earliest), -14) : anchor;
  }, [phaseBlocks, today, displayRange]);

  const maxDate = useMemo(() => {
    if (displayRange) return displayRange.end;
    const anchor = addDays(today, 60);
    if (phaseBlocks.length === 0) return anchor;
    const latest = Math.max(...phaseBlocks.map(pb => parseISO(pb.endDate).getTime()));
    return latest > anchor.getTime() ? addDays(new Date(latest), 30) : anchor;
  }, [phaseBlocks, today, displayRange]);

  // Block "trong tầm nhìn" = giao [minDate, maxDate]. Block ngoài tầm (vd bị
  // filter thời gian) không render & không chiếm hàng → không để hàng trống.
  const minStr = useMemo(() => format(minDate, 'yyyy-MM-dd'), [minDate]);
  const maxStr = useMemo(() => format(maxDate, 'yyyy-MM-dd'), [maxDate]);
  const isInView = useCallback(
    (pb: { startDate: string; endDate: string }) => pb.endDate >= minStr && pb.startDate <= maxStr,
    [minStr, maxStr],
  );

  // ─── Columns & widths ─────────────────────────────────────────────
  const { columns, colWidth, totalWidth } = useMemo(() => {
    let cols: Date[] = [], width = 0;
    if (zoomLevel === '3day') {
      // Mỗi cột = 3 ngày, to hơn để thấy task ngắn (1–3 ngày).
      const days: Date[] = [];
      let d = new Date(minDate);
      while (d <= maxDate) { days.push(new Date(d)); d = addDays(d, 3); }
      cols = days; width = 150;
    } else if (zoomLevel === 'week') {
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
    if (zoomLevel === '3day') return (differenceInDays(date, columns[0]) / 3) * colWidth;
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
    if (zoomLevel === '3day') {
      return addDays(columns[0], Math.round((px / colWidth) * 3));
    }
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

  // ─── Row indices (auto + lưu + manual) ─────────────────────────────
  // Ưu tiên: override trong session (manualRows, đang kéo) > displayRow đã lưu
  // (ý người dùng) > assignRows (auto). #bug A/B: giữ bố cục qua reload.
  const baseRowIndices = useMemo(() => {
    const result = new Map<string, number>();
    for (const project of filteredProjects) {
      const pbs = getFilteredPbs(project.id);
      assignRows(pbs).forEach((ri, id) => result.set(id, ri));
      for (const pb of pbs) {
        if (pb.displayRow != null) result.set(pb.id, pb.displayRow);
      }
    }
    manualRows.forEach((ri, id) => result.set(id, ri));
    return result;
  }, [filteredProjects, getFilteredPbs, manualRows]);

  // ─── Layout ───────────────────────────────────────────────────────
  // Quy tắc va chạm: KHÔNG dịch ngang block khác. Block bị block đang
  // kéo/resize chạm vào sẽ "xuống dòng" — mỗi block bị đụng nhận một
  // dòng mới tinh bên dưới.
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
      let maxRow = 0;
      for (const b of blocks) {
        if (!rows.has(b.row)) rows.set(b.row, []);
        rows.get(b.row)!.push(b);
        maxRow = Math.max(maxRow, b.row);
      }

      const overlaps = (a: BP, b: BP) => a.startDate < b.endDate && b.startDate < a.endDate;
      const activeId = dragPreview?.blockId;
      const bumped: BP[] = [];

      for (const [, rowBlocks] of rows) {
        // Block đang kéo được ưu tiên giữ nguyên dòng; còn lại theo startDate
        const sorted = [...rowBlocks].sort((a, b) => {
          if (a.id === activeId) return -1;
          if (b.id === activeId) return 1;
          return a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id);
        });
        const kept: BP[] = [];
        for (const b of sorted) {
          if (kept.some(k => overlaps(k, b))) bumped.push(b);
          else kept.push(b);
        }
        for (const b of kept) map.set(b.id, { startDate: b.startDate, endDate: b.endDate, row: b.row });
      }

      // Mỗi block bị đụng nhận một dòng hoàn toàn mới
      for (const b of bumped) {
        maxRow += 1;
        map.set(b.id, { startDate: b.startDate, endDate: b.endDate, row: maxRow });
      }

      // ─── Nén hàng: không để hàng trống (KHÔNG dồn khi đang kéo để block
      // không nhảy dọc giật cục — thả ra là dồn ngay). Chỉ tính block trong
      // tầm nhìn → hàng của block bị filter thời gian cũng biến mất.
      if (!dragPreview) {
        const usedRows = Array.from(new Set(
          pbs.filter(isInView).map(pb => map.get(pb.id)?.row).filter((r): r is number => r != null)
        )).sort((a, b) => a - b);
        const remap = new Map<number, number>();
        usedRows.forEach((r, i) => remap.set(r, i));
        for (const pb of pbs) {
          const pos = map.get(pb.id);
          if (pos && remap.has(pos.row)) map.set(pb.id, { ...pos, row: remap.get(pos.row)! });
        }
      }
    }
    return map;
  }, [filteredProjects, getFilteredPbs, baseRowIndices, dragPreview, isInView]);
  layoutMapRef.current = layoutMap;

  // ─── Per-project data ─────────────────────────────────────────────
  const projectRowData = useMemo(() => {
    const data = new Map<string, { rowCount: number; pbs: PhaseBlock[] }>();
    for (const project of filteredProjects) {
      const pbs = getFilteredPbs(project.id);
      let rowCount = 1;
      for (const pb of pbs) {
        const pos = layoutMap.get(pb.id);
        if (pos && isInView(pb)) rowCount = Math.max(rowCount, pos.row + 1);
      }
      data.set(project.id, { rowCount, pbs });
    }
    return data;
  }, [filteredProjects, getFilteredPbs, layoutMap, isInView]);

  // ─── Scroll sync (transform-based for left panel) ───
  useEffect(() => {
    const right = boardRef.current, leftContent = leftContentRef.current;
    if (!right || !leftContent) return;
    const onScroll = () => {
      leftContent.style.transform = `translateY(${-right.scrollTop}px)`;
      setHoverInfo(null); // tọa độ tooltip không còn đúng khi scroll
    };
    right.addEventListener('scroll', onScroll);
    return () => right.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Commit layout sau khi kéo/resize ─────────────────────────────
  const commitLayout = useCallback((projectId: string, draggedId: string) => {
    const currentLayout = layoutMapRef.current;
    const pbs = getFilteredPbs(projectId);
    const dragged = pbs.find(p => p.id === draggedId);
    const draggedPos = currentLayout.get(draggedId);
    // Chỉ block được kéo mới đổi ngày — các block khác giữ nguyên lịch
    if (dragged && draggedPos &&
        (draggedPos.startDate !== dragged.startDate || draggedPos.endDate !== dragged.endDate)) {
      updatePhaseBlock(draggedId, { startDate: draggedPos.startDate, endDate: draggedPos.endDate });
    }
    // #bug A/B: lưu displayRow cho mọi block đổi hàng → giữ bố cục qua reload.
    const rowUpdates: Array<[string, number]> = [];
    for (const pb of pbs) {
      const pos = currentLayout.get(pb.id);
      if (pos && pb.displayRow !== pos.row) rowUpdates.push([pb.id, pos.row]);
    }
    if (rowUpdates.length > 0) {
      setManualRows(prev => {
        const next = new Map(prev);
        for (const [id, row] of rowUpdates) next.set(id, row);
        return next;
      });
      for (const [id, row] of rowUpdates) updatePhaseBlock(id, { displayRow: row });
    }
  }, [getFilteredPbs, updatePhaseBlock]);

  // ─── Board mousedown: pan (kéo dọc) hoặc tạo phase (kéo ngang) ────
  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.phase-block')) return;
    if (e.button !== 0) return;
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startScrollLeft = board.scrollLeft;
    const startScrollTop = board.scrollTop;

    // Xác định project tại vị trí nhấn chuột
    const contentX = e.clientX - rect.left + board.scrollLeft;
    const contentY = e.clientY - rect.top + board.scrollTop - HEADER_HEIGHT;
    let targetProject: { id: string; top: number; rowCount: number } | null = null;
    let cum = 0;
    for (const project of filteredProjects) {
      const rd = projectRowData.get(project.id);
      const h = (rd?.rowCount ?? 1) * ROW_HEIGHT;
      if (contentY >= cum && contentY < cum + h) {
        targetProject = { id: project.id, top: cum, rowCount: rd?.rowCount ?? 1 };
        break;
      }
      cum += h;
    }

    // Hàng (trong project) ngay dưới con trỏ — để đặt preview đúng dòng
    const rowInProject = targetProject
      ? Math.max(0, Math.min(targetProject.rowCount - 1, Math.floor((contentY - targetProject.top) / ROW_HEIGHT)))
      : 0;

    let mode: 'pending' | 'pan' | 'create' = 'pending';

    const handleMove = (me: MouseEvent) => {
      const dx = me.clientX - startClientX;
      const dy = me.clientY - startClientY;

      if (mode === 'pending') {
        if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;
        // Chế độ Xem: luôn pan. Chế độ Tạo phase: kéo ngang trong hàng dự án → tạo, còn lại → pan
        mode = boardMode === 'edit' && targetProject && Math.abs(dx) >= Math.abs(dy) ? 'create' : 'pan';
        if (mode === 'pan') board.style.cursor = 'grabbing';
      }

      if (mode === 'pan') {
        board.scrollLeft = startScrollLeft - (me.clientX - startClientX);
        board.scrollTop = startScrollTop - (me.clientY - startClientY);
        return;
      }

      // create mode
      const curX = me.clientX - rect.left + board.scrollLeft;
      setCreatePreview({
        projectId: targetProject!.id,
        rowTop: HEADER_HEIGHT + targetProject!.top + rowInProject * ROW_HEIGHT,
        x1: Math.max(0, Math.min(contentX, curX)),
        x2: Math.max(contentX, curX),
      });
    };

    const handleUp = (me: MouseEvent) => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      board.style.cursor = '';

      if (mode === 'create' && targetProject) {
        const curX = me.clientX - rect.left + board.scrollLeft;
        const x1 = Math.max(0, Math.min(contentX, curX));
        const x2 = Math.max(contentX, curX);
        if (x2 - x1 >= MIN_CREATE_WIDTH) {
          const start = getPosDate(x1);
          let end = getPosDate(x2);
          if (differenceInDays(end, start) < 1) end = addDays(start, 1);
          openCreatePhase(targetProject.id, {
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd'),
          });
        }
      }
      setCreatePreview(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [filteredProjects, projectRowData, getPosDate, openCreatePhase, boardMode]);

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
          // Chỉ cho tạo hàng mới ngay dưới hàng cuối CÓ khối khác — tránh để hàng trên rỗng (spam).
          const others = (rd?.pbs ?? []).filter(b => b.id !== pb.id);
          let maxOtherRow = -1;
          for (const b of others) maxOtherRow = Math.max(maxOtherRow, baseRowIndices.get(b.id) ?? 0);
          const maxAllowedRow = maxOtherRow + 1;
          const rowDelta = Math.round(pos.dy / ROW_HEIGHT);
          let newRow = origRow + rowDelta;
          newRow = Math.max(0, Math.min(maxAllowedRow, newRow));

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
        commitLayout(projectId, pb.id);
      } else {
        openPhaseDetail(pb.id);
      }

      setDragPreview(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [getDatePos, getPosDate, baseRowIndices, projectRowData, commitLayout, openPhaseDetail]);

  // ─── Resize 2 đầu block ───────────────────────────────────────────
  const handleResizeMouseDown = useCallback((
    e: React.MouseEvent, pb: PhaseBlock, projectId: string, edge: 'left' | 'right'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const row = baseRowIndices.get(pb.id) ?? 0;
    const origStartPos = getDatePos(parseISO(pb.startDate));
    const origEndPos = getDatePos(parseISO(pb.endDate));
    let hasMoved = false;

    const handleMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      if (!hasMoved && Math.abs(dx) > DRAG_THRESHOLD) hasMoved = true;
      if (!hasMoved) return;

      pendingPos.current = { dx, dy: 0 };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const pos = pendingPos.current;
          if (!pos) { rafRef.current = 0; return; }

          let newStart = parseISO(pb.startDate);
          let newEnd = parseISO(pb.endDate);
          if (edge === 'left') {
            newStart = getPosDate(Math.max(0, origStartPos + pos.dx));
            if (differenceInDays(newEnd, newStart) < 1) newStart = addDays(newEnd, -1);
          } else {
            newEnd = getPosDate(origEndPos + pos.dx);
            if (differenceInDays(newEnd, newStart) < 1) newEnd = addDays(newStart, 1);
          }

          setDragPreview({
            blockId: pb.id,
            projectId,
            startDate: format(newStart, 'yyyy-MM-dd'),
            endDate: format(newEnd, 'yyyy-MM-dd'),
            row,
          });
          rafRef.current = 0;
        });
      }
    };

    const handleUp = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (hasMoved) commitLayout(projectId, pb.id);
      setDragPreview(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [getDatePos, getPosDate, baseRowIndices, commitLayout]);

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
            <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-stone-400 font-light">
              <MousePointer2 className="w-3 h-3" />
              {boardMode === 'edit' ? 'Kéo thả trên hàng dự án để tạo phase' : 'Kéo chuột để di chuyển lịch'}
            </span>
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
            {/* #15: bộ lọc người + khoảng thời gian (gộp 1 nút để gọn toolbar) */}
            <FilterPopover />
            {/* Chế độ tương tác: Xem (pan) / Tạo phase (kéo để tạo) */}
            <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
              <button onClick={() => setBoardMode('view')}
                title="Chế độ xem — kéo chuột để di chuyển lịch"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors
                  ${boardMode === 'view' ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                <Hand className="w-3.5 h-3.5" /> Xem
              </button>
              <button onClick={() => setBoardMode('edit')}
                title="Chế độ tạo phase — kéo ngang trên hàng dự án để tạo phase"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors
                  ${boardMode === 'edit' ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                <SquarePen className="w-3.5 h-3.5" /> Tạo phase
              </button>
            </div>
            <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
              <button onClick={() => {
                const el = boardRef.current;
                if (!el) return;
                const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
                const target = Math.max(0, Math.min(todayPos - el.clientWidth / 2, maxScroll));
                smoothScrollTo(target);
              }}
                className="px-2.5 py-1 text-xs font-bold rounded-md text-ink hover:bg-ink/[0.06] transition-colors">
                Hôm nay
              </button>
              <div className="w-px h-4 bg-stone-300 mx-0.5" />
              {(['3day', 'week', 'month', 'quarter'] as const).map(z => (
                <button key={z} onClick={() => { setZoomLevel(z); hasScrolled.current = false; }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors
                    ${zoomLevel === z ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                  {z === '3day' ? '3 ngày' : z === 'week' ? 'Tuần' : z === 'month' ? 'Tháng' : 'Quý'}
                </button>
              ))}
            </div>
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
                <div key={project.id}
                  onClick={() => openProjectDetail(project.id)}
                  title="Xem chi tiết dự án"
                  className="px-4 border-b border-hairline bg-surface-soft hover:bg-white transition-colors flex items-center cursor-pointer"
                  style={{ height: rowCount * ROW_HEIGHT }}>
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        (statusOf.get(project.id) ?? project.status) === 'On Track' ? 'bg-emerald-400' :
                        (statusOf.get(project.id) ?? project.status) === 'At Risk' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <span className="text-sm font-semibold text-ink truncate">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-stone-400 font-light">{pbCount} phase</span>
                      <span className="text-[10px] text-stone-300">·</span>
                      <span className="text-[10px] text-stone-400 font-light">{progressOf.get(project.id) ?? project.progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right - Timeline scrollable area */}
        <div ref={boardRef}
          className={`flex-1 overflow-auto relative select-none ${boardMode === 'edit' ? 'cursor-crosshair' : 'cursor-grab'}`}
          onMouseDown={handleBoardMouseDown}>
          <div className="relative min-h-full" style={{ width: totalWidth + 200 }}>
            {/* Sticky header: column labels only — z-20 covers blocks */}
            <div className="sticky top-0 z-20 bg-stone-50 border-b border-hairline" style={{ height: HEADER_HEIGHT }}>
              <div className="flex h-full">
                {columns.map((col, i) => (
                  <div key={i}
                    className="flex-shrink-0 border-r border-stone-200/40 px-2 flex flex-col items-center justify-center text-xs font-medium text-stone-500 leading-tight"
                    style={{ width: colWidth }}>
                    {zoomLevel === '3day' && (
                      <>
                        <span className="font-bold text-stone-700">{format(col, 'dd')}</span>
                        <span className="text-[10px] text-stone-400 font-light">{format(col, 'dd/MM')} – {format(addDays(col, 2), 'dd/MM')}</span>
                      </>
                    )}
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

            {/* Drag-to-create preview */}
            {createPreview && (
              <div className="absolute z-10 rounded-lg border-2 border-dashed border-ink/40 bg-ink/[0.04] pointer-events-none
                              flex items-center justify-center"
                style={{
                  left: createPreview.x1,
                  width: Math.max(2, createPreview.x2 - createPreview.x1),
                  top: createPreview.rowTop + 6,
                  height: ROW_HEIGHT - 12,
                }}>
                {createPreview.x2 - createPreview.x1 > 90 && (
                  <span className="text-[10px] font-semibold text-ink/60 whitespace-nowrap px-2">
                    {format(getPosDate(createPreview.x1), 'dd/MM')} – {format(getPosDate(createPreview.x2), 'dd/MM')}
                  </span>
                )}
              </div>
            )}

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
                    if (!pos || !isInView(pb)) return null;
                    const meta = PHASE_META[pb.phaseType];
                    const left = getDatePos(parseISO(pos.startDate));
                    const right = getDatePos(parseISO(pos.endDate));
                    const width = Math.max(24, right - left);
                    const top = pos.row * ROW_HEIGHT + 6;
                    const isHover = hoverInfo?.id === pb.id;
                    const isDragging = dragPreview?.blockId === pb.id;
                    const pct = Math.round(phaseBlockProgress(pb) * 100); // #8: gộp checklist + outcomes
                    const assignee = getUserById(pb.createdBy); // #13: PIC = người tạo
                    return (
                      <div key={pb.id}
                        className={`phase-block absolute rounded-lg border cursor-pointer group
                          ${meta.bg} ${meta.border}
                          ${isDragging ? 'ring-2 ring-ink/30 ring-offset-1' : ''}
                          ${isHover ? 'shadow-lg z-50' : 'shadow-sm z-10'}`}
                        style={{
                          left, width, top, height: ROW_HEIGHT - 12,
                          // Khi KHÔNG kéo: animate nhẹ vị trí/kích thước (mượt lúc đổi
                          // filter/zoom). Đang kéo → chỉ shadow để phản hồi tức thì.
                          transition: dragPreview
                            ? 'box-shadow 150ms ease'
                            : 'left 280ms cubic-bezier(0.22,1,0.36,1), top 280ms cubic-bezier(0.22,1,0.36,1), width 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 150ms ease',
                        }}
                        onMouseDown={e => { setHoverInfo(null); handleBlockMouseDown(e, pb, project.id); }}
                        onMouseEnter={e => setHoverInfo({ id: pb.id, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setHoverInfo({ id: pb.id, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoverInfo(null)}
                      >
                        {/* Title sticky: khi block dài & cuộn ngang, title dính mép trái board
                            cho đến khi hết block (#sticky title). Ellipsis cho block hẹp. */}
                        <div className="px-2.5 py-1 flex items-center gap-1.5 h-full">
                          <span className={`text-[11px] font-semibold ${meta.color} whitespace-nowrap ${meta.bg}`}
                            style={{ position: 'sticky', left: 10, maxWidth: Math.max(40, width - 16),
                                     overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 6, borderRadius: 4 }}>
                            [{pb.phaseType}] {pb.title}
                          </span>
                          <span className="flex-1" />
                          {width > 110 && (
                            <span className="text-[9px] font-bold text-stone-500/80 shrink-0">{pct}%</span>
                          )}
                          {width > 80 && assignee && (
                            <Avatar name={assignee.name} src={assignee.avatar}
                              className="w-4 h-4 border border-white/80 shrink-0" />
                          )}
                        </div>
                        {/* Progress theo checklist */}
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.06] rounded-b-lg overflow-hidden">
                          <div className={`h-full ${meta.solid} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        {/* Resize handles */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          onMouseDown={e => handleResizeMouseDown(e, pb, project.id, 'left')}>
                          <div className="w-1 h-5 rounded-full bg-ink/30" />
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          onMouseDown={e => handleResizeMouseDown(e, pb, project.id, 'right')}>
                          <div className="w-1 h-5 rounded-full bg-ink/30" />
                        </div>
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

        {/* Legend — chú thích các phase */}
        <div className="absolute bottom-3 right-3 z-30 bg-white/95 backdrop-blur border border-hairline rounded-lg shadow-md px-3 py-2 pointer-events-none">
          <div className="flex items-center gap-3 flex-wrap">
            {DEV_PHASES.map(phase => {
              const meta = PHASE_META[phase];
              return (
                <span key={phase} className="flex items-center gap-1.5 text-[9px] text-stone-500">
                  <span className={`w-2 h-2 rounded-sm ${meta.solid}`} />
                  <span className="font-bold text-stone-600">{phase}</span>
                  <span className="font-light hidden xl:inline">{meta.fullLabel}</span>
                </span>
              );
            })}
          </div>
        </div>

      </div>

      {/* Tooltip — bám con trỏ, fixed trên viewport, tự kẹp vào trong màn hình */}
      {hoverInfo && !dragPreview && !createPreview && (() => {
        const pb = phaseBlocks.find(b => b.id === hoverInfo.id);
        const pos = layoutMap.get(hoverInfo.id);
        if (!pb || !pos) return null;
        const meta = PHASE_META[pb.phaseType];
        const pct = Math.round(phaseBlockProgress(pb) * 100); // #8: gộp checklist + outcomes
        const assignee = getUserById(pb.createdBy); // #13: PIC = người tạo
        const boardTop = boardRef.current?.getBoundingClientRect().top ?? 0;
        return (
          <CursorTooltip x={hoverInfo.x} y={hoverInfo.y} boundary={boardTop + HEADER_HEIGHT}>
            <div className="font-bold">{pb.title}</div>
            <div className="text-stone-400">{meta.fullLabel} · {pct}% hoàn thành</div>
            {assignee && <div className="text-stone-400">PIC: {assignee.name}</div>}
            <div className="text-stone-500 font-light">{format(parseISO(pos.startDate), 'dd/MM/yyyy')} – {format(parseISO(pos.endDate), 'dd/MM/yyyy')}</div>
          </CursorTooltip>
        );
      })()}

      <PhaseDetailModal />
      <CreatePhaseModal />
    </div>
  );
}
