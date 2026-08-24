import fs from 'fs';
import path from 'path';
import type { MenuPayload, RestaurantRecord, RestaurantsManifest } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

export function loadManifest(): RestaurantsManifest {
  const file = path.join(DATA_DIR, 'restaurants.json');
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    generatedAt: parsed.generatedAt ?? '',
    source: parsed.source ?? 'seed',
    restaurants: (parsed.restaurants ?? []) as RestaurantRecord[],
  };
}

export function getRestaurant(id: string): RestaurantRecord | null {
  const manifest = loadManifest();
  return manifest.restaurants.find((r) => r.restaurant_id === id) ?? null;
}

export function loadMenuSnapshot(id: string): MenuPayload | null {
  const file = path.join(DATA_DIR, 'menus', `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      status: 'ok',
      restaurant: parsed.restaurant ?? undefined,
      menu: Array.isArray(parsed.menu) ? parsed.menu : [],
    };
  } catch {
    return null;
  }
}
