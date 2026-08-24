import type { Metadata } from 'next';
import LoginPage from '@/components/admin/LoginPage';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <LoginPage />;
}
