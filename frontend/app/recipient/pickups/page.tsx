import DashboardRoute from '@/components/DashboardRoute';

export default function RecipientPickupsPage() {
  return <DashboardRoute allowedRole="INDIVIDUAL" recipientView="pickups" />;
}
