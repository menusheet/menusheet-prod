/**
 * ============================================================
 *  MenuSheet — Admin Sheet Apps Script
 * ============================================================
 *  Deploy once on the operator-owned Admin Google Sheet:
 *    1. Open the Admin Sheet → Extensions → Apps Script.
 *    2. Paste this entire file over Code.gs.
 *    3. Replace REPLACE_ME with the current SHARED_SECRET.
 *    4. Deploy → New deployment → type "Web app".
 *         - Execute as:  Me (<operator account>)
 *         - Who has access: Anyone
 *    5. Copy the /exec URL into:
 *         - Cloudflare Worker var ADMIN_APPS_SCRIPT_URL
 *         - Build env ADMIN_APPS_SCRIPT_URL (scripts/generate-static-data.js)
 *
 *  Expected tabs: "Restaurants" (see docs/sheet-templates/).
 *  The optional "AdminAuth" tab is never exposed by this script.
 */

var SHARED_SECRET = 'REPLACE_ME';
var SHEET_NAME = 'Restaurants';

var FIELDS = [
  'restaurant_id',
  'restaurant_name',
  'owner_contact',
  'appscript_url',
  'sheet_id',
  'theme_key',
  'active',
  'expiry_date',
  'plan_amount',
  'onboarded_at',
  'last_checked_at',
  'notes'
];

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'listRestaurants' && e.parameter.key === SHARED_SECRET) {
    return json_({ status: 'ok', restaurants: listRestaurants() });
  }
  return json_({ error: 'invalid action' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'invalid JSON body' });
  }
  if (!body || body.key !== SHARED_SECRET) {
    return json_({ error: 'unauthorized' });
  }
  if (body.action === 'addRestaurant') {
    return json_({ status: 'ok', restaurant: addRestaurant(body.payload || {}) });
  }
  if (body.action === 'updateRestaurant') {
    return json_({ status: 'ok', restaurant: updateRestaurant(body.payload || {}) });
  }
  return json_({ error: 'invalid action' });
}

function listRestaurants() {
  var sh = getSheet_();
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return str_(h); });

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!str_(row[0])) continue;
    var obj = {};
    for (var f = 0; f < FIELDS.length; f++) {
      var colIdx = headers.indexOf(FIELDS[f]);
      obj[FIELDS[f]] = colIdx >= 0 ? normalizeOut_(FIELDS[f], row[colIdx]) : '';
    }
    rows.push(obj);
  }
  return rows;
}

function addRestaurant(payload) {
  if (!payload.restaurant_name) throw new Error('restaurant_name is required');
  var sh = getSheet_();
  var existingIds = listRestaurants().map(function (r) { return r.restaurant_id; });
  var id = str_(payload.restaurant_id) || uniqueId_(slugify_(payload.restaurant_name), existingIds);

  var row = blankRow_();
  row.restaurant_id = id;
  row.restaurant_name = str_(payload.restaurant_name);
  row.owner_contact = str_(payload.owner_contact);
  row.appscript_url = str_(payload.appscript_url);
  row.sheet_id = str_(payload.sheet_id);
  row.theme_key = str_(payload.theme_key) || 'demo';
  row.active = boolText_(payload.active !== undefined ? payload.active : false);
  row.expiry_date = dateStr_(payload.expiry_date) || plusDays_(30);
  row.plan_amount = num_(payload.plan_amount !== undefined && payload.plan_amount !== '' ? payload.plan_amount : 100);
  row.onboarded_at = todayStr_();
  row.notes = str_(payload.notes);

  appendRow_(sh, row);
  return row;
}

function updateRestaurant(payload) {
  if (!payload.restaurant_id) throw new Error('restaurant_id is required');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_();
    var values = sh.getDataRange().getValues();
    var headers = values[0].map(function (h) { return str_(h); });
    for (var r = 1; r < values.length; r++) {
      if (str_(values[r][0]) !== str_(payload.restaurant_id)) continue;
      for (var f = 0; f < FIELDS.length; f++) {
        var field = FIELDS[f];
        if (field === 'restaurant_id') continue;
        if (!(field in payload)) continue;
        var colIdx = headers.indexOf(field);
        if (colIdx < 0) continue;
        sh.getRange(r + 1, colIdx + 1).setValue(normalizeIn_(field, payload[field]));
      }
      SpreadsheetApp.flush();
      return listRestaurants().filter(function (x) {
        return x.restaurant_id === str_(payload.restaurant_id);
      })[0] || null;
    }
    throw new Error('restaurant not found: ' + payload.restaurant_id);
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- helpers

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Missing "' + SHEET_NAME + '" tab');
  return sh;
}

function blankRow_() {
  var row = {};
  for (var i = 0; i < FIELDS.length; i++) row[FIELDS[i]] = '';
  return row;
}

function appendRow_(sh, row) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function (h) { return str_(h); });
  var line = FIELDS.map(function (f) {
    var idx = headers.indexOf(f);
    return idx >= 0 ? row[f] : '';
  });
  sh.appendRow(line);
}

function normalizeIn_(field, value) {
  if (field === 'active') return boolText_(value);
  if (field === 'plan_amount') return num_(value);
  if (field === 'expiry_date' || field === 'onboarded_at') return dateStr_(value);
  return str_(value);
}

function normalizeOut_(field, value) {
  if (field === 'active') return boolText_(value);
  if (field === 'plan_amount') return num_(value);
  return str_(value);
}

function slugify_(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'restaurant';
}

function uniqueId_(base, existing) {
  if (existing.indexOf(base) === -1) return base;
  var n = 2;
  while (existing.indexOf(base + '-' + n) !== -1) n++;
  return base + '-' + n;
}

function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function plusDays_(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function dateStr_(v) {
  var s = str_(v);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function str_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v).trim();
}

function num_(v) {
  var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function bool_(v) {
  if (v === true) return true;
  if (v === false || v === '' || v === null || v === undefined) return false;
  return String(v).trim().toUpperCase() === 'TRUE';
}

function boolText_(v) {
  return bool_(v) ? 'TRUE' : 'FALSE';
}
