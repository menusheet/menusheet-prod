import type { RestaurantRecord } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_ADMIN_APPS_SCRIPT_URL || '';
const SECRET = process.env.NEXT_PUBLIC_SHARED_SECRET || '';

export function adminApiConfigured(): boolean {
  return Boolean(BASE && SECRET);
}

function requireConfig() {
  if (!adminApiConfigured()) {
    throw new Error(
      'Admin API is not configured. Set NEXT_PUBLIC_ADMIN_APPS_SCRIPT_URL and NEXT_PUBLIC_SHARED_SECRET in .env.local and rebuild.'
    );
  }
}

async function gasGet(action: string): Promise<Record<string, unknown>> {
  requireConfig();
  const url = `${BASE}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(SECRET)}`;
  const res = await fetch(url, { redirect: 'follow' });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.error) throw new Error(String(data.error));
  return data;
}

async function gasPost(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  requireConfig();
  const res = await fetch(BASE, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key: SECRET, action, payload }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.error) throw new Error(String(data.error));
  return data;
}

function toBool(v: unknown): boolean {
  return v === true || String(v ?? '').trim().toUpperCase() === 'TRUE';
}

function normalizeRow(raw: Record<string, unknown>): RestaurantRecord {
  return {
    restaurant_id: String(raw.restaurant_id ?? '').trim(),
    restaurant_name: String(raw.restaurant_name ?? '').trim(),
    owner_contact: String(raw.owner_contact ?? '').trim(),
    appscript_url: String(raw.appscript_url ?? '').trim(),
    sheet_id: String(raw.sheet_id ?? '').trim(),
    theme_key: String(raw.theme_key ?? 'demo').trim(),
    active: toBool(raw.active),
    expiry_date: String(raw.expiry_date ?? '').slice(0, 10),
    plan_amount: (raw.plan_amount ?? '') as string | number,
    onboarded_at: String(raw.onboarded_at ?? ''),
    last_checked_at: String(raw.last_checked_at ?? ''),
    notes: String(raw.notes ?? ''),
  };
}

function normalizeRestaurantOut(r: RestaurantRecord | null): RestaurantRecord | null {
  return r ? normalizeRow(r as unknown as Record<string, unknown>) : null;
}

export async function listRestaurants(): Promise<RestaurantRecord[]> {
  const data = await gasGet('listRestaurants');
  const rows = Array.isArray(data.restaurants) ? (data.restaurants as Record<string, unknown>[]) : [];
  return rows.filter((r) => r.restaurant_id).map(normalizeRow);
}

export async function addRestaurant(
  fields: Partial<RestaurantRecord>
): Promise<RestaurantRecord | null> {
  const data = await gasPost('addRestaurant', fields as Record<string, unknown>);
  return normalizeRestaurantOut((data.restaurant as RestaurantRecord) ?? null);
}

export async function updateRestaurant(
  fields: Partial<RestaurantRecord>
): Promise<RestaurantRecord | null> {
  const data = await gasPost('updateRestaurant', fields as Record<string, unknown>);
  return normalizeRestaurantOut((data.restaurant as RestaurantRecord) ?? null);
}
