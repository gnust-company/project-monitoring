import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import type { DevPhase, PhaseBlock } from '../../types';
import { X, Plus, Calendar, HelpCircle, Users } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CreatePhaseModal() {
  const {
    createPhaseOpen, closeCreatePhase, createPhaseProjectId,
    orgProjects, addPhaseBlock, selectedOrg
  } = useApp();

  const [projectId, setProjectId] = useState(createPhaseProjectId || (orgProjects[0]?.id ?? ''));
  const [phaseType, setPhaseType] = useState<DevPhase>('PA');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [participants, setParticipants] = useState<string[]>(['u1']);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const toggleParticipant = (uid: string) => {
    setParticipants(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    const pb: PhaseBlock = {
      id: `pb-${Date.now()}`,
      projectId,
      phaseType,
      title: title.trim(),
      description: description.trim() || `${title} phase block.`,
      startDate,
      endDate,
      createdBy: 'u1',
      participants,
      checklist: [
        { id: `chk-${Date.now()}-1`, text: 'Define objectives', done: false },
        { id: `chk-${Date.now()}-2`, text: 'Assign team members', done: false },
        { id: `chk-${Date.now()}-3`, text: 'Prepare deliverables', done: false },
      ],
      comments: [],
      attachments: [],
      activityLog: [
        { id: `act-${Date.now()}`, userId: 'u1', action: 'created phase block', target: title, timestamp: new Date().toISOString() }
      ],
    };
    addPhaseBlock(pb as any);
    setTitle('');
    setDescription('');
    setParticipants(['u1']);
    setShowParticipants(false);
    closeCreatePhase();
  };

  if (!createPhaseOpen) return null;

  const orgMembers = selectedOrg?.members || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={closeCreatePhase}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline flex-shrink-0">
            <h2 className="text-base font-bold text-ink">Tạo Phase Block</h2>
            <button onClick={closeCreatePhase} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Project */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Dự án</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink">
                {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Phase Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-semibold text-stone-700">Loại Phase</label>
                {showHelp && (
                  <div className="relative">
                    <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px]
                                    rounded-md whitespace-normal z-10 max-w-[280px]">
                      {PHASE_META[showHelp as DevPhase]?.desc}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {DEV_PHASES.map(phase => {
                  const meta = PHASE_META[phase];
                  return (
                    <button
                      key={phase} type="button"
                      onClick={() => setPhaseType(phase)}
                      onMouseEnter={() => setShowHelp(phase)}
                      onMouseLeave={() => setShowHelp(null)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1
                        ${phaseType === phase
                          ? `${meta.bg} ${meta.color} ${meta.border}`
                          : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                        }`}
                    >
                      {phase}
                      <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Tiêu đề</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="VD: Core Feature Development"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink"
                required />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Mô tả</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Mô tả phase block này..."
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink resize-none" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Bắt đầu
                </label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Kết thúc
                </label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
              </div>
            </div>

            {/* Participants */}
            <div>
              <button
                type="button"
                onClick={() => setShowParticipants(!showParticipants)}
                className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 mb-1"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Người tham gia ({participants.length})
                </span>
                <span className="text-stone-400">{showParticipants ? '▲' : '▼'}</span>
              </button>
              {showParticipants && (
                <div className="bg-white border border-stone-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                  {orgMembers.map(member => {
                    const isSelected = participants.includes(member.id);
                    return (
                      <button
                        key={member.id} type="button"
                        onClick={() => toggleParticipant(member.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors
                          ${isSelected ? 'bg-stone-100 text-ink' : 'hover:bg-stone-50 text-stone-600'}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-ink border-ink' : 'border-stone-300'}`}>
                          {isSelected && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <img src={member.avatar} className="w-5 h-5 rounded-full" alt="" />
                        <span className="text-xs font-medium">{member.name}</span>
                        <span className="text-[10px] text-stone-400 ml-auto">{member.role}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit"
              className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tạo Phase Block
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
