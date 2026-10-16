import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { X, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function CreateProjectModal() {
  const { createProjectOpen, closeCreateProject, selectedOrg, addProject } = useApp();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd')); // #20: chọn được

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedOrg) return;
    addProject({
      id: `p-${Date.now()}`,
      orgId: selectedOrg.id,
      name: name.trim(),
      description: description.trim() || 'New project',
      status: 'On Track',
      startDate,
      progress: 0,
      createdBy: 'u1',
    });
    setName('');
    setDescription('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    closeCreateProject();
  };

  if (!createProjectOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={closeCreateProject}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
            <h2 className="text-base font-bold text-ink">{t('sidebar.createProject')}</h2>
            <button onClick={closeCreateProject} className="p-1 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">{t('createProject.name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={t('createProject.namePlaceholder')}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink"
                required />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block">{t('createPhase.description')}</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder={t('createProject.descriptionPlaceholder')}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700 mb-1 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {t('project.startDate')}
              </label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-ink/15 focus:border-ink" />
            </div>
            <button type="submit"
              className="w-full py-2.5 bg-ink text-white text-sm font-semibold rounded-lg
                         hover:bg-[#242424] transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> {t('sidebar.createProject')}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
