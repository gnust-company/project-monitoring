import { useApp } from '../../context/AppContext';
import ProfileContent from './ProfileContent';

export default function ProfileView() {
  const { setWorkspaceView, openPhaseDetail } = useApp();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6">
        <ProfileContent onOpenPhase={(id) => { setWorkspaceView('pipeline'); openPhaseDetail(id); }} />
      </div>
    </div>
  );
}
