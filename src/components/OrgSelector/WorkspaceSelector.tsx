import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { organizations } from '../../data/mockData';
import { getUserById } from '../../data/mockData';
import { Layers, Users, ArrowRight, ArrowLeft } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function WorkspaceSelector() {
  const { selectOrg, goToLanding } = useApp();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={goToLanding}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-900">ProjectHub</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Select a Workspace</h1>
          <p className="text-gray-500">Choose an organization to manage your projects</p>
        </motion.div>

        <div className="space-y-4">
          {organizations.map((org, i) => {
            const memberCount = org.members.length;
            const pmCount = org.members.filter(m => m.role === 'PM').length;
            const devCount = org.members.filter(m => m.role === 'SW_Developer').length;

            return (
              <motion.button
                key={org.id}
                custom={i + 1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                onClick={() => selectOrg(org.id)}
                className="w-full flex items-center gap-5 bg-white rounded-xl border border-gray-200 
                           p-5 text-left hover:shadow-lg hover:border-gray-300 transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 group"
              >
                {/* Org Avatar */}
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-white">{org.name.charAt(0)}</span>
                </div>

                {/* Org Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {org.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {memberCount} members
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{pmCount} PMs</span>
                    <span className="text-gray-300">|</span>
                    <span>{devCount} Devs</span>
                  </div>
                </div>

                {/* Member Avatars */}
                <div className="hidden sm:flex items-center">
                  <div className="flex -space-x-2 mr-4">
                    {org.members.slice(0, 4).map(m => {
                      const user = getUserById(m.id);
                      return (
                        <img
                          key={m.id}
                          src={user?.avatar}
                          alt={user?.name}
                          className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"
                          title={user?.name}
                        />
                      );
                    })}
                    {org.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 
                                      flex items-center justify-center text-xs text-gray-500 font-medium">
                        +{org.members.length - 4}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-slate-600 
                                          group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
