#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

/**
 * MenuSheet build-time data sync.
 *
 * Runs as a `prebuild` step. Pulls the restaurant roster from the Admin
 * Apps Script into data/restaurants.json so `next build` can generate
 * static /r/{id} pages. Menu data is NOT fetched at build time — it is
 * fetched live from each restaurant's Apps Script on the client side.
 *
 * Never fails the build: if the Admin Sheet is unreachable it falls back
 * to the previously committed data/restaurants.json (or the demo seed).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'restaurants.json');

const ADMIN_APPS_SCRIPT_URL = process.env.ADMIN_APPS_SCRIPT_URL || '';
const SHARED_SECRET = process.env.SHARED_SECRET || '';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isExpired(expiryISO) {
  if (!expiryISO || !/^\d{4}-\d{2}-\d{2}$/.test(expiryISO)) return false;
  return expiryISO < todayISO();
}

function toBool(v) {
  return v === true || String(v ?? '').trim().toUpperCase() === 'TRUE';
}

async function fetchJSON(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', ...options, signal: controller.signal });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`non-JSON response (HTTP ${res.status})`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function normalizeRow(raw) {
  const row = {};
  for (const [k, v] of Object.entries(raw)) {
    row[String(k).trim()] = typeof v === 'string' ? v.trim() : v;
  }
  return row;
}

async function main() {
  let rows = [];
  let source = 'seed';

  if (ADMIN_APPS_SCRIPT_URL && SHARED_SECRET) {
    const sep = ADMIN_APPS_SCRIPT_URL.includes('?') ? '&' : '?';
    try {
      const payload = await fetchJSON(
        `${ADMIN_APPS_SCRIPT_URL}${sep}action=listRestaurants&key=${encodeURIComponent(SHARED_SECRET)}`
      );
      if (payload && payload.error) throw new Error(payload.error);
      rows = ((payload && payload.restaurants) || []).map(normalizeRow).filter((r) => r.restaurant_id);
      source = 'live';
      console.log(`[menusheet-sync] fetched ${rows.length} restaurant(s) from the Admin Sheet`);
    } catch (err) {
      console.warn(`[menusheet-sync] listRestaurants failed (${err.message}) — falling back to committed data`);
    }
  } else {
    console.log('[menusheet-sync] ADMIN_APPS_SCRIPT_URL / SHARED_SECRET not set — using committed data');
  }

  if (!rows.length) {
    if (fs.existsSync(MANIFEST_PATH)) {
      const prev = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      rows = prev.restaurants || [];
      source = prev.source === 'live' ? 'cache' : 'seed';
    } else {
      rows = [demoRestaurantRow()];
      source = 'seed';
    }
  }

  const manifest = { generatedAt: new Date().toISOString(), source, restaurants: rows };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[menusheet-sync] wrote data/restaurants.json (source=${source})`);

  console.log('[menusheet-sync] done — menu will be fetched live from Apps Script');
}

function demoRestaurantRow() {
  return {
    restaurant_id: 'demo',
    restaurant_name: 'The Green Fork',
    owner_contact: '+91 98765 43210',
    appscript_url: '',
    sheet_id: '',
    theme_key: 'demo',
    active: 'TRUE',
    expiry_date: '2099-12-31',
    plan_amount: 100,
    onboarded_at: todayISO(),
    last_checked_at: '',
    notes: 'Built-in sample restaurant for the landing page preview.',
  };
}

main().catch((err) => {
  console.error('[menusheet-sync] unexpected error:', err.message);
  process.exit(0);
});
