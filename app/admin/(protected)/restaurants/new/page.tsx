import type { Metadata } from 'next';
import NewRestaurantForm from '@/components/admin/NewRestaurantForm';

export const metadata: Metadata = {
  title: 'Add restaurant',
  robots: { index: false, follow: false },
};

export default function NewRestaurantPage() {
  return <NewRestaurantForm />;
}
