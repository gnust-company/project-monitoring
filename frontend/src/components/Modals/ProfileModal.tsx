import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { X } from 'lucide-react';
import ProfileContent from '../Workspace/ProfileContent';

// Modal hồ sơ toàn cục — mở từ menu tài khoản ở bất kỳ view nào.
// Nội dung dùng chung ProfileContent (giống hệt trang Hồ sơ trong workspace).
export default function ProfileModal() {
  const { profileModalOpen, closeProfileModal, currentUser } = useApp();

  if (!profileModalOpen || !currentUser) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-10"
        onClick={closeProfileModal}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          className="bg-surface-soft rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[88vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-white flex-shrink-0">
            <h2 className="text-base font-bold text-ink">Hồ sơ của tôi</h2>
            <button onClick={closeProfileModal} className="p-1.5 hover:bg-stone-100 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            <ProfileContent />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
