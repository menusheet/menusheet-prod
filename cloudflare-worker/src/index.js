/**
 * MenuSheet — nightly reconciliation Worker.
 *
 * Runs at 00:00 IST (30 18 * * * UTC). The Admin Google Sheet is the single
 * source of truth for billing/expiry. For every restaurant row this job:
 *   1. computes the correct menu_active / expiry_date state,
 *   2. reads the restaurant's own Settings tab via its Apps Script,
 *   3. overwrites it when the two drift (owner tampering, missed renewals),
 *   4. stamps last_checked_at on the Admin Sheet row,
 *   5. auto-flips admin `active` to FALSE once expiry has passed.
 *
 * One broken restaurant never halts the run — failures are logged and the
 * loop continues.
 */

const IST_TZ = 'Asia/Kolkata';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      reconcile(env).then((summary) => {
        console.log('[menusheet] reconciliation summary:', JSON.stringify(summary));
      })
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== env.SHARED_SECRET) {
      return new Response('unauthorized', { status: 401 });
    }
    const summary = await reconcile(env);
    return Response.json(summary);
  },
};

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ }).format(new Date());
}

function truthy(v) {
  return v === true || String(v ?? '').trim().toUpperCase() === 'TRUE';
}

function boolText(v) {
  return truthy(v) ? 'TRUE' : 'FALSE';
}

async function gasGet(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response from Apps Script (HTTP ${res.status})`);
  }
}

async function gasPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response from Apps Script (HTTP ${res.status})`);
  }
}

export async function reconcile(env) {
  const summary = {
    ranAt: new Date().toISOString(),
    total: 0,
    synced: 0,
    flippedInactive: 0,
    alreadyCorrect: 0,
    failures: [],
  };

  if (!env.ADMIN_APPS_SCRIPT_URL || !env.SHARED_SECRET) {
    summary.failures.push('ADMIN_APPS_SCRIPT_URL or SHARED_SECRET not configured');
    return summary;
  }

  let restaurants;
  try {
    const sep = env.ADMIN_APPS_SCRIPT_URL.includes('?') ? '&' : '?';
    const payload = await gasGet(
      `${env.ADMIN_APPS_SCRIPT_URL}${sep}action=listRestaurants&key=${encodeURIComponent(env.SHARED_SECRET)}`
    );
    if (payload.error) throw new Error(payload.error);
    restaurants = payload.restaurants || [];
  } catch (err) {
    summary.failures.push(`listRestaurants failed: ${err.message}`);
    return summary;
  }

  summary.total = restaurants.length;
  const nowIso = new Date().toISOString();
  const today = todayISO();

  for (const row of restaurants) {
    const id = String(row.restaurant_id || '');
    try {
      if (!id || !row.appscript_url) throw new Error('missing restaurant_id or appscript_url');

      const expired = Boolean(row.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(row.expiry_date) && row.expiry_date < today);
      const desiredActive = truthy(row.active) && !expired;

      if (expired && truthy(row.active)) {
        await gasPost(env.ADMIN_APPS_SCRIPT_URL, {
          key: env.SHARED_SECRET,
          action: 'updateRestaurant',
          payload: { restaurant_id: id, active: 'FALSE', last_checked_at: nowIso },
        });
        summary.flippedInactive++;
      } else {
        await gasPost(env.ADMIN_APPS_SCRIPT_URL, {
          key: env.SHARED_SECRET,
          action: 'updateRestaurant',
          payload: { restaurant_id: id, last_checked_at: nowIso },
        });
      }

      const sep2 = String(row.appscript_url).includes('?') ? '&' : '?';
      const settingsPayload = await gasGet(
        `${row.appscript_url}${sep2}action=getSettings&key=${encodeURIComponent(env.SHARED_SECRET)}`
      );
      if (settingsPayload.error) throw new Error(settingsPayload.error);
      const current = (settingsPayload.settings || {});

      const desired = {
        menu_active: boolText(desiredActive),
        expiry_date: row.expiry_date || '',
        last_synced_at: nowIso,
      };

      const drift =
        boolText(current.menu_active) !== desired.menu_active ||
        String(current.expiry_date || '') !== desired.expiry_date;

      if (drift) {
        const result = await gasPost(row.appscript_url, {
          key: env.SHARED_SECRET,
          action: 'updateSettings',
          payload: desired,
        });
        if (result.error) throw new Error(result.error);
        summary.synced++;
        console.log(`[menusheet] ${id}: reconciled Settings tab`);
      } else {
        summary.alreadyCorrect++;
      }
    } catch (err) {
      console.error(`[menusheet] ${id}: ${err.message}`);
      summary.failures.push(`${id}: ${err.message}`);
    }
  }

  return summary;
}
