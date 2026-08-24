import type { Metadata } from 'next';
import DashboardHome from '@/components/admin/DashboardHome';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <DashboardHome />;
}
