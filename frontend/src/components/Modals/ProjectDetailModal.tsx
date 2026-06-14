import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getUserById } from '../../data/mockData';
import { projectsApi } from '../../api';
import { PHASE_META } from '../../types';
import type { ProjectStatus, ActivityItem } from '../../types';
import {
  X, Calendar, Trash2, Pencil, Check, FolderKanban,
  GitBranch, AlertTriangle, Clock, Hourglass,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const STATUS_OPTIONS: { value: ProjectStatus; color: string; bg: string; border: string }[] = [
  { value: 'On Track', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'At Risk',  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { value: 'Delayed',  color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-200' },
];

export default function ProjectDetailModal() {
  const {
    selectedProjectDetail, projectDetailOpen, closeProjectDetail,
    updateProject, deleteProject, phaseBlocks,
  } = useApp();

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

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
      setPendingMsg(null);
      loadActivity();
    }
  }, [selectedProjectDetail?.id, loadActivity]);

  // Member sửa → 202 pending; bọc updateProject để hiện thông báo
  const doUpdate = useCallback(async (updates: Record<string, unknown>) => {
    if (!projectId) return;
    const res = await updateProject(projectId, updates);
    if (res.pending) setPendingMsg('Thay đổi đã gửi cho chủ workspace duyệt.');
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
  const completePbs = projectPbs.filter(pb => pb.tag === 'Complete').length;
  const daysLeft = differenceInDays(parseISO(project.targetDate), new Date());

  // Phân bố phase theo loại — để nhìn nhanh dự án đang nặng ở giai đoạn nào
  const phaseCounts = projectPbs.reduce<Record<string, number>>((acc, pb) => {
    acc[pb.phaseType] = (acc[pb.phaseType] ?? 0) + 1;
    return acc;
  }, {});

  const saveName = () => {
    if (!nameDraft.trim()) return;
    doUpdate({ name: nameDraft.trim() });
    setEditingName(false);
  };

  const saveDesc = () => {
    doUpdate({ description: descDraft.trim() });
    setEditingDesc(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    const res = await deleteProject(project.id);
    if (res.pending) {
      setPendingMsg('Yêu cầu xóa đã gửi cho chủ workspace duyệt.');
      setConfirmDelete(false);
    } else {
      closeProjectDetail();
    }
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
              <button onClick={handleDelete}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold
                  ${confirmDelete ? 'bg-red-500 text-white px-2.5 hover:bg-red-600' : 'hover:bg-red-50 text-stone-400 hover:text-red-500'}`}
                title={confirmDelete ? 'Click lần nữa để xóa vĩnh viễn' : 'Xóa dự án'}>
                {confirmDelete ? (<><AlertTriangle className="w-3.5 h-3.5" /> Xác nhận xóa?</>) : <Trash2 className="w-4 h-4" />}
              </button>
              <button onClick={closeProjectDetail} className="p-1.5 hover:bg-stone-100 rounded-lg">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {pendingMsg && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <Hourglass className="w-3.5 h-3.5 shrink-0" /> {pendingMsg}
              </div>
            )}
            {/* Name (editable) */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  className="flex-1 text-lg font-bold text-ink bg-stone-50 border border-stone-300 rounded-lg px-3 py-1
                             focus:outline-none focus:ring-2 focus:ring-ink/15" />
                <button onClick={saveName} className="p-1.5 bg-ink text-white rounded-lg hover:bg-[#242424]">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 group cursor-pointer"
                onClick={() => { setNameDraft(project.name); setEditingName(true); }}>
                <h3 className="text-lg font-bold text-ink flex-1">{project.name}</h3>
                <Pencil className="w-4 h-4 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
              </div>
            )}

            {/* Description (editable) */}
            {editingDesc ? (
              <div className="space-y-2">
                <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={3} autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false); }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-700
                             focus:outline-none focus:ring-2 focus:ring-ink/15 resize-none" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingDesc(false)}
                    className="px-3 py-1 text-xs text-stone-500 hover:text-stone-700">Hủy</button>
                  <button onClick={saveDesc}
                    className="px-3 py-1.5 bg-ink text-white text-xs rounded-lg hover:bg-[#242424] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="group cursor-pointer rounded-lg -mx-1 px-1 py-1 hover:bg-stone-50 transition-colors"
                onClick={() => { setDescDraft(project.description); setEditingDesc(true); }}>
                <p className="text-sm text-stone-600 leading-relaxed">{project.description || 'Thêm mô tả...'}</p>
                <span className="text-[10px] text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                  <Pencil className="w-2.5 h-2.5" /> Click để chỉnh sửa
                </span>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1.5 block">Trạng thái</label>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value}
                    onClick={() => doUpdate({ status: opt.value })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all
                      ${project.status === opt.value
                        ? `${opt.bg} ${opt.color} ${opt.border}`
                        : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300'}`}>
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Bắt đầu
                </label>
                <input type="date" value={project.startDate}
                  onChange={e => doUpdate({ startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Ngày mục tiêu
                </label>
                <input type="date" value={project.targetDate}
                  onChange={e => doUpdate({ targetDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
              </div>
            </div>

            {/* Progress (editable) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-700">Tiến độ</label>
                <span className="text-xs font-bold text-ink">{project.progress}%</span>
              </div>
              <input type="range" min={0} max={100} value={project.progress}
                onChange={e => doUpdate({ progress: Number(e.target.value) })}
                className="w-full accent-ink" />
            </div>

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
                <div className="text-[10px] text-stone-400 font-medium mb-0.5">Deadline</div>
                <div className={`text-base font-bold ${daysLeft < 7 ? 'text-red-500' : 'text-ink'}`}>
                  {daysLeft >= 0 ? `${daysLeft} ngày` : `Quá ${Math.abs(daysLeft)}d`}
                </div>
              </div>
            </div>

            {/* Phase distribution */}
            {projectPbs.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1.5 block">Phân bố phase</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(phaseCounts).map(([phase, count]) => {
                    const meta = PHASE_META[phase as keyof typeof PHASE_META];
                    return (
                      <span key={phase}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${meta.bg} ${meta.color} ${meta.border}`}>
                        {phase} × {count}
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
                    <img src={creator.avatar} className="w-5 h-5 rounded-full" alt="" />
                    <span className="text-xs font-medium text-stone-700">{creator.name}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-stone-400 pt-2">
                {format(parseISO(project.startDate), 'dd/MM/yyyy')} – {format(parseISO(project.targetDate), 'dd/MM/yyyy')}
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
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {activity.map(a => {
                    const user = getUserById(a.userId);
                    return (
                      <div key={a.id} className="flex gap-2.5 items-start">
                        <img src={user?.avatar} className="w-5 h-5 rounded-full bg-stone-200 mt-0.5 shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-700">
                            <span className="font-medium">{user?.name ?? 'Ai đó'}</span> {a.action}
                            {a.target && <span className="text-stone-500"> — {a.target}</span>}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
