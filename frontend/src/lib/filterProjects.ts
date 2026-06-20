// #15: bộ lọc project + khoảng hiển thị dùng chung cho Pipeline timeline VÀ
// Workspace sidebar. Một nguồn sự thật duy nhất (useProjectFilter) → sidebar luôn
// auto-đồng bộ với các project đang hiển thị trên timeline.
import { useMemo } from 'react';
import { startOfWeek, endOfWeek, isBefore, isAfter, parseISO, format } from 'date-fns';
import type { Project, ProjectStatus, PhaseBlock, User } from '../types';
import { computeProjectStatus } from './projectStatus';
import { useApp } from '../context/AppContext';

// Tuần bắt đầu Thứ Hai — khớp eachWeekOfInterval(..., { weekStartsOn: 1 }) ở timeline.
const WEEK_OPTS = { weekStartsOn: 1 as const };

export interface ProjectFilterCtx {
  searchQuery: string;
  statusFilter: ProjectStatus | 'All';
  selectedProjectIds: string[] | null;
  onlyMine: boolean;
  rangeStart: string | null; // **hiệu dụng** (đã snap tuần + mở rộng), 'YYYY-MM-DD'
  rangeEnd: string | null;
  currentUser: User | null;
  phaseBlocks: PhaseBlock[];
}

export interface DisplayRange { start: Date; end: Date; }

/**
 * Một project "của tôi" khi:
 *  - mình là PIC (`picUserId`) — PIC mặc định coi là đang tham gia; **creator thì
 *    KHÔNG** tính (người tạo nhưng đã giao PIC cho người khác → không còn tham gia).
 *  - HOẶC mình là PIC/creator của một phase block trong project, hoặc là participant.
 */
function isMine(p: Project, me: string | undefined, phaseBlocks: PhaseBlock[]): boolean {
  if (!me) return false;
  if (p.picUserId === me) return true;
  return phaseBlocks.some(pb => pb.projectId === p.id
    && (pb.createdBy === me || pb.participants.includes(me)));
}

/** Phase có giao [start, end] không (so chuỗi YYYY-MM-DD). */
function overlapsRange(pb: PhaseBlock, start: string | null, end: string | null): boolean {
  return (!start || pb.endDate >= start) && (!end || pb.startDate <= end);
}

export function isProjectVisible(p: Project, ctx: ProjectFilterCtx): boolean {
  const { searchQuery, statusFilter, selectedProjectIds, onlyMine, rangeStart, rangeEnd, currentUser, phaseBlocks } = ctx;
  const ms = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
  const mst = statusFilter === 'All' || computeProjectStatus(p, phaseBlocks) === statusFilter;
  const mproj = selectedProjectIds === null || selectedProjectIds.includes(p.id);
  const mmine = !onlyMine || isMine(p, currentUser?.id, phaseBlocks);
  // range ở đây là khoảng hiệu dụng (A'→B') → ẩn project không có phase nào trong đó.
  const mrange = (!rangeStart && !rangeEnd)
    || phaseBlocks.filter(pb => pb.projectId === p.id).some(pb => overlapsRange(pb, rangeStart, rangeEnd));
  return ms && mst && mproj && mmine && mrange;
}

export function filterVisibleProjects(projects: Project[], ctx: ProjectFilterCtx): Project[] {
  return projects.filter(p => isProjectVisible(p, ctx));
}

/**
 * #15: khoảng hiển thị hiệu dụng từ range filter.
 *  1. Snap rangeStart/rangeEnd về tuần chứa nó (Thứ Hai→Chủ Nhật).
 *  2. Mở rộng biên để "trọn" các phase bị cắt:
 *     - phase bắt đầu trước tuần A & kết thúc ≥ A → kéo A' về tuần bắt đầu của phase.
 *     - phase kết thúc sau tuần B & bắt đầu ≤ B → kéo B' ra tuần kết thúc của phase.
 *  Trả null khi chưa chọn gì; chỉ chọn 1 đầu → lấy nguyên tuần đó.
 */
export function computeDisplayRange(
  rangeStart: string | null,
  rangeEnd: string | null,
  phaseBlocks: PhaseBlock[],
): DisplayRange | null {
  if (!rangeStart && !rangeEnd) return null;
  const A = rangeStart ? startOfWeek(parseISO(rangeStart), WEEK_OPTS) : null;
  const B = rangeEnd ? endOfWeek(parseISO(rangeEnd), WEEK_OPTS) : null;
  let start = A;
  let end = B;
  if (!start && B) start = startOfWeek(B, WEEK_OPTS); // chỉ có end → nguyên tuần end
  if (!end && A) end = endOfWeek(A, WEEK_OPTS);        // chỉ có start → nguyên tuần start
  if (!start || !end) return null;

  // Mở rộng trái: phase bị cắt bởi biên trái
  if (A) {
    const leftCut = phaseBlocks.filter(pb =>
      isBefore(parseISO(pb.startDate), A) && !isBefore(parseISO(pb.endDate), A));
    if (leftCut.length) {
      const earliest = leftCut.reduce((m, pb) => pb.startDate < m.startDate ? pb : m).startDate;
      const ext = startOfWeek(parseISO(earliest), WEEK_OPTS);
      if (isBefore(ext, start)) start = ext;
    }
  }
  // Mở rộng phải: phase bị cắt bởi biên phải
  if (B) {
    const rightCut = phaseBlocks.filter(pb =>
      isAfter(parseISO(pb.endDate), B) && !isAfter(parseISO(pb.startDate), B));
    if (rightCut.length) {
      const latest = rightCut.reduce((m, pb) => pb.endDate > m.endDate ? pb : m).endDate;
      const ext = endOfWeek(parseISO(latest), WEEK_OPTS);
      if (isAfter(ext, end)) end = ext;
    }
  }
  return { start, end };
}

/**
 * Hook dùng chung: trả về ctx (cho filter) + displayRange (cho cột timeline).
 * Cả sidebar lẫn timeline gọi cái này → không bao giờ lệch nhau.
 */
export function useProjectFilter(): { ctx: ProjectFilterCtx; displayRange: DisplayRange | null } {
  const {
    searchQuery, statusFilter, selectedProjectIds, onlyMine,
    rangeStart, rangeEnd, currentUser, phaseBlocks,
  } = useApp();
  const displayRange = useMemo(
    () => computeDisplayRange(rangeStart, rangeEnd, phaseBlocks),
    [rangeStart, rangeEnd, phaseBlocks],
  );
  const ctx = useMemo<ProjectFilterCtx>(() => ({
    searchQuery, statusFilter, selectedProjectIds, onlyMine,
    rangeStart: displayRange ? format(displayRange.start, 'yyyy-MM-dd') : null,
    rangeEnd: displayRange ? format(displayRange.end, 'yyyy-MM-dd') : null,
    currentUser, phaseBlocks,
  }), [searchQuery, statusFilter, selectedProjectIds, onlyMine, displayRange, currentUser, phaseBlocks]);
  return { ctx, displayRange };
}
