import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getUserById, ROLE_LABELS } from '../../data/mockData';
import { PHASE_META, PHASE_ROLE_TASKS, PHASE_ROLE_OUTCOMES, DEV_PHASES } from '../../types';
import type { ChecklistItem, UserRole, DevPhase } from '../../types';
import {
  X, CheckSquare, Square, MessageSquare, Paperclip, Clock,
  Send, HelpCircle, Users, Calendar, Plus, Trash2, Pencil, Check,
  Link2, ExternalLink, FileText, ChevronDown, Target, UserCircle2, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import DeleteReasonDialog from '../ui/DeleteReasonDialog';
import FileUploadModal from '../ui/FileUploadModal';
import { formatActivity } from '../../lib/formatActivity';

// Gom item theo role — luôn hiện đủ role chuẩn của phase (kèm ô thêm riêng),
// thêm role lạ nếu có, cuối cùng là nhóm "Chung".
function buildGroups(items: ChecklistItem[], roles: UserRole[]): Array<{ role: UserRole | null; items: ChecklistItem[] }> {
  const ordered: UserRole[] = [...roles];
  for (const it of items) if (it.role && !ordered.includes(it.role)) ordered.push(it.role);
  const groups = ordered.map(role => ({ role: role as UserRole | null, items: items.filter(i => i.role === role) }));
  groups.push({ role: null, items: items.filter(i => !i.role) });
  return groups;
}

export default function PhaseDetailModal() {
  const {
    selectedPhaseBlock, phaseDetailOpen, closePhaseDetail,
    updatePhaseBlock, deletePhaseBlock, orgProjects,
    addPhaseItem, updatePhaseItem, deletePhaseItem,
    addPhaseComment, addPhaseLink, uploadPhaseFile, deletePhaseAttachment,
    currentUser, selectedOrg,
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [checkDrafts, setCheckDrafts] = useState<Record<string, string>>({});
  const [outcomeDrafts, setOutcomeDrafts] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState(selectedPhaseBlock?.checklist || []);
  const [outcomes, setOutcomes] = useState(selectedPhaseBlock?.outcomes || []);
  const [comments, setComments] = useState(selectedPhaseBlock?.comments || []);
  const [attachments, setAttachments] = useState(selectedPhaseBlock?.attachments || []);

  // Inline editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // #14: gom mọi edit metadata vào 1 draft — chỉ áp khi bấm "Lưu" (không auto-apply).
  const [meta, setMeta] = useState({
    title: '', description: '', phaseType: 'PA' as DevPhase,
    startDate: '', endDate: '', assignee: null as string | null, participants: [] as string[],
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Checklist inline edit
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [editingCheckText, setEditingCheckText] = useState('');

  // Document link form
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  // #22: modal tải nhiều tệp (kéo-thả + progress)
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Collapsible sections — mặc định thu gọn
  const [expandChecklist, setExpandChecklist] = useState(false);
  const [expandOutcomes, setExpandOutcomes] = useState(false);
  const [expandDocs, setExpandDocs] = useState(false);

  // #9: đính kèm tài liệu theo từng outcome
  const [outcomeAttachId, setOutcomeAttachId] = useState<string | null>(null);
  const [oLinkName, setOLinkName] = useState('');
  const [oLinkUrl, setOLinkUrl] = useState('');
  const outcomeFileRef = useRef<HTMLInputElement>(null);
  const outcomeFileTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedPhaseBlock) {
      setChecklist(selectedPhaseBlock.checklist);
      setOutcomes(selectedPhaseBlock.outcomes || []);
      setComments(selectedPhaseBlock.comments);
      setAttachments(selectedPhaseBlock.attachments);
      setCommentText('');
      setCheckDrafts({});
      setOutcomeDrafts({});
      setMeta({
        title: selectedPhaseBlock.title,
        description: selectedPhaseBlock.description ?? '',
        phaseType: selectedPhaseBlock.phaseType,
        startDate: selectedPhaseBlock.startDate,
        endDate: selectedPhaseBlock.endDate,
        assignee: selectedPhaseBlock.assignee ?? null,
        participants: selectedPhaseBlock.participants,
      });
      setEditingTitle(false);
      setEditingDesc(false);
      setEditingCheckId(null);
      setShowLinkForm(false);
      setLinkName('');
      setLinkUrl('');
      setExpandChecklist(false);
      setExpandOutcomes(false);
      setExpandDocs(false);
      setOutcomeAttachId(null);
      setOLinkName('');
      setOLinkUrl('');
      setConfirmDelete(false);
    }
  }, [selectedPhaseBlock?.id]);

  // Đồng bộ dữ liệu mỗi khi block thay đổi (sau refetch từ API) — cập nhật ngay,
  // không phải đóng/mở lại modal.
  useEffect(() => {
    if (!selectedPhaseBlock) return;
    setChecklist(selectedPhaseBlock.checklist);
    setOutcomes(selectedPhaseBlock.outcomes || []);
    setComments(selectedPhaseBlock.comments);
    setAttachments(selectedPhaseBlock.attachments);
  }, [selectedPhaseBlock]);

  // #14: draft metadata bẩn (khác block gốc) → hiện thanh Lưu/Hoàn tác.
  const metaDirty = !!selectedPhaseBlock && (
    meta.title !== selectedPhaseBlock.title
    || meta.description !== (selectedPhaseBlock.description ?? '')
    || meta.phaseType !== selectedPhaseBlock.phaseType
    || meta.startDate !== selectedPhaseBlock.startDate
    || meta.endDate !== selectedPhaseBlock.endDate
    || (meta.assignee ?? '') !== (selectedPhaseBlock.assignee ?? '')
    || meta.participants.join(',') !== selectedPhaseBlock.participants.join(',')
  );

  // #19: click backdrop KHÔNG đóng modal (chỉ nút X đóng). Esc chỉ đóng khi KHÔNG có
  // nội dung đang soạn — tránh lỡ tay mất title/desc/checklist/comment/link đang dở.
  const hasDraft = editingTitle || editingDesc || editingCheckId !== null || metaDirty
    || commentText.trim() !== '' || linkName.trim() !== '' || linkUrl.trim() !== ''
    || oLinkName.trim() !== '' || oLinkUrl.trim() !== '';

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hasDraft) closePhaseDetail();
    };
    if (phaseDetailOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [phaseDetailOpen, closePhaseDetail, hasDraft]);


  const checklistRoles = selectedPhaseBlock ? PHASE_ROLE_TASKS[selectedPhaseBlock.phaseType].map(x => x.role) : [];
  const outcomeRoles = selectedPhaseBlock ? PHASE_ROLE_OUTCOMES[selectedPhaseBlock.phaseType].map(x => x.role) : [];
  const checklistGroups = useMemo(() => buildGroups(checklist, checklistRoles), [checklist, checklistRoles]);
  const outcomeGroups = useMemo(() => buildGroups(outcomes, outcomeRoles), [outcomes, outcomeRoles]);

  const groupKey = (role: UserRole | null) => role ?? '__general__';
  const addCheckItem = (role: UserRole | null) => {
    const key = groupKey(role);
    const text = (checkDrafts[key] ?? '').trim();
    if (!text || !selectedPhaseBlock) return;
    addPhaseItem(selectedPhaseBlock.id, 'checklist', text, role ?? undefined);
    setCheckDrafts(d => ({ ...d, [key]: '' }));
  };
  const addOutcomeItemFor = (role: UserRole | null) => {
    const key = groupKey(role);
    const text = (outcomeDrafts[key] ?? '').trim();
    if (!text || !selectedPhaseBlock) return;
    addPhaseItem(selectedPhaseBlock.id, 'outcome', text, role ?? undefined);
    setOutcomeDrafts(d => ({ ...d, [key]: '' }));
  };

  const toggleCheckItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    const item = checklist.find(i => i.id === itemId);
    setChecklist(checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
    updatePhaseItem(selectedPhaseBlock.id, itemId, { done: !item?.done });
  };

  // #9: tài liệu đính kèm cho 1 outcome
  const outcomeAtts = (itemId: string) =>
    attachments.filter(a => a.outcomeItemId === itemId);

  const toggleOutcomeItem = async (itemId: string) => {
    if (!selectedPhaseBlock) return;
    const item = outcomes.find(i => i.id === itemId);
    if (!item) return;
    // #9: chưa có tài liệu → không cho tick done (vẫn cho phép bỏ tick).
    if (!item.done && outcomeAtts(itemId).length === 0) return;
    setOutcomes(outcomes.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
    try {
      await updatePhaseItem(selectedPhaseBlock.id, itemId, { done: !item.done });
    } catch {
      // BE từ chối (vd 422) — context đã revert, đồng bộ lại local.
      setOutcomes(selectedPhaseBlock.outcomes || []);
    }
  };

  const handleOutcomeLink = async (itemId: string) => {
    if (!selectedPhaseBlock || !oLinkUrl.trim()) return;
    let url = oLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    await addPhaseLink(selectedPhaseBlock.id, oLinkName.trim() || url, url, itemId);
    setOLinkName('');
    setOLinkUrl('');
    setOutcomeAttachId(null);
  };

  const handleOutcomeFilePick = (itemId: string) => {
    outcomeFileTargetRef.current = itemId;
    outcomeFileRef.current?.click();
  };

  const handleOutcomeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const itemId = outcomeFileTargetRef.current;
    if (!file || !selectedPhaseBlock || !itemId) return;
    uploadPhaseFile(selectedPhaseBlock.id, file, itemId);
    if (outcomeFileRef.current) outcomeFileRef.current.value = '';
    outcomeFileTargetRef.current = null;
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    setChecklist(checklist.filter(i => i.id !== itemId));
    deletePhaseItem(selectedPhaseBlock.id, itemId);
  };

  const handleDeleteOutcomeItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    setOutcomes(outcomes.filter(i => i.id !== itemId));
    deletePhaseItem(selectedPhaseBlock.id, itemId);
  };

  const startEditCheckItem = (itemId: string, text: string) => {
    setEditingCheckId(itemId);
    setEditingCheckText(text);
  };

  const saveEditCheckItem = () => {
    if (!selectedPhaseBlock || !editingCheckId || !editingCheckText.trim()) return;
    updatePhaseItem(selectedPhaseBlock.id, editingCheckId, { text: editingCheckText.trim() });
    setEditingCheckId(null);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedPhaseBlock) return;
    addPhaseComment(selectedPhaseBlock.id, commentText.trim());
    setCommentText('');
  };

  const handleAttachLink = () => {
    if (!selectedPhaseBlock || !linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    addPhaseLink(selectedPhaseBlock.id, linkName.trim() || url, url);
    setLinkName('');
    setLinkUrl('');
    setShowLinkForm(false);
  };

  const handleDeleteAttachment = (attId: string) => {
    if (!selectedPhaseBlock) return;
    setAttachments(attachments.filter(a => a.id !== attId));
    deletePhaseAttachment(selectedPhaseBlock.id, attId);
  };

  const handleDelete = () => setConfirmDelete(true);

  if (!selectedPhaseBlock || !phaseDetailOpen) return null;

  const phaseMeta = PHASE_META[meta.phaseType]; // theo draft → phản ánh loại phase đang chọn
  const project = orgProjects.find(p => p.id === selectedPhaseBlock.projectId);
  const completedChecks = checklist.filter(c => c.done).length;
  const progressPct = checklist.length > 0 ? Math.round((completedChecks / checklist.length) * 100) : 0;
  // #8: tiến độ phase gộp checklist + outcomes (dùng cho badge tổng quan ở header).
  const totalItems = checklist.length + outcomes.length;
  const phasePct = totalItems > 0
    ? Math.round(((completedChecks + outcomes.filter(o => o.done).length) / totalItems) * 100)
    : 0;
  const orgMembers = selectedOrg?.members ?? [];
  // #11/#4: PIC phase = assignee (đổi được) hoặc người tạo. Chỉ PIC/superuser sửa metadata.
  // canEdit theo block GỐC (không mất quyền giữa chừng khi đang đổi PIC trong draft).
  const origPicId = selectedPhaseBlock.assignee ?? selectedPhaseBlock.createdBy;
  const phasePicId = meta.assignee ?? selectedPhaseBlock.createdBy; // hiển thị theo draft
  const picUser = getUserById(phasePicId);
  const canEditPhase = !!currentUser && (currentUser.isSuperuser || origPicId === currentUser.id);
  const participants = meta.participants;
  const addableMembers = orgMembers.filter(m => !participants.includes(m.id));

  // #14: control sửa → ghi vào draft, KHÔNG gọi API ngay; bấm "Lưu" mới áp dụng.
  const changePic = (uid: string) => setMeta(m => ({ ...m, assignee: uid }));
  const addParticipant = (uid: string) =>
    setMeta(m => ({ ...m, participants: Array.from(new Set([...m.participants, uid])) }));
  const removeParticipant = (uid: string) =>
    setMeta(m => ({ ...m, participants: m.participants.filter(p => p !== uid) }));

  const resetMeta = () => setMeta({
    title: selectedPhaseBlock.title,
    description: selectedPhaseBlock.description ?? '',
    phaseType: selectedPhaseBlock.phaseType,
    startDate: selectedPhaseBlock.startDate,
    endDate: selectedPhaseBlock.endDate,
    assignee: selectedPhaseBlock.assignee ?? null,
    participants: selectedPhaseBlock.participants,
  });
  const saveMeta = () => {
    const b = selectedPhaseBlock;
    const updates: Record<string, unknown> = {};
    if (meta.title.trim() && meta.title !== b.title) updates.title = meta.title.trim();
    if (meta.description !== (b.description ?? '')) updates.description = meta.description.trim();
    if (meta.phaseType !== b.phaseType) updates.phaseType = meta.phaseType;
    if (meta.startDate !== b.startDate) updates.startDate = meta.startDate;
    if (meta.endDate !== b.endDate) updates.endDate = meta.endDate;
    if ((meta.assignee ?? '') !== (b.assignee ?? '')) updates.assignee = meta.assignee;
    if (meta.participants.join(',') !== b.participants.join(',')) updates.participants = meta.participants;
    if (Object.keys(updates).length > 0) updatePhaseBlock(b.id, updates);
    setEditingTitle(false);
    setEditingDesc(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex justify-end"
      >
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <div className="flex items-center gap-2">
              {/* #17: PIC đổi được loại phase (tên đầy đủ); giữ nguyên checklist/outcome hiện có */}
              {canEditPhase ? (
                <Dropdown className="w-52" value={meta.phaseType}
                  onChange={v => setMeta(m => ({ ...m, phaseType: v as DevPhase }))}
                  options={DEV_PHASES.map(p => ({
                    value: p, label: PHASE_META[p].fullLabel,
                    dotClass: PHASE_META[p].solid, labelClass: PHASE_META[p].color,
                  }))} />
              ) : (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${phaseMeta.bg} ${phaseMeta.color} border ${phaseMeta.border}`}>
                  {phaseMeta.fullLabel}
                </span>
              )}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                {phasePct}% hoàn thành
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleDelete}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group" title="Xóa">
                <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
              </button>
              <button onClick={closePhaseDetail} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Title (editable) */}
            <div className="px-6 pb-3">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false); if (e.key === 'Escape') setEditingTitle(false); }}
                    autoFocus
                    className="flex-1 text-xl font-bold text-slate-900 bg-gray-50 border border-slate-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  <button onClick={() => setEditingTitle(false)} className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 group cursor-pointer" onClick={() => canEditPhase && setEditingTitle(true)}>
                  <h2 className="text-xl font-bold text-slate-900 flex-1">{meta.title}</h2>
                  {canEditPhase && <Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 shrink-0" />}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>Dự án: <span className="font-medium text-slate-700">{project?.name}</span></span>
              </div>
            </div>

            {/* Date Editing */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Bắt đầu
                  </label>
                  <input type="date"
                    value={meta.startDate}
                    onChange={e => setMeta(m => ({ ...m, startDate: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Kết thúc
                  </label>
                  <input type="date"
                    value={meta.endDate}
                    onChange={e => setMeta(m => ({ ...m, endDate: e.target.value }))}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>
            </div>

            {/* Description (editable) */}
            <div className="px-6 pb-4">
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} rows={3} autoFocus
                    onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-slate-300 rounded-lg text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingDesc(false)}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Xong
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`group rounded-lg -mx-1 px-1 py-1 transition-colors ${canEditPhase ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => canEditPhase && setEditingDesc(true)}>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{meta.description || 'Thêm mô tả...'}</p>
                  {canEditPhase && (
                    <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                      <Pencil className="w-2.5 h-2.5" /> Click để chỉnh sửa
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Phase Info Card */}
            <div className="px-6 pb-4">
              <div className={`${phaseMeta.bg} border ${phaseMeta.border} rounded-lg p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <HelpCircle className={`w-3.5 h-3.5 ${phaseMeta.color}`} />
                  <span className={`text-xs font-semibold ${phaseMeta.color}`}>{phaseMeta.label}</span>
                </div>
                <p className="text-xs text-gray-600">{phaseMeta.desc}</p>
              </div>
            </div>

            {/* PIC (creator), Participants (#13: bỏ assignee — PIC = người tạo) */}
            <div className="px-6 pb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {/* PIC (đổi được nếu canEditPhase) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                    <UserCircle2 className="w-3.5 h-3.5" /> PIC
                  </span>
                  {canEditPhase ? (
                    <Dropdown className="w-52" value={phasePicId} onChange={changePic}
                      options={orgMembers.map(m => ({
                        value: m.id, label: m.name,
                        hint: ROLE_LABELS[m.role] ?? m.role, avatar: m.avatar,
                      }))} />
                  ) : picUser ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={picUser.name} src={picUser.avatar} className="w-5 h-5" />
                      <span className="text-xs font-medium text-slate-700">{picUser.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Participants — avatar stack, hover expand + tooltip tên + add/remove */}
                <div className="flex items-center gap-2 group/parts">
                  <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                    <Users className="w-3.5 h-3.5" /> Người tham gia
                  </span>
                  <div className="flex items-center">
                    {participants.map((uid, idx) => {
                      const u = getUserById(uid);
                      return (
                        <div key={uid}
                          style={{ zIndex: participants.length - idx }}
                          className="relative -ml-2 first:ml-0 transition-all duration-200 group-hover/parts:ml-0 group/member">
                          <Avatar name={u?.name} src={u?.avatar}
                            className="w-6 h-6 border-2 border-white ring-1 ring-gray-200 cursor-default" />
                          {/* tooltip tên */}
                          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5
                            whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white
                            opacity-0 group-hover/member:opacity-100 transition-opacity z-20">
                            {u?.name ?? 'Người dùng'}
                          </span>
                          {/* nút xóa (chỉ PIC) */}
                          {canEditPhase && (
                            <button onClick={() => removeParticipant(uid)} title={`Xóa ${u?.name ?? ''}`}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full
                                flex items-center justify-center opacity-0 group-hover/member:opacity-100
                                hover:bg-red-600 transition-opacity z-20">
                              <X className="w-2 h-2" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {/* nút thêm (chỉ PIC) */}
                    {canEditPhase && (
                      <div className="relative -ml-2 transition-all duration-200 group-hover/parts:ml-0">
                        <button onClick={() => setShowAddParticipant(s => !s)}
                          title="Thêm người tham gia"
                          className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 text-gray-400
                            hover:border-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                        {showAddParticipant && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowAddParticipant(false)} />
                            <div className="absolute left-0 top-full mt-1 z-40 w-48 max-h-48 overflow-y-auto
                              bg-white rounded-lg border border-gray-200 shadow-lg py-1">
                              {addableMembers.length === 0 ? (
                                <p className="px-3 py-2 text-[11px] text-gray-400">Đã thêm đủ thành viên.</p>
                              ) : addableMembers.map(m => (
                                <button key={m.id}
                                  onClick={() => { addParticipant(m.id); }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 text-left">
                                  <Avatar name={m.name} src={m.avatar} className="w-5 h-5" />
                                  <span className="text-xs text-slate-700 truncate">{m.name}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist — grouped by role */}
            <div className="px-6 pb-4">
              <button onClick={() => setExpandChecklist(!expandChecklist)}
                className="w-full flex items-center justify-between mb-2 group/sec">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Checklist ({completedChecks}/{checklist.length})
                </h3>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{progressPct}%</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover/sec:text-gray-600 transition-transform ${expandChecklist ? 'rotate-180' : ''}`} />
                </span>
              </button>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }} />
              </div>
              {expandChecklist && (
              <div className="space-y-2">
                {checklistGroups.map(group => {
                  const groupDone = group.items.filter(i => i.done).length;
                  const key = group.role ?? '__general__';
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 px-1 mb-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {group.role ? (ROLE_LABELS[group.role] ?? group.role) : 'Chung'}
                        </span>
                        <span className="text-[10px] text-gray-400">{groupDone}/{group.items.length}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map(item => (
                          <div key={item.id} className="flex items-center gap-1 group">
                            <button
                              onClick={() => toggleCheckItem(item.id)}
                              className="flex-1 flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                            >
                              {item.done
                                ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                                : <Square className="w-4 h-4 text-gray-300 shrink-0" />
                              }
                              {editingCheckId === item.id ? (
                                <input type="text" value={editingCheckText}
                                  onChange={e => setEditingCheckText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditCheckItem(); if (e.key === 'Escape') setEditingCheckId(null); }}
                                  autoFocus
                                  onClick={e => e.stopPropagation()}
                                  className="flex-1 text-sm bg-gray-50 border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400" />
                              ) : (
                                <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {item.text}
                                </span>
                              )}
                            </button>
                            {editingCheckId === item.id ? (
                              <button onClick={saveEditCheckItem}
                                className="p-1 hover:bg-emerald-50 rounded transition-colors">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditCheckItem(item.id, item.text)}
                                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                                  title="Sửa">
                                  <Pencil className="w-3 h-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteChecklistItem(item.id)}
                                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                                  title="Xóa">
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {/* Ô thêm cho riêng role này */}
                        <div className="flex items-center gap-1.5 pl-2 pt-0.5">
                          <input type="text" value={checkDrafts[key] ?? ''}
                            onChange={e => setCheckDrafts(d => ({ ...d, [key]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') addCheckItem(group.role); }}
                            placeholder={group.role ? `Thêm cho ${ROLE_LABELS[group.role] ?? group.role}…` : 'Thêm mục chung…'}
                            className="flex-1 px-2.5 py-1 bg-gray-50/70 border border-dashed border-gray-200 rounded-md text-xs
                                       text-gray-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white" />
                          <button onClick={() => addCheckItem(group.role)} className="p-1 hover:bg-gray-100 rounded shrink-0">
                            <Plus className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Outcomes — grouped by role */}
            <div className="px-6 pb-4">
              <input ref={outcomeFileRef} type="file" onChange={handleOutcomeFile} className="hidden" />
              <button onClick={() => setExpandOutcomes(!expandOutcomes)}
                className="w-full flex items-center justify-between mb-2 group/sec">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Outcomes ({outcomes.filter(o => o.done).length}/{outcomes.length})
                </h3>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover/sec:text-gray-600 transition-transform ${expandOutcomes ? 'rotate-180' : ''}`} />
              </button>
              {expandOutcomes && (
              <div className="space-y-2">
                {outcomeGroups.map(group => {
                  const key = group.role ?? '__general__';
                  return (
                  <div key={key}>
                    <div className="flex items-center gap-2 px-1 mb-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {group.role ? (ROLE_LABELS[group.role] ?? group.role) : 'Chung'}
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const atts = outcomeAtts(item.id);
                        const canTick = item.done || atts.length > 0;
                        return (
                        <div key={item.id} className="rounded-lg group">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleOutcomeItem(item.id)}
                              disabled={!canTick}
                              title={!canTick ? 'Cần đính kèm ≥1 tài liệu/link trước khi đánh dấu hoàn thành' : undefined}
                              className={`flex-1 flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${canTick ? 'hover:bg-gray-50' : 'cursor-not-allowed'}`}
                            >
                              {item.done
                                ? <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                                : <Square className={`w-4 h-4 shrink-0 ${canTick ? 'text-gray-300' : 'text-gray-200'}`} />
                              }
                              <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : canTick ? 'text-gray-700' : 'text-gray-400'}`}>
                                {item.text}
                              </span>
                              {!item.done && atts.length === 0 && (
                                <span className="text-[9px] font-medium text-amber-500 flex items-center gap-0.5 shrink-0">
                                  <Paperclip className="w-2.5 h-2.5" /> cần tài liệu
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => { setOutcomeAttachId(outcomeAttachId === item.id ? null : item.id); setOLinkName(''); setOLinkUrl(''); }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                              title="Đính kèm tài liệu / link">
                              <Paperclip className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteOutcomeItem(item.id)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                              title="Xóa">
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>

                          {/* Tài liệu đính kèm của outcome */}
                          {atts.length > 0 && (
                            <div className="ml-9 mb-1 space-y-1">
                              {atts.map(att => (
                                <div key={att.id} className="flex items-center gap-1.5 text-xs group/att">
                                  {att.kind === 'link'
                                    ? <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                                    : <Paperclip className="w-3 h-3 text-slate-500 shrink-0" />}
                                  <a href={att.url} target="_blank" rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate flex-1 flex items-center gap-1">
                                    {att.fileName}
                                    {att.kind === 'link' && <ExternalLink className="w-2.5 h-2.5 shrink-0" />}
                                  </a>
                                  <button onClick={() => handleDeleteAttachment(att.id)}
                                    className="opacity-0 group-hover/att:opacity-100 hover:bg-red-50 rounded p-0.5 transition-all" title="Xóa">
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Form đính kèm cho outcome này */}
                          {outcomeAttachId === item.id && (
                            <div className="ml-9 mb-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                              <input type="text" value={oLinkName} onChange={e => setOLinkName(e.target.value)}
                                placeholder="Tên tài liệu (tùy chọn)"
                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs
                                           text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                              <input type="url" value={oLinkUrl} onChange={e => setOLinkUrl(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleOutcomeLink(item.id); }}
                                placeholder="https://..." autoFocus
                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs
                                           text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                              <div className="flex items-center justify-between">
                                <button onClick={() => handleOutcomeFilePick(item.id)}
                                  className="px-2.5 py-1 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500
                                             hover:border-gray-400 flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" /> Upload tệp
                                </button>
                                <div className="flex gap-2">
                                  <button onClick={() => { setOutcomeAttachId(null); setOLinkName(''); setOLinkUrl(''); }}
                                    className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700">Hủy</button>
                                  <button onClick={() => handleOutcomeLink(item.id)} disabled={!oLinkUrl.trim()}
                                    className="px-2.5 py-1 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> Đính kèm link
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                      <div className="flex items-center gap-1.5 pl-2 pt-0.5">
                        <input type="text" value={outcomeDrafts[key] ?? ''}
                          onChange={e => setOutcomeDrafts(d => ({ ...d, [key]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addOutcomeItemFor(group.role); }}
                          placeholder={group.role ? `Thêm cho ${ROLE_LABELS[group.role] ?? group.role}…` : 'Thêm outcome chung…'}
                          className="flex-1 px-2.5 py-1 bg-gray-50/70 border border-dashed border-gray-200 rounded-md text-xs
                                     text-gray-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white" />
                        <button onClick={() => addOutcomeItemFor(group.role)} className="p-1 hover:bg-gray-100 rounded shrink-0">
                          <Plus className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Document — files & links */}
            <div className="px-6 pb-4">
              <button onClick={() => setExpandDocs(!expandDocs)}
                className="w-full flex items-center justify-between mb-2 group/sec">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider
                               flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Document ({attachments.filter(a => !a.outcomeItemId).length})
                </h3>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover/sec:text-gray-600 transition-transform ${expandDocs ? 'rotate-180' : ''}`} />
              </button>
              {expandDocs && (<>
              <div className="space-y-1.5 mb-2">
                {attachments.filter(a => !a.outcomeItemId).map(att => (
                  <div key={att.id} className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border border-gray-100 group">
                    <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                      {att.kind === 'link'
                        ? <Link2 className="w-3.5 h-3.5 text-blue-500" />
                        : <Paperclip className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {att.kind === 'link' ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:underline truncate flex items-center gap-1">
                          {att.fileName} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ) : (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" download
                          className="text-xs font-medium text-slate-900 hover:underline truncate block">
                          {att.fileName}
                        </a>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {att.kind === 'link' ? att.url : format(parseISO(att.uploadedAt), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    {att.kind === 'file' && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" download title="Tải xuống"
                        className="p-1 hover:bg-slate-100 rounded transition-all">
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    )}
                    <button onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all" title="Xóa">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              {showLinkForm && (
                <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <input type="text" value={linkName} onChange={e => setLinkName(e.target.value)}
                    placeholder="Tên tài liệu (tùy chọn)"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAttachLink(); }}
                    placeholder="https://..."
                    autoFocus
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setShowLinkForm(false); setLinkName(''); setLinkUrl(''); }}
                      className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">Hủy</button>
                    <button onClick={handleAttachLink} disabled={!linkUrl.trim()}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Đính kèm link
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowUploadModal(true)}
                  className="py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500
                             hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Upload tệp
                </button>
                <button onClick={() => setShowLinkForm(true)}
                  className="py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500
                             hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" /> Đính kèm link
                </button>
              </div>
              </>)}
            </div>

            {/* Comments */}
            <div className="px-6 pb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3
                             flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Bình luận ({comments.length})
              </h3>
              <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                {comments.map(c => {
                  const author = getUserById(c.authorId);
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar name={author?.name} src={author?.avatar} className="w-6 h-6 self-start" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{author?.name}</span>
                          <span className="text-[10px] text-gray-400">{format(parseISO(c.createdAt), 'dd/MM HH:mm')}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Thêm bình luận..." rows={2}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs
                             text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
                <button onClick={handleAddComment} disabled={!commentText.trim()}
                  className="self-end p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800
                             transition-colors disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Activity Log — cuộn được, ~10 dòng */}
            <div className="px-6 pb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3
                             flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Lịch sử hoạt động ({selectedPhaseBlock.activityLog.length})
              </h3>
              {selectedPhaseBlock.activityLog.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Chưa có hoạt động nào.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedPhaseBlock.activityLog.map(a => {
                    const user = getUserById(a.userId);
                    const { verb, detail } = formatActivity(a.action, a.target, getUserById);
                    return (
                      <div key={a.id} className="flex gap-2.5 items-start">
                        <Avatar name={user?.name} src={user?.avatar} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700">
                            <span className="font-medium">{user?.name ?? 'Ai đó'}</span> {verb}
                            {detail && <span className="text-gray-500"> — {detail}</span>}
                          </p>
                          <p className="text-[10px] text-gray-400">{format(parseISO(a.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* #14: thanh Lưu metadata — chỉ áp khi bấm Lưu (không auto-apply) */}
          {metaDirty && (
            <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-t border-gray-200 bg-amber-50/60">
              <span className="text-xs font-semibold text-amber-700">Có thay đổi chưa lưu</span>
              <div className="flex items-center gap-2">
                <button onClick={resetMeta}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  Hoàn tác
                </button>
                <button onClick={saveMeta}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                  <Check className="w-3.5 h-3.5" /> Lưu
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* #14: xóa phase cần nhập lý do → log vào activity dự án */}
      {confirmDelete && (
        <DeleteReasonDialog
          title="Xóa phase"
          message={`Xóa phase "${selectedPhaseBlock.title}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={(reason) => {
            deletePhaseBlock(selectedPhaseBlock.id, reason);
            setConfirmDelete(false);
            closePhaseDetail();
          }}
        />
      )}

      {/* #22: modal tải nhiều tệp + thanh tiến độ */}
      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          uploadFn={(file, onProgress) => uploadPhaseFile(selectedPhaseBlock.id, file, null, onProgress)}
        />
      )}
    </AnimatePresence>
  );
}
