import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getUserById, ROLE_LABELS } from '../../data/mockData';
import Dropdown from '../common/Dropdown';
import { PHASE_META, PHASE_TAG_META, PHASE_ROLE_TASKS, PHASE_ROLE_OUTCOMES } from '../../types';
import type { PhaseTag, ChecklistItem, UserRole } from '../../types';
import {
  X, CheckSquare, Square, MessageSquare, Paperclip, Clock,
  Send, HelpCircle, Users, Calendar, Plus, Trash2, Pencil, Check,
  Link2, ExternalLink, FileText, ChevronDown, Target, UserCircle2, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Avatar from '../common/Avatar';

const ALL_TAGS: PhaseTag[] = ['Backlog', 'Todo', 'Inprogress', 'Complete', 'Canceled'];

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
    updatePhaseBlock, deletePhaseBlock, orgProjects, selectedOrg,
    addPhaseItem, updatePhaseItem, deletePhaseItem,
    addPhaseComment, addPhaseLink, uploadPhaseFile, deletePhaseAttachment,
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');

  // Checklist inline edit
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [editingCheckText, setEditingCheckText] = useState('');

  // Document link form
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Collapsible sections — mặc định thu gọn
  const [expandChecklist, setExpandChecklist] = useState(false);
  const [expandOutcomes, setExpandOutcomes] = useState(false);
  const [expandDocs, setExpandDocs] = useState(false);

  useEffect(() => {
    if (selectedPhaseBlock) {
      setChecklist(selectedPhaseBlock.checklist);
      setOutcomes(selectedPhaseBlock.outcomes || []);
      setComments(selectedPhaseBlock.comments);
      setAttachments(selectedPhaseBlock.attachments);
      setCommentText('');
      setCheckDrafts({});
      setOutcomeDrafts({});
      setEditingTitle(false);
      setEditingDesc(false);
      setEditingCheckId(null);
      setShowLinkForm(false);
      setLinkName('');
      setLinkUrl('');
      setExpandChecklist(false);
      setExpandOutcomes(false);
      setExpandDocs(false);
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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closePhaseDetail(); };
    if (phaseDetailOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [phaseDetailOpen, closePhaseDetail]);


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

  const toggleOutcomeItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    const item = outcomes.find(i => i.id === itemId);
    setOutcomes(outcomes.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
    updatePhaseItem(selectedPhaseBlock.id, itemId, { done: !item?.done });
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

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPhaseBlock) return;
    uploadPhaseFile(selectedPhaseBlock.id, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleDelete = () => {
    if (!selectedPhaseBlock) return;
    deletePhaseBlock(selectedPhaseBlock.id);
    closePhaseDetail();
  };

  const startEditTitle = () => {
    if (!selectedPhaseBlock) return;
    setTitleDraft(selectedPhaseBlock.title);
    setEditingTitle(true);
  };

  const saveTitle = () => {
    if (!selectedPhaseBlock || !titleDraft.trim()) return;
    updatePhaseBlock(selectedPhaseBlock.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  };

  const startEditDesc = () => {
    if (!selectedPhaseBlock) return;
    setDescDraft(selectedPhaseBlock.description);
    setEditingDesc(true);
  };

  const saveDesc = () => {
    if (!selectedPhaseBlock) return;
    updatePhaseBlock(selectedPhaseBlock.id, { description: descDraft.trim() });
    setEditingDesc(false);
  };

  if (!selectedPhaseBlock || !phaseDetailOpen) return null;

  const meta = PHASE_META[selectedPhaseBlock.phaseType];
  const creator = getUserById(selectedPhaseBlock.createdBy);
  const project = orgProjects.find(p => p.id === selectedPhaseBlock.projectId);
  const completedChecks = checklist.filter(c => c.done).length;
  const progressPct = checklist.length > 0 ? Math.round((completedChecks / checklist.length) * 100) : 0;
  const tagMeta = PHASE_TAG_META[selectedPhaseBlock.tag];
  const orgMembers = selectedOrg?.members || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex justify-end"
        onClick={closePhaseDetail}
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
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${meta.bg} ${meta.color} border ${meta.border}`}>
                {selectedPhaseBlock.phaseType}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${tagMeta.bg} ${tagMeta.color} border ${tagMeta.border}`}>
                {tagMeta.label}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                {progressPct}% hoàn thành
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
            {/* Tag selector */}
            <div className="px-6 pt-4 pb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {ALL_TAGS.map(t => {
                  const tm = PHASE_TAG_META[t];
                  const isActive = selectedPhaseBlock.tag === t;
                  return (
                    <button key={t}
                      onClick={() => updatePhaseBlock(selectedPhaseBlock.id, { tag: t })}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-all
                        ${isActive ? `${tm.bg} ${tm.color} ${tm.border}` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                      {tm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title (editable) */}
            <div className="px-6 pb-3">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    autoFocus
                    className="flex-1 text-xl font-bold text-slate-900 bg-gray-50 border border-slate-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  <button onClick={saveTitle} className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 group cursor-pointer" onClick={startEditTitle}>
                  <h2 className="text-xl font-bold text-slate-900 flex-1">{selectedPhaseBlock.title}</h2>
                  <Pencil className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 shrink-0" />
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
                    value={selectedPhaseBlock.startDate}
                    onChange={e => updatePhaseBlock(selectedPhaseBlock.id, { startDate: e.target.value })}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Kết thúc
                  </label>
                  <input type="date"
                    value={selectedPhaseBlock.endDate}
                    onChange={e => updatePhaseBlock(selectedPhaseBlock.id, { endDate: e.target.value })}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>
            </div>

            {/* Description (editable) */}
            <div className="px-6 pb-4">
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={3} autoFocus
                    onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-slate-300 rounded-lg text-sm text-gray-700
                               focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingDesc(false)}
                      className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">Hủy</button>
                    <button onClick={saveDesc}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Lưu
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group cursor-pointer rounded-lg -mx-1 px-1 py-1 hover:bg-gray-50 transition-colors"
                  onClick={startEditDesc}>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedPhaseBlock.description || 'Thêm mô tả...'}</p>
                  <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                    <Pencil className="w-2.5 h-2.5" /> Click để chỉnh sửa
                  </span>
                </div>
              )}
            </div>

            {/* Phase Info Card */}
            <div className="px-6 pb-4">
              <div className={`${meta.bg} border ${meta.border} rounded-lg p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <HelpCircle className={`w-3.5 h-3.5 ${meta.color}`} />
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                </div>
                <p className="text-xs text-gray-600">{meta.desc}</p>
              </div>
            </div>

            {/* Assignee, Creator & Participants */}
            <div className="px-6 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1 w-24 shrink-0">
                  <UserCircle2 className="w-3.5 h-3.5" /> Assignee:
                </span>
                <Dropdown
                  className="w-56"
                  value={selectedPhaseBlock.assignee || selectedPhaseBlock.createdBy}
                  onChange={v => updatePhaseBlock(selectedPhaseBlock.id, { assignee: v })}
                  options={orgMembers.map(m => ({
                    value: m.id,
                    label: m.name,
                    hint: ROLE_LABELS[m.role] ?? m.role,
                    avatar: m.avatar,
                  }))}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Người tạo:</span>
                  {creator && (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={creator.name} src={creator.avatar} className="w-5 h-5" />
                      <span className="text-xs font-medium text-slate-700">{creator.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-gray-400" />
                  <div className="flex -space-x-1">
                    {selectedPhaseBlock.participants.map(uid => {
                      const u = getUserById(uid);
                      return <Avatar key={uid} name={u?.name} src={u?.avatar} className="w-4 h-4 border border-white" />;
                    })}
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
                      {group.items.map(item => (
                        <div key={item.id} className="flex items-center gap-1 group">
                          <button
                            onClick={() => toggleOutcomeItem(item.id)}
                            className="flex-1 flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            {item.done
                              ? <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                              : <Square className="w-4 h-4 text-gray-300 shrink-0" />
                            }
                            <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {item.text}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteOutcomeItem(item.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                            title="Xóa">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
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
                  <FileText className="w-3.5 h-3.5" /> Document ({attachments.length})
                </h3>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover/sec:text-gray-600 transition-transform ${expandDocs ? 'rotate-180' : ''}`} />
              </button>
              {expandDocs && (<>
              <div className="space-y-1.5 mb-2">
                {attachments.map(att => (
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
                <input ref={fileInputRef} type="file" onChange={handleAttachFile} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()}
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
                    return (
                      <div key={a.id} className="flex gap-2.5 items-start">
                        <Avatar name={user?.name} src={user?.avatar} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700">
                            <span className="font-medium">{user?.name ?? 'Ai đó'}</span> {a.action}
                            {a.target && <span className="text-gray-500"> — {a.target}</span>}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
