import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';
import { loadManifest } from '@/lib/staticData';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
  try {
    const today = new Date().toISOString().slice(0, 10);
    for (const r of loadManifest().restaurants) {
      if (String(r.active).toUpperCase() === 'TRUE' && r.expiry_date >= today) {
        entries.push({
          url: `${base}/r/${r.restaurant_id}`,
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }
  } catch {
    /* manifest missing — landing page only */
  }
  return entries;
}
