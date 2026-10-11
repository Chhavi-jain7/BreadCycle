import DashboardRoute from '@/components/DashboardRoute';

export default function RecipientReservationsPage() {
  return <DashboardRoute allowedRole="INDIVIDUAL" recipientView="reservations" />;
}
