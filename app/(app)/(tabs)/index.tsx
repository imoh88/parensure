import CaregiverDashboard from '@/components/CaregiverDashboard';
import CareReceiverDashboard from '@/components/CareReceiverDashboard';
import { useAuthStore } from '@/lib/store/authStore';

export default function HomeScreen() {
  const { activeRole } = useAuthStore();

  if (activeRole === 'CAREGIVER' || activeRole === 'FIRM_ADMIN') {
    return <CaregiverDashboard />;
  }

  return <CareReceiverDashboard />;
}
