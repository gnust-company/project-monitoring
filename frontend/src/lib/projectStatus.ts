import { parseISO, differenceInCalendarDays } from 'date-fns';
import type { Project, PhaseBlock, ProjectStatus } from '../types';

// ─── Tiến độ & trạng thái dự án (auto, derived) — #20 redesign ─────────
// Dự án KHÔNG còn targetDate. Mốc "ngày kết thúc" dùng cho tiến độ-theo-ngày
// và tính At Risk là **endDate của phase xa nhất** (phase muộn nhất) — CHỈ là mốc
// tham chiếu, không phải ngày kết thúc thật (vì có thể thêm phase sau).
// Hoàn tất phase = checklist tick hết (đã bỏ tag phase).
//
//  - Delayed: có ≥1 phase quá endDate mà chưa tick hết checklist.
//  - At Risk: không Delayed, nhưng phaseProgress < dateProgress (thực chậm hơn lịch).
//  - On Track: còn lại.

/** Phase HOÀN TẤT khi checklist tick hết (bỏ tag phase — #2). */
export function isPhaseComplete(pb: PhaseBlock): boolean {
  return pb.checklist.length > 0 && pb.checklist.every(c => c.done);
}

/** % hoàn thành của 1 phase block (0..1). Hoàn tất = 1. */
export function phaseBlockProgress(pb: PhaseBlock): number {
  if (isPhaseComplete(pb)) return 1;
  const total = pb.checklist.length;
  if (total === 0) return 0;
  return pb.checklist.filter(c => c.done).length / total;
}

/** Tiến độ dự án theo phase (0..1) — trung bình tất cả phase. */
export function projectPhaseProgress(blocks: PhaseBlock[]): number {
  if (blocks.length === 0) return 0;
  const sum = blocks.reduce((acc, b) => acc + phaseBlockProgress(b), 0);
  return sum / blocks.length;
}

/** endDate xa nhất (phase muộn nhất) của dự án — mốc tham chiếu cho tiến độ ngày. */
export function latestPhaseEndDate(blocks: PhaseBlock[]): string | null {
  if (blocks.length === 0) return null;
  const latest = blocks
    .map(b => parseISO(b.endDate).getTime())
    .reduce((max, t) => (t > max ? t : max), 0);
  return new Date(latest).toISOString();
}

/**
 * Tiến độ dự án theo NGÀY (0..1): từ startDate → endDate của phase xa nhất.
 * CHỈ để xem tiến độ lịch + tính At Risk — KHÔNG phải ngày kết thúc thật (#20).
 */
export function projectDateProgress(
  project: Project, blocks: PhaseBlock[], today = new Date(),
): number {
  const start = parseISO(project.startDate);
  const endIso = latestPhaseEndDate(blocks);
  if (!endIso) return 0;
  const target = parseISO(endIso);
  const totalDays = differenceInCalendarDays(target, start);
  if (totalDays <= 0) return 1;
  const elapsed = differenceInCalendarDays(today, start);
  return Math.max(0, Math.min(1, elapsed / totalDays));
}

/** Một phase trễ nếu quá endDate mà chưa hoàn tất. */
export function isPhaseDelayed(pb: PhaseBlock, today = new Date()): boolean {
  if (isPhaseComplete(pb)) return false;
  return today > parseISO(pb.endDate);
}

/** Hạn gần nhất = endDate sớm nhất trong các phase CHƯA hoàn tất (null nếu không có). */
export function nearestPhaseDeadline(blocks: PhaseBlock[]): string | null {
  const upcoming = blocks
    .filter(b => !isPhaseComplete(b))
    .map(b => parseISO(b.endDate))
    .sort((a, b) => a.getTime() - b.getTime());
  if (upcoming.length === 0) return null;
  return upcoming[0].toISOString();
}

/** Số ngày đến hạn phase gần nhất (âm = đã quá hạn). null nếu không có phase đang chạy. */
export function daysToNearestDeadline(blocks: PhaseBlock[], today = new Date()): number | null {
  const iso = nearestPhaseDeadline(blocks);
  if (!iso) return null;
  return differenceInCalendarDays(parseISO(iso), today);
}

/** Trạng thái auto của dự án — Delayed/At Risk/On Track, suy từ phase. */
export function computeProjectStatus(
  project: Project,
  blocks: PhaseBlock[],
  today = new Date(),
): ProjectStatus {
  const projectBlocks = blocks.filter(b => b.projectId === project.id);

  // Delayed: có phase quá hạn chưa xong.
  if (projectBlocks.some(b => isPhaseDelayed(b, today))) return 'Delayed';

  // At Risk: tiến độ thực (phase) chậm hơn tiến độ lịch (dateProgress theo phase xa nhất).
  if (projectBlocks.length > 0) {
    const dateProgress = projectDateProgress(project, projectBlocks, today);
    if (projectPhaseProgress(projectBlocks) < dateProgress) return 'At Risk';
  }

  return 'On Track';
}
