import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getUserById } from '../../data/mockData';
import { ROLE_LABELS } from '../../data/mockData';
import { projectsApi } from '../../api';
import { formatActivity } from '../../lib/formatActivity';
import type { ProjectStatus, ActivityItem } from '../../types';
import {
  X, Calendar, Trash2, Pencil, Check, FolderKanban,
  GitBranch, Clock, Crown, Lock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import DeleteReasonDialog from '../ui/DeleteReasonDialog';
import { computeProjectStatus, projectPhaseProgress, projectDateProgress, daysToNearestDeadline, isPhaseComplete } from '../../lib/projectStatus';

const STATUS_META: Record<ProjectStatus, { color: string; bg: string; border: string; bar: string }> = {
  'On Track': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: '#10b981' },
  'At Risk':  { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: '#f59e0b' },
  'Delayed':  { color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-200',     bar: '#ef4444' },
};

export default function ProjectDetailModal() {
  const {
    selectedProjectDetail, projectDetailOpen, closeProjectDetail,
    updateProject, deleteProject, changeProjectPic, phaseBlocks,
    currentUser, selectedOrg, isOwner, getPhaseMeta,
  } = useApp();

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  // #14: gom edit metadata vào 1 draft — chỉ áp khi bấm "Lưu".
  const [meta, setMeta] = useState({ name: '', description: '', startDate: '', picUserId: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const projectId = selectedProjectDetail?.id;

  const loadActivity = useCallback(async () => {
    if (!projectId) return;
    try { setActivity(await projectsApi.activity(projectId)); } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    if (selectedProjectDetail) {
      setEditingName(false);
      setEditingDesc(false);
      setConfirmDelete(false);
      setMeta({
        name: selectedProjectDetail.name,
        description: selectedProjectDetail.description ?? '',
        startDate: selectedProjectDetail.startDate,
        picUserId: selectedProjectDetail.picUserId ?? selectedProjectDetail.createdBy,
      });
      loadActivity();
    }
  }, [selectedProjectDetail?.id, loadActivity]);

  // #11: PIC-gated. updateProject giờ trả Project trực tiếp (không còn approval queue).
  const doUpdate = useCallback(async (updates: Record<string, unknown>) => {
    if (!projectId) return;
    await updateProject(projectId, updates);
    loadActivity();
  }, [projectId, updateProject, loadActivity]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeProjectDetail(); };
    if (projectDetailOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [projectDetailOpen, closeProjectDetail]);

  if (!selectedProjectDetail || !projectDetailOpen) return null;

  const project = selectedProjectDetail;
  const creator = getUserById(project.createdBy);
  const projectPbs = phaseBlocks.filter(pb => pb.projectId === project.id);
  const completePbs = projectPbs.filter(pb => isPhaseComplete(pb)).length;

  // #11: PIC hiệu dụng = picUserId ?? createdBy. Chỉ PIC/superuser sửa metadata; owner được đổi PIC.
  const effectivePicId = project.picUserId ?? project.createdBy;
  const canManage = !!currentUser && (currentUser.isSuperuser || effectivePicId === currentUser.id);
  const canChangePic = canManage || isOwner;
  const picUser = getUserById(effectivePicId);
  const orgMembers = selectedOrg?.members ?? [];

  // Deadline theo phase (#20) — không còn targetDate.
  const deadlineDays = daysToNearestDeadline(projectPbs);

  // Trạng thái & tiến độ auto (derived) — không chỉnh tay
  const autoStatus = computeProjectStatus(project, phaseBlocks);
  const autoProgress = Math.round(projectPhaseProgress(projectPbs) * 100);
  const dateProgress = Math.round(projectDateProgress(project, projectPbs) * 100); // #20: mốc = phase xa nhất
  const statusMeta = STATUS_META[autoStatus];

  // Phân bố phase theo loại — để nhìn nhanh dự án đang nặng ở giai đoạn nào
  const phaseCounts = projectPbs.reduce<Record<string, number>>((acc, pb) => {
    acc[pb.phaseType] = (acc[pb.phaseType] ?? 0) + 1;
    return acc;
  }, {});

  const metaDirty = meta.name !== project.name
    || meta.description !== (project.description ?? '')
    || meta.startDate !== project.startDate
    || meta.picUserId !== effectivePicId;

  const saveMeta = async () => {
    const updates: Record<string, unknown> = {};
    if (meta.name.trim() && meta.name !== project.name) updates.name = meta.name.trim();
    if (meta.description !== (project.description ?? '')) updates.description = meta.description.trim();
    if (meta.startDate !== project.startDate) updates.startDate = meta.startDate;
    if (Object.keys(updates).length > 0) await doUpdate(updates);
    // PIC là action riêng (endpoint /pic) — chỉ gọi khi đổi.
    if (meta.picUserId && meta.picUserId !== effectivePicId) {
      await changeProjectPic(project.id, meta.picUserId);
      loadActivity();
    }
    setEditingName(false);
    setEditingDesc(false);
  };
  const resetMeta = () => {
    setMeta({
      name: project.name, description: project.description ?? '',
      startDate: project.startDate, picUserId: effectivePicId,
    });
    setEditingName(false);
    setEditingDesc(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={closeProjectDetail}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-surface-card rounded-lg flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-stone-500" />
              </div>
              <h2 className="text-base font-bold text-ink">Chi tiết Dự án</h2>
            </div>
            <div className="flex items-center gap-1">
              {canManage ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-stone-400 hover:text-red-500"
                  title="Xóa dự án">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-stone-400 pr-2" title="Chỉ PIC mới sửa/xóa dự án">
                  <Lock className="w-3 h-3" /> Chỉ PIC
                </span>
              )}
              <button onClick={closeProjectDetail} className="p-1.5 hover:bg-stone-100 rounded-lg">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Name (editable nếu canManage) */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input type="text" value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  className="flex-1 text-lg font-bold text-ink bg-stone-50 border border-stone-300 rounded-lg px-3 py-1
                             focus:outline-none focus:ring-2 focus:ring-ink/15" />
                <button onClick={() => setEditingName(false)} className="p-1.5 bg-ink text-white rounded-lg hover:bg-[#242424]">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className={`flex items-start gap-2 group ${canManage ? 'cursor-pointer' : ''}`}
                onClick={() => canManage && setEditingName(true)}>
                <h3 className="text-lg font-bold text-ink flex-1">{meta.name}</h3>
                {canManage && <Pencil className="w-4 h-4 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />}
              </div>
            )}

            {/* Description (editable nếu canManage) */}
            {editingDesc ? (
              <div className="space-y-2">
                <textarea value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} rows={3} autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-700
                             focus:outline-none focus:ring-2 focus:ring-ink/15 resize-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingDesc(false)}
                    className="px-3 py-1.5 bg-ink text-white text-xs rounded-lg hover:bg-[#242424] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Xong
                  </button>
                </div>
              </div>
            ) : (
              <div className={`group rounded-lg -mx-1 px-1 py-1 transition-colors ${canManage ? 'cursor-pointer hover:bg-stone-50' : ''}`}
                onClick={() => canManage && setEditingDesc(true)}>
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap break-words">{meta.description || (canManage ? 'Thêm mô tả...' : '—')}</p>
                {canManage && (
                  <span className="text-[10px] text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                    <Pencil className="w-2.5 h-2.5" /> Click để chỉnh sửa
                  </span>
                )}
              </div>
            )}

            {/* Status (auto) */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1.5 block">Trạng thái (tự động)</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border
                ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusMeta.bar }} />
                {autoStatus}
              </span>
            </div>

            {/* PIC (#11) */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                <Crown className="w-3 h-3" /> Người phụ trách (PIC)
              </label>
              {canChangePic ? (
                <Dropdown className="w-60" value={meta.picUserId} onChange={uid => setMeta(m => ({ ...m, picUserId: uid }))}
                  options={orgMembers.map(m => ({
                    value: m.id, label: m.name,
                    hint: ROLE_LABELS[m.role] ?? m.role, avatar: m.avatar,
                  }))} />
              ) : picUser ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={picUser.name} src={picUser.avatar} className="w-5 h-5" />
                  <span className="text-xs font-medium text-stone-700">{picUser.name}</span>
                </div>
              ) : (
                <span className="text-xs text-stone-400">—</span>
              )}
            </div>

            {/* Dates — chỉ còn ngày bắt đầu (#20: dự án không có ngày kết thúc) */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Ngày bắt đầu
              </label>
              <input type="date" value={meta.startDate} disabled={!canManage}
                onChange={e => setMeta(m => ({ ...m, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm disabled:bg-stone-50 disabled:text-stone-400
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
            </div>

            {/* Progress (auto — trung bình % các phase) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-700">Tiến độ (theo phase)</label>
                <span className="text-xs font-bold text-ink">{autoProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${autoProgress}%`, background: statusMeta.bar }} />
              </div>
            </div>

            {/* Tiến độ theo ngày — mốc = endDate phase xa nhất (#20 item 6); chỉ tham chiếu, không phải ngày kết thúc thật */}
            {projectPbs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-700">Tiến độ (theo ngày)</label>
                  <span className="text-xs font-bold text-ink">{dateProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-stone-400 transition-all" style={{ width: `${dateProgress}%` }} />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {dateProgress > autoProgress
                    ? `Phase đang chậm hơn lịch ${dateProgress - autoProgress}%`
                    : 'Phase đang bắt kịp hoặc vượt lịch'}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-card rounded-lg p-3 border border-hairline">
                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium mb-0.5">
                  <GitBranch className="w-3 h-3" /> Phase
                </div>
                <div className="text-base font-bold text-ink">{projectPbs.length}</div>
              </div>
              <div className="bg-surface-card rounded-lg p-3 border border-hairline">
                <div className="text-[10px] text-stone-400 font-medium mb-0.5">Hoàn thành</div>
                <div className="text-base font-bold text-emerald-600">{completePbs}</div>
              </div>
              <div className="bg-surface-card rounded-lg p-3 border border-hairline">
                <div className="text-[10px] text-stone-400 font-medium mb-0.5">Hạn phase gần nhất</div>
                <div className={`text-base font-bold ${deadlineDays !== null && deadlineDays < 0 ? 'text-red-500' : deadlineDays !== null && deadlineDays < 7 ? 'text-amber-600' : 'text-ink'}`}>
                  {deadlineDays === null ? '—' : deadlineDays >= 0 ? `${deadlineDays} ngày` : `Quá ${Math.abs(deadlineDays)}d`}
                </div>
              </div>
            </div>

            {/* Phase distribution */}
            {projectPbs.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1.5 block">Phân bố phase</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(phaseCounts).map(([phase, count]) => {
                    const meta = getPhaseMeta(phase);
                    return (
                      <span key={phase}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${meta.bg} ${meta.color} ${meta.border}`}>
                        {meta.label} × {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between pt-1 border-t border-hairline">
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-stone-400">Người tạo:</span>
                {creator && (
                  <div className="flex items-center gap-1.5">
                    <Avatar name={creator.name} src={creator.avatar} className="w-5 h-5" />
                    <span className="text-xs font-medium text-stone-700">{creator.name}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-stone-400 pt-2">
                Bắt đầu {format(parseISO(project.startDate), 'dd/MM/yyyy')}
              </span>
            </div>

            {/* Changelog dự án — ai đã làm gì với phase */}
            <div className="pt-2 border-t border-hairline">
              <label className="text-xs font-semibold text-stone-700 mb-2 mt-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Lịch sử thay đổi ({activity.length})
              </label>
              {activity.length === 0 ? (
                <p className="text-xs text-stone-400 py-2">Chưa có hoạt động nào.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activity.map(a => {
                    const user = getUserById(a.userId);
                    const block = a.phaseBlockId ? phaseBlocks.find(b => b.id === a.phaseBlockId) : null;
                    const { verb, detail } = formatActivity(a.action, a.target, getUserById);
                    // 'created/deleted/renamed phase' đã có tên ở target → không lặp lại
                    const isPhaseNameAction = /\bphase$/.test(a.action);
                    const phaseName = !isPhaseNameAction ? block?.title : null;
                    return (
                      <div key={a.id} className="flex gap-2.5 items-start">
                        <Avatar name={user?.name} src={user?.avatar} className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-700">
                            <span className="font-medium">{user?.name ?? 'Ai đó'}</span> {verb}
                            {phaseName && <span className="text-stone-700"> · phase “{phaseName}”</span>}
                            {detail && <span className="text-stone-500"> — {detail}</span>}
                          </p>
                          <p className="text-[10px] text-stone-400">{format(parseISO(a.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* #14: thanh Lưu metadata — chỉ áp khi bấm Lưu */}
          {metaDirty && (
            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-hairline bg-amber-50/60">
              <span className="text-xs font-semibold text-amber-700">Có thay đổi chưa lưu</span>
              <div className="flex items-center gap-2">
                <button onClick={resetMeta}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors">
                  Hoàn tác
                </button>
                <button onClick={saveMeta}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-ink text-white rounded-lg hover:bg-[#242424] transition-colors">
                  <Check className="w-3.5 h-3.5" /> Lưu
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* #14: xóa dự án cần nhập lý do → log vào activity workspace */}
      {confirmDelete && (
        <DeleteReasonDialog
          title="Xóa dự án"
          message={`Xóa dự án "${project.name}" cùng toàn bộ phase? Hành động này không thể hoàn tác.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async (reason) => {
            setConfirmDelete(false);
            await deleteProject(project.id, reason);
            closeProjectDetail();
          }}
        />
      )}
    </AnimatePresence>
  );
}
