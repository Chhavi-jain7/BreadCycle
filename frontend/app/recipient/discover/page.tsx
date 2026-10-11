import DashboardRoute from '@/components/DashboardRoute';

export default function RecipientDiscoverPage() {
  return <DashboardRoute allowedRole="INDIVIDUAL" initialTab="DISCOVERY" />;
}
