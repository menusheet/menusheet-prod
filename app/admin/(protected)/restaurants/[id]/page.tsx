import type { Metadata } from 'next';
import RestaurantDetail from '@/components/admin/RestaurantDetail';
import { loadManifest } from '@/lib/staticData';

export const metadata: Metadata = {
  title: 'Edit restaurant',
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  try {
    return loadManifest().restaurants.map((r) => ({ id: r.restaurant_id }));
  } catch {
    return [];
  }
}

export default function RestaurantDetailPage({ params }: { params: { id: string } }) {
  return <RestaurantDetail restaurantId={params.id} />;
}
