import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { PHASE_META, DEV_PHASES, PHASE_TAG_META, PHASE_ROLE_TASKS, PHASE_ROLE_OUTCOMES } from '../../types';
import type { DevPhase, PhaseBlock, PhaseTag, UserRole } from '../../types';
import { ROLE_LABELS } from '../../data/mockData';
import { X, Plus, Calendar, Users, Trash2, Target, CheckSquare } from 'lucide-react';
import { format, addDays } from 'date-fns';
import Dropdown from '../common/Dropdown';

const TAG_OPTIONS: PhaseTag[] = ['Backlog', 'Todo', 'Inprogress', 'Complete', 'Canceled'];

type DraftItem = { text: string; done: boolean; role?: UserRole };

function defaultChecklist(phase: DevPhase): DraftItem[] {
  return PHASE_ROLE_TASKS[phase].flatMap(({ role, tasks }) =>
    tasks.map(text => ({ text, done: false, role }))
  );
}

function defaultOutcomes(phase: DevPhase): DraftItem[] {
  return PHASE_ROLE_OUTCOMES[phase].flatMap(({ role, outcomes }) =>
    outcomes.map(text => ({ text, done: false, role }))
  );
}

export default function CreatePhaseModal() {
  const {
    createPhaseOpen, closeCreatePhase, createPhaseProjectId, createPhaseDates,
    orgProjects, addPhaseBlock, selectedOrg
  } = useApp();

  const [projectId, setProjectId] = useState(createPhaseProjectId || (orgProjects[0]?.id ?? ''));
  const [phaseType, setPhaseType] = useState<DevPhase>('PA');
  const [tag, setTag] = useState<PhaseTag>('Todo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [assignee, setAssignee] = useState('u1');
  const [participants, setParticipants] = useState<string[]>(['u1']);
  const [showParticipants, setShowParticipants] = useState(false);
  const [checklistItems, setChecklistItems] = useState<DraftItem[]>(defaultChecklist('PA'));
  const [outcomeItems, setOutcomeItems] = useState<DraftItem[]>(defaultOutcomes('PA'));
  const [newCheckText, setNewCheckText] = useState('');
  const [newOutcomeText, setNewOutcomeText] = useState('');

  // Đồng bộ form mỗi khi mở modal (prefill từ kéo-thả trên timeline)
  useEffect(() => {
    if (!createPhaseOpen) return;
    setProjectId(createPhaseProjectId || (orgProjects[0]?.id ?? ''));
    setPhaseType('PA');
    setTag('Todo');
    setTitle('');
    setDescription('');
    setStartDate(createPhaseDates?.startDate ?? format(new Date(), 'yyyy-MM-dd'));
    setEndDate(createPhaseDates?.endDate ?? format(addDays(new Date(), 14), 'yyyy-MM-dd'));
    setAssignee('u1');
    setParticipants(['u1']);
    setShowParticipants(false);
    setChecklistItems(defaultChecklist('PA'));
    setOutcomeItems(defaultOutcomes('PA'));
    setNewCheckText('');
    setNewOutcomeText('');
  }, [createPhaseOpen, createPhaseProjectId, createPhaseDates]);

  // Đổi loại phase → sinh lại checklist & outcome từ nguồn theo role
  const changePhaseType = (phase: DevPhase) => {
    setPhaseType(phase);
    setChecklistItems(defaultChecklist(phase));
    setOutcomeItems(defaultOutcomes(phase));
  };

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
      tag,
      title: title.trim(),
      description: description.trim() || `${title} phase block.`,
      startDate,
      endDate,
      createdBy: 'u1',
      assignee,
      participants,
      checklist: checklistItems.map((item, i) => ({
        id: `chk-${Date.now()}-${i}`,
        text: item.text,
        done: item.done,
        role: item.role,
      })),
      outcomes: outcomeItems.map((item, i) => ({
        id: `out-${Date.now()}-${i}`,
        text: item.text,
        done: item.done,
        role: item.role,
      })),
      comments: [],
      attachments: [],
      activityLog: [
        { id: `act-${Date.now()}`, userId: 'u1', action: 'created phase block', target: title, timestamp: new Date().toISOString() }
      ],
    };
    addPhaseBlock(pb);
    closeCreatePhase();
  };

  if (!createPhaseOpen) return null;

  const orgMembers = selectedOrg?.members || [];
  const lockedProject = createPhaseProjectId
    ? orgProjects.find(p => p.id === createPhaseProjectId)
    : null;

  const renderDraftList = (
    items: DraftItem[],
    setItems: React.Dispatch<React.SetStateAction<DraftItem[]>>,
  ) => {
    // Gom theo role, giữ thứ tự — index gốc để sửa/xóa đúng item
    const groups: Array<{ role: UserRole | undefined; entries: Array<{ item: DraftItem; idx: number }> }> = [];
    items.forEach((item, idx) => {
      let g = groups.find(x => x.role === item.role);
      if (!g) { g = { role: item.role, entries: [] }; groups.push(g); }
      g.entries.push({ item, idx });
    });
    return groups.map(group => (
      <div key={group.role ?? 'general'} className="mb-1.5">
        <div className="flex items-center gap-2 px-0.5 mb-1">
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">
            {group.role ? (ROLE_LABELS[group.role] ?? group.role) : 'Chung'}
          </span>
          <div className="flex-1 h-px bg-stone-100" />
        </div>
        <div className="space-y-1">
          {group.entries.map(({ item, idx }) => (
            <div key={idx} className="flex items-center gap-1.5 group">
              <input
                type="text"
                value={item.text}
                onChange={e => {
                  const next = [...items];
                  next[idx] = { ...next[idx], text: e.target.value };
                  setItems(next);
                }}
                className="flex-1 px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-700
                           focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink"
              />
              <button
                type="button"
                onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-100 rounded"
              >
                <Trash2 className="w-3 h-3 text-stone-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    ));
  };

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
            {/* Project — khóa cứng khi tạo bằng kéo-thả trên timeline */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Dự án</label>
              {lockedProject ? (
                <div className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 font-medium">
                  {lockedProject.name}
                </div>
              ) : (
                <Dropdown
                  value={projectId}
                  onChange={setProjectId}
                  options={orgProjects.map(p => ({ value: p.id, label: p.name }))}
                />
              )}
            </div>

            {/* Phase Type */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Loại Phase</label>
              <Dropdown
                value={phaseType}
                onChange={v => changePhaseType(v as DevPhase)}
                options={DEV_PHASES.map(phase => ({
                  value: phase,
                  label: PHASE_META[phase].fullLabel,
                  hint: phase,
                  dotClass: `${PHASE_META[phase].bg} border ${PHASE_META[phase].border}`,
                  labelClass: `font-medium ${PHASE_META[phase].color}`,
                }))}
              />
            </div>

            {/* Tag */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Trạng thái</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(t => {
                  const tm = PHASE_TAG_META[t];
                  return (
                    <button key={t} type="button"
                      onClick={() => setTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all
                        ${tag === t ? `${tm.bg} ${tm.color} ${tm.border}` : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
                      {tm.label}
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

            {/* Assignee */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Assignee</label>
              <Dropdown
                value={assignee}
                onChange={setAssignee}
                options={orgMembers.map(m => ({
                  value: m.id,
                  label: m.name,
                  hint: ROLE_LABELS[m.role] ?? m.role,
                  avatar: m.avatar,
                }))}
              />
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

            {/* Checklist — tự sinh theo role từ nguồn, có thể chỉnh sửa */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1.5 block flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" /> Checklist theo role ({checklistItems.length})
              </label>
              {renderDraftList(checklistItems, setChecklistItems)}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCheckText}
                  onChange={e => setNewCheckText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newCheckText.trim()) {
                      e.preventDefault();
                      setChecklistItems(prev => [...prev, { text: newCheckText.trim(), done: false }]);
                      setNewCheckText('');
                    }
                  }}
                  placeholder="Thêm mục checklist..."
                  className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCheckText.trim()) {
                      setChecklistItems(prev => [...prev, { text: newCheckText.trim(), done: false }]);
                      setNewCheckText('');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Outcomes — tự sinh theo role từ nguồn, có thể chỉnh sửa */}
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1.5 block flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Outcomes theo role ({outcomeItems.length})
              </label>
              {renderDraftList(outcomeItems, setOutcomeItems)}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newOutcomeText}
                  onChange={e => setNewOutcomeText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newOutcomeText.trim()) {
                      e.preventDefault();
                      setOutcomeItems(prev => [...prev, { text: newOutcomeText.trim(), done: false }]);
                      setNewOutcomeText('');
                    }
                  }}
                  placeholder="Thêm outcome..."
                  className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs
                             focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newOutcomeText.trim()) {
                      setOutcomeItems(prev => [...prev, { text: newOutcomeText.trim(), done: false }]);
                      setNewOutcomeText('');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
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
