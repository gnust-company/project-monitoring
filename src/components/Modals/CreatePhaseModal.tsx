import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES } from '../../types';
import type { DevPhase, PhaseBlock } from '../../types';
import { X, Plus, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CreatePhaseModal() {
  const {
    createPhaseOpen, closeCreatePhase, createPhaseProjectId,
    orgProjects, addPhaseBlock
  } = useApp();

  const [projectId, setProjectId] = useState(createPhaseProjectId || (orgProjects[0]?.id ?? ''));
  const [phaseType, setPhaseType] = useState<DevPhase>('PA');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [showHelp, setShowHelp] = useState<string | null>(null);

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
      participants: ['u1', 'u3'],
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
    closeCreatePhase();
  };

  if (!createPhaseOpen) return null;

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
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-slate-900">Tạo Phase Block</h2>
            <button onClick={closeCreatePhase} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Project */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                {orgProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Phase Type */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="text-xs font-medium text-gray-600">Phase Type</label>
                {showHelp && (
                  <div className="relative">
                    <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] 
                                    rounded-md whitespace-nowrap z-10 max-w-[280px]">
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
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${phaseType === phase
                          ? `${meta.bg} ${meta.color} ${meta.border}`
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      {phase}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Core Feature Development"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                required />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Describe this phase block..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Start
                </label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                             focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> End
                </label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                             focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>

            {/* Submit */}
            <button type="submit"
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg 
                         hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tạo Phase Block
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
