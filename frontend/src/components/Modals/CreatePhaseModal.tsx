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

// Section checklist/outcome — gom theo role, mỗi role có sẵn ô thêm riêng
function DraftSection({ items, setItems, roles, icon, label }: {
  items: DraftItem[];
  setItems: React.Dispatch<React.SetStateAction<DraftItem[]>>;
  roles: UserRole[];
  icon: React.ReactNode;
  label: string;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const keyOf = (r: UserRole | undefined) => r ?? '__general__';

  // thứ tự: role của template trước, role lạ trong items sau, cuối cùng là "Chung"
  const ordered: (UserRole | undefined)[] = [...roles];
  for (const it of items) if (it.role && !ordered.includes(it.role)) ordered.push(it.role);
  ordered.push(undefined);

  const addItem = (role: UserRole | undefined) => {
    const k = keyOf(role);
    const text = (drafts[k] ?? '').trim();
    if (!text) return;
    setItems(prev => [...prev, { text, done: false, role }]);
    setDrafts(d => ({ ...d, [k]: '' }));
  };

  return (
    <div>
      <label className="text-xs font-semibold text-stone-700 mb-1.5 block flex items-center gap-1.5">
        {icon} {label} ({items.length})
      </label>
      <div className="space-y-2">
        {ordered.map(role => {
          const entries = items.map((item, idx) => ({ item, idx })).filter(e => e.item.role === role);
          const k = keyOf(role);
          return (
            <div key={k}>
              <div className="flex items-center gap-2 px-0.5 mb-1">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">
                  {role ? (ROLE_LABELS[role] ?? role) : 'Chung'}
                </span>
                <div className="flex-1 h-px bg-stone-100" />
              </div>
              <div className="space-y-1">
                {entries.map(({ item, idx }) => (
                  <div key={idx} className="flex items-center gap-1.5 group">
                    <input type="text" value={item.text}
                      onChange={e => { const next = [...items]; next[idx] = { ...next[idx], text: e.target.value }; setItems(next); }}
                      className="flex-1 px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-700
                                 focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink" />
                    <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-100 rounded">
                      <Trash2 className="w-3 h-3 text-stone-400" />
                    </button>
                  </div>
                ))}
                {/* ô thêm riêng cho role này */}
                <div className="flex items-center gap-1.5">
                  <input type="text" value={drafts[k] ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [k]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(role); } }}
                    placeholder={role ? `Thêm mục cho ${ROLE_LABELS[role] ?? role}...` : 'Thêm mục chung...'}
                    className="flex-1 px-2.5 py-1 bg-stone-50/60 border border-dashed border-stone-200 rounded-md text-xs
                               focus:outline-none focus:ring-1 focus:ring-ink/15 focus:border-ink focus:bg-white" />
                  <button type="button" onClick={() => addItem(role)}
                    className="p-1 hover:bg-stone-100 rounded flex-shrink-0">
                    <Plus className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CreatePhaseModal() {
  const {
    createPhaseOpen, closeCreatePhase, createPhaseProjectId, createPhaseDates,
    orgProjects, addPhaseBlock, selectedOrg, currentUser,
  } = useApp();

  const meId = currentUser?.id ?? '';

  const [projectId, setProjectId] = useState(createPhaseProjectId || (orgProjects[0]?.id ?? ''));
  const [phaseType, setPhaseType] = useState<DevPhase>('PA');
  const [tag, setTag] = useState<PhaseTag>('Todo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [assignee, setAssignee] = useState(meId);
  const [participants, setParticipants] = useState<string[]>(meId ? [meId] : []);
  const [showParticipants, setShowParticipants] = useState(false);
  const [checklistItems, setChecklistItems] = useState<DraftItem[]>(defaultChecklist('PA'));
  const [outcomeItems, setOutcomeItems] = useState<DraftItem[]>(defaultOutcomes('PA'));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!createPhaseOpen) return;
    setProjectId(createPhaseProjectId || (orgProjects[0]?.id ?? ''));
    setPhaseType('PA');
    setTag('Todo');
    setTitle('');
    setDescription('');
    setStartDate(createPhaseDates?.startDate ?? format(new Date(), 'yyyy-MM-dd'));
    setEndDate(createPhaseDates?.endDate ?? format(addDays(new Date(), 14), 'yyyy-MM-dd'));
    setAssignee(meId);
    setParticipants(meId ? [meId] : []);
    setShowParticipants(false);
    setChecklistItems(defaultChecklist('PA'));
    setOutcomeItems(defaultOutcomes('PA'));
    setError(null);
  }, [createPhaseOpen, createPhaseProjectId, createPhaseDates, meId]);

  const changePhaseType = (phase: DevPhase) => {
    setPhaseType(phase);
    setChecklistItems(defaultChecklist(phase));
    setOutcomeItems(defaultOutcomes(phase));
  };

  const toggleParticipant = (uid: string) => {
    setParticipants(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setSubmitting(true);
    setError(null);
    const pb: PhaseBlock = {
      id: '', projectId, phaseType, tag,
      title: title.trim(),
      description: description.trim() || `${title} phase block.`,
      startDate, endDate,
      createdBy: meId, assignee: assignee || meId, participants,
      checklist: checklistItems.map(item => ({ id: '', text: item.text, done: item.done, role: item.role })),
      outcomes: outcomeItems.map(item => ({ id: '', text: item.text, done: item.done, role: item.role })),
      comments: [], attachments: [], activityLog: [],
    };
    try {
      await addPhaseBlock(pb);
      closeCreatePhase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo phase thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!createPhaseOpen) return null;

  const orgMembers = selectedOrg?.members || [];
  const lockedProject = createPhaseProjectId ? orgProjects.find(p => p.id === createPhaseProjectId) : null;
  const checklistRoles = PHASE_ROLE_TASKS[phaseType].map(x => x.role);
  const outcomeRoles = PHASE_ROLE_OUTCOMES[phaseType].map(x => x.role);

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
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Dự án</label>
              {lockedProject ? (
                <div className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 font-medium">
                  {lockedProject.name}
                </div>
              ) : (
                <Dropdown value={projectId} onChange={setProjectId}
                  options={orgProjects.map(p => ({ value: p.id, label: p.name }))} />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Loại Phase</label>
              <Dropdown value={phaseType} onChange={v => changePhaseType(v as DevPhase)}
                options={DEV_PHASES.map(phase => ({
                  value: phase, label: PHASE_META[phase].fullLabel, hint: phase,
                  dotClass: `${PHASE_META[phase].bg} border ${PHASE_META[phase].border}`,
                  labelClass: `font-medium ${PHASE_META[phase].color}`,
                }))} />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Trạng thái</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(t => {
                  const tm = PHASE_TAG_META[t];
                  return (
                    <button key={t} type="button" onClick={() => setTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all
                        ${tag === t ? `${tm.bg} ${tm.color} ${tm.border}` : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
                      {tm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Tiêu đề</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="VD: Core Feature Development"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Mô tả</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Mô tả phase block này..."
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink resize-none" />
            </div>

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

            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">Assignee</label>
              <Dropdown value={assignee} onChange={setAssignee}
                options={orgMembers.map(m => ({ value: m.id, label: m.name, hint: ROLE_LABELS[m.role] ?? m.role, avatar: m.avatar }))} />
            </div>

            <div>
              <button type="button" onClick={() => setShowParticipants(!showParticipants)}
                className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Người tham gia ({participants.length})
                </span>
                <span className="text-stone-400">{showParticipants ? '▲' : '▼'}</span>
              </button>
              {showParticipants && (
                <div className="bg-white border border-stone-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                  {orgMembers.map(member => {
                    const isSelected = participants.includes(member.id);
                    return (
                      <button key={member.id} type="button" onClick={() => toggleParticipant(member.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors
                          ${isSelected ? 'bg-stone-100 text-ink' : 'hover:bg-stone-50 text-stone-600'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-ink border-ink' : 'border-stone-300'}`}>
                          {isSelected && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <span className="text-xs font-medium">{member.name}</span>
                        <span className="text-[10px] text-stone-400 ml-auto">{member.role}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <DraftSection items={checklistItems} setItems={setChecklistItems} roles={checklistRoles}
              icon={<CheckSquare className="w-3.5 h-3.5" />} label="Checklist theo role" />

            <DraftSection items={outcomeItems} setItems={setOutcomeItems} roles={outcomeRoles}
              icon={<Target className="w-3.5 h-3.5" />} label="Outcomes theo role" />

            {error && <p className="text-[11px] text-error">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              <Plus className="w-4 h-4" /> Tạo Phase Block
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
