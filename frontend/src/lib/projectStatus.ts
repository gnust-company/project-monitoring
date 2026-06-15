import { parseISO, differenceInCalendarDays } from 'date-fns';
import type { Project, PhaseBlock, ProjectStatus } from '../types';

// ─── Tiến độ & trạng thái dự án (auto, derived) ──────────────────────
// Theo issue #3.7:
//  - Tiến độ theo NGÀY: từ startDate → targetDate là 100%. Hôm nay chiếm
//    daysElapsed / totalDays (clamp 0..1).
//  - Tiến độ theo PHASE: trung bình % hoàn thành của các phase trong dự án.
//    % mỗi phase = số checklist done / tổng checklist (Complete = 100%).
//  - Delayed: có ≥1 phase trễ (hôm nay > endDate mà phase chưa Complete/Canceled).
//  - At Risk: phaseProgress < dateProgress (tiến độ thực chậm hơn theo ngày).
//  - On Track: còn lại.

const ACTIVE_DONE_TAGS = new Set(['Complete', 'Canceled']);

/** % hoàn thành của 1 phase block (0..1). Complete = 1 dù chưa tick hết. */
export function phaseBlockProgress(pb: PhaseBlock): number {
  if (pb.tag === 'Complete') return 1;
  if (pb.tag === 'Canceled') return 1; // không tính là việc tồn đọng
  const total = pb.checklist.length;
  if (total === 0) return pb.tag === 'Inprogress' ? 0.5 : 0;
  return pb.checklist.filter(c => c.done).length / total;
}

/** Tiến độ dự án theo ngày (0..1). */
export function projectDateProgress(project: Project, today = new Date()): number {
  const start = parseISO(project.startDate);
  const target = parseISO(project.targetDate);
  const totalDays = differenceInCalendarDays(target, start);
  if (totalDays <= 0) return 1;
  const elapsed = differenceInCalendarDays(today, start);
  return Math.max(0, Math.min(1, elapsed / totalDays));
}

/** Tiến độ dự án theo phase (0..1) — trung bình các phase (bỏ Canceled). */
export function projectPhaseProgress(blocks: PhaseBlock[]): number {
  const counted = blocks.filter(b => b.tag !== 'Canceled');
  if (counted.length === 0) return 0;
  const sum = counted.reduce((acc, b) => acc + phaseBlockProgress(b), 0);
  return sum / counted.length;
}

/** Một phase được coi là trễ nếu quá endDate mà chưa hoàn tất/hủy. */
export function isPhaseDelayed(pb: PhaseBlock, today = new Date()): boolean {
  if (ACTIVE_DONE_TAGS.has(pb.tag)) return false;
  return today > parseISO(pb.endDate);
}

/** Trạng thái auto của dự án dựa trên ngày + tiến độ phase. */
export function computeProjectStatus(
  project: Project,
  blocks: PhaseBlock[],
  today = new Date(),
): ProjectStatus {
  const projectBlocks = blocks.filter(b => b.projectId === project.id);

  if (projectBlocks.some(b => isPhaseDelayed(b, today))) return 'Delayed';

  const dateProgress = projectDateProgress(project, today);
  const phaseProgress = projectPhaseProgress(projectBlocks);
  if (phaseProgress < dateProgress) return 'At Risk';

  return 'On Track';
}
