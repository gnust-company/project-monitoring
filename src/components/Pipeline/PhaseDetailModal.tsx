import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getUserById } from '../../data/mockData';
import { PHASE_META } from '../../types';
import {
  X, CheckSquare, Square, MessageSquare, Paperclip, Clock,
  Send, HelpCircle, Users, Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function PhaseDetailModal() {
  const {
    selectedPhaseBlock, phaseDetailOpen, closePhaseDetail,
    updatePhaseBlock, orgProjects
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [checklist, setChecklist] = useState(selectedPhaseBlock?.checklist || []);
  const [comments, setComments] = useState(selectedPhaseBlock?.comments || []);
  const [attachments, setAttachments] = useState(selectedPhaseBlock?.attachments || []);

  useEffect(() => {
    if (selectedPhaseBlock) {
      setChecklist(selectedPhaseBlock.checklist);
      setComments(selectedPhaseBlock.comments);
      setAttachments(selectedPhaseBlock.attachments);
      setCommentText('');
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

  const toggleCheckItem = (itemId: string) => {
    if (!selectedPhaseBlock) return;
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);
    updatePhaseBlock(selectedPhaseBlock.id, { checklist: updated });
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

  if (!selectedPhaseBlock || !phaseDetailOpen) return null;

  const meta = PHASE_META[selectedPhaseBlock.phaseType];
  const creator = getUserById(selectedPhaseBlock.createdBy);
  const project = orgProjects.find(p => p.id === selectedPhaseBlock.projectId);
  const completedChecks = checklist.filter(c => c.done).length;

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
              <span className="text-xs text-gray-400">Phase Detail</span>
            </div>
            <button onClick={closePhaseDetail} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Title & Project */}
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-xl font-bold text-slate-900">{selectedPhaseBlock.title}</h2>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(selectedPhaseBlock.startDate), 'dd/MM/yyyy')} - {format(parseISO(selectedPhaseBlock.endDate), 'dd/MM/yyyy')}
                </span>
                <span>|</span>
                <span>Project: <span className="font-medium text-slate-700">{project?.name}</span></span>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-4">
              <p className="text-sm text-gray-600 leading-relaxed">{selectedPhaseBlock.description}</p>
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
                <span className="text-xs text-gray-400">Created by:</span>
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
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: checklist.length > 0 ? `${(completedChecks / checklist.length) * 100}%` : '0%' }} />
              </div>
              <div className="space-y-1">
                {checklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleCheckItem(item.id)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    {item.done
                      ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <Square className="w-4 h-4 text-gray-300 shrink-0" />
                    }
                    <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div className="px-6 pb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 
                             flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length})
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
                <Paperclip className="w-3.5 h-3.5" /> Attach File
              </button>
            </div>

            {/* Comments */}
            <div className="px-6 pb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 
                             flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
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
                  placeholder="Add a comment..." rows={2}
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
                <Clock className="w-3.5 h-3.5" /> Activity Log
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
