import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getUserById } from '../../data/mockData';
import { PHASE_META, PHASE_TAG_META } from '../../types';
import type { PhaseTag } from '../../types';
import {
  X, CheckSquare, Square, MessageSquare, Paperclip, Clock,
  Send, HelpCircle, Users, Calendar, Plus, Trash2, Pencil, Check
} from 'lucide-react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';

const ALL_TAGS: PhaseTag[] = ['Backlog', 'Todo', 'Inprogress', 'Complete', 'Canceled'];

export default function PhaseDetailModal() {
  const {
    selectedPhaseBlock, phaseDetailOpen, closePhaseDetail,
    updatePhaseBlock, deletePhaseBlock, orgProjects, phaseBlocks
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [newCheckText, setNewCheckText] = useState('');
  const [checklist, setChecklist] = useState(selectedPhaseBlock?.checklist || []);
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

  useEffect(() => {
    if (selectedPhaseBlock) {
      setChecklist(selectedPhaseBlock.checklist);
      setComments(selectedPhaseBlock.comments);
      setAttachments(selectedPhaseBlock.attachments);
      setCommentText('');
      setNewCheckText('');
      setEditingTitle(false);
      setEditingDesc(false);
      setEditingCheckId(null);
    }
  }, [selectedPhaseBlock?.id]);

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

  // Auto-adjust adjacent phases
  const adjustAdjacent = (id: string, field: 'startDate' | 'endDate', newValue: string) => {
    if (!selectedPhaseBlock) return;
    const projectPbs = phaseBlocks.filter(pb => pb.projectId === selectedPhaseBlock.projectId);
    const sorted = [...projectPbs].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const idx = sorted.findIndex(pb => pb.id === id);
    if (idx === -1) return;

    if (field === 'startDate' && idx > 0) {
      const left = sorted[idx - 1];
      const newStart = parseISO(newValue);
      const leftEnd = parseISO(left.endDate);
      if (newStart < leftEnd) {
        const duration = differenceInDays(leftEnd, parseISO(left.startDate));
        const shiftedEnd = format(addDays(newStart, -1), 'yyyy-MM-dd');
        const shiftedStart = format(addDays(parseISO(shiftedEnd), -duration), 'yyyy-MM-dd');
        updatePhaseBlock(left.id, { startDate: shiftedStart, endDate: shiftedEnd });
      }
    }
    if (field === 'endDate' && idx < sorted.length - 1) {
      const right = sorted[idx + 1];
      const newEnd = parseISO(newValue);
      const rightStart = parseISO(right.startDate);
      if (newEnd > rightStart) {
        const duration = differenceInDays(parseISO(right.endDate), rightStart);
        const shiftedStart = format(addDays(newEnd, 1), 'yyyy-MM-dd');
        const shiftedEnd = format(addDays(parseISO(shiftedStart), duration), 'yyyy-MM-dd');
        updatePhaseBlock(right.id, { startDate: shiftedStart, endDate: shiftedEnd });
      }
    }
  };

  const toggleCheckItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { checklist: updated });
  };

  const handleAddChecklistItem = () => {
    if (!newCheckText.trim() || !selectedPhaseBlock) return;
    const newItem = {
      id: `chk-${Date.now()}`,
      text: newCheckText.trim(),
      done: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { checklist: updated });
    setNewCheckText('');
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    const updated = checklist.filter(item => item.id !== itemId);
    setChecklist(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { checklist: updated });
  };

  const startEditCheckItem = (itemId: string, text: string) => {
    setEditingCheckId(itemId);
    setEditingCheckText(text);
  };

  const saveEditCheckItem = () => {
    if (!selectedPhaseBlock || !editingCheckId || !editingCheckText.trim()) return;
    const updated = checklist.map(item =>
      item.id === editingCheckId ? { ...item, text: editingCheckText.trim() } : item
    );
    setChecklist(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { checklist: updated });
    setEditingCheckId(null);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedPhaseBlock) return;
    const newComment = {
      id: `cm-${Date.now()}`,
      authorId: 'u1',
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...comments, newComment];
    setComments(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { comments: updated });
    setCommentText('');
  };

  const handleAttach = () => {
    if (!selectedPhaseBlock) return;
    const newAtt = {
      id: `a-${Date.now()}`,
      fileName: `document-${Date.now()}.pdf`,
      url: '#',
      uploadedAt: new Date().toISOString(),
    };
    const updated = [...attachments, newAtt];
    setAttachments(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { attachments: updated });
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
  const tagMeta = PHASE_TAG_META[selectedPhaseBlock.tag];

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
          className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
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
                    onChange={e => {
                      updatePhaseBlock(selectedPhaseBlock.id, { startDate: e.target.value });
                      adjustAdjacent(selectedPhaseBlock.id, 'startDate', e.target.value);
                    }}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs
                               text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Kết thúc
                  </label>
                  <input type="date"
                    value={selectedPhaseBlock.endDate}
                    onChange={e => {
                      updatePhaseBlock(selectedPhaseBlock.id, { endDate: e.target.value });
                      adjustAdjacent(selectedPhaseBlock.id, 'endDate', e.target.value);
                    }}
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

            {/* Creator & Participants */}
            <div className="px-6 pb-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Người tạo:</span>
                {creator && (
                  <div className="flex items-center gap-1.5">
                    <img src={creator.avatar} className="w-5 h-5 rounded-full" alt="" />
                    <span className="text-xs font-medium text-slate-700">{creator.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-gray-400" />
                <div className="flex -space-x-1">
                  {selectedPhaseBlock.participants.map(uid => {
                    const u = getUserById(uid);
                    return <img key={uid} src={u?.avatar} className="w-4 h-4 rounded-full border border-white" alt="" />;
                  })}
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Checklist ({completedChecks}/{checklist.length})
                </h3>
                <span className="text-[10px] text-gray-400">
                  {checklist.length > 0 ? Math.round((completedChecks / checklist.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: checklist.length > 0 ? `${(completedChecks / checklist.length) * 100}%` : '0%' }} />
              </div>
              <div className="space-y-0.5">
                {checklist.map(item => (
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
              </div>
              {/* Add checklist item */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCheckText}
                  onChange={e => setNewCheckText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                  placeholder="Thêm mục mới..."
                  className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs
                             text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newCheckText.trim()}
                  className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800
                             transition-colors disabled:opacity-40 flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" /> Thêm
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div className="px-6 pb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2
                             flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Tệp đính kèm ({attachments.length})
              </h3>
              <div className="space-y-1.5 mb-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{att.fileName}</p>
                      <p className="text-[10px] text-gray-400">{format(parseISO(att.uploadedAt), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleAttach}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500
                           hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Đính kèm tệp
              </button>
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
                      <img src={author?.avatar} className="w-6 h-6 rounded-full bg-gray-200 self-start" alt="" />
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

            {/* Activity Log */}
            <div className="px-6 pb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3
                             flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Lịch sử hoạt động
              </h3>
              <div className="space-y-2">
                {selectedPhaseBlock.activityLog.map(a => {
                  const user = getUserById(a.userId);
                  return (
                    <div key={a.id} className="flex gap-2.5 items-start">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                        <Clock className="w-3 h-3 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">{user?.name}</span> {a.action}
                        </p>
                        <p className="text-[10px] text-gray-400">{format(parseISO(a.timestamp), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
