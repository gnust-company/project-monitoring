import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { X, Plus, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CreateProjectModal() {
  const { createProjectOpen, closeCreateProject, selectedOrg, addProject } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(format(addDays(new Date(), 90), 'yyyy-MM-dd'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedOrg) return;
    addProject({
      id: `p-${Date.now()}`,
      orgId: selectedOrg.id,
      name: name.trim(),
      description: description.trim() || 'New project',
      status: 'On Track',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      targetDate,
      progress: 0,
      createdBy: 'u1',
    });
    setName('');
    setDescription('');
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-slate-900">Tạo Project</h2>
            <button onClick={closeCreateProject} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Project Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g., New E-Commerce Platform"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Brief project description..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Target Date
              </label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm 
                           focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <button type="submit"
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg 
                         hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Tạo Project
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
