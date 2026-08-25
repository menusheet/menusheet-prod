'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listRestaurants, pushSettingsToRestaurant, updateRestaurant } from '@/lib/adminApi';
import { daysLeft, formatDate, formatDateTime } from '@/lib/date';
import { publicMenuUrl } from '@/lib/siteUrl';
import type { RestaurantRecord } from '@/lib/types';
import { getThemeKeys } from '@/themes';
import {
  DaysBadge,
  ErrorBanner,
  Field,
  Pill,
  PrimaryButton,
  SecondaryButton,
  Select,
  Spinner,
  Toast,
  Toggle,
  inputClass,
} from '@/components/admin/ui';
import QRCodeModal from '@/components/admin/QRCodeModal';
import { IconCheck, IconCopy, IconQr, IconSheet } from '@/components/icons';

export default function RestaurantDetail({ restaurantId }: { restaurantId: string }) {
  const [record, setRecord] = useState<RestaurantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [appscriptUrl, setAppscriptUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [themeKey, setThemeKey] = useState('');
  const [contact, setContact] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listRestaurants()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((r) => r.restaurant_id === restaurantId) || null;
        if (found) {
          setRecord(found);
          setActive(found.active);
          setExpiryDate(found.expiry_date);
          setAppscriptUrl(found.appscript_url);
          setSheetId(found.sheet_id);
          setThemeKey(found.theme_key);
          setContact(found.owner_contact);
          setPlanAmount(String(found.plan_amount ?? ''));
          setNotes(found.notes);
        } else {
          setError(
            `“${restaurantId}” was not found in the live Admin Sheet. If it was added after the last deploy, use Quick edit from the dashboard table instead.`
          );
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const dirty = useMemo(() => {
    if (!record) return false;
    return (
      active !== record.active ||
      expiryDate !== record.expiry_date ||
      appscriptUrl !== record.appscript_url ||
      sheetId !== record.sheet_id ||
      themeKey !== record.theme_key ||
      contact !== record.owner_contact ||
      planAmount !== String(record.plan_amount ?? '') ||
      notes !== record.notes
    );
  }, [record, active, expiryDate, appscriptUrl, sheetId, themeKey, contact, planAmount, notes]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const save = async () => {
    if (!record) return;
    setBusy(true);
    try {
      const updated = await updateRestaurant({
        restaurant_id: record.restaurant_id,
        active,
        expiry_date: expiryDate,
        appscript_url: appscriptUrl.trim(),
        sheet_id: sheetId.trim(),
        theme_key: themeKey.trim() || 'demo',
        owner_contact: contact.trim(),
        plan_amount: Number(planAmount) || 0,
        notes: notes.trim(),
      });
      setRecord(updated);
      await pushSettingsToRestaurant(record.appscript_url, {
        menu_active: active,
        expiry_date: expiryDate,
      }).catch(() => {});
      showToast('Saved to the Admin Sheet');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicMenuUrl(restaurantId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  if (loading) return <Spinner label="Loading restaurant…" />;

  if (error || !record) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Restaurant not found</h1>
        <ErrorBanner message={error || 'Unknown error'} />
        <Link href="/admin">
          <SecondaryButton>← Back to dashboard</SecondaryButton>
        </Link>
      </div>
    );
  }

  const left = daysLeft(record.expiry_date);
  const themeOptions = getThemeKeys();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{record.restaurant_name}</h1>
            <DaysBadge days={left} />
            {record.active ? <Pill tone="ok">Active</Pill> : <Pill tone="neutral">Inactive</Pill>}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            /r/{record.restaurant_id} · onboarded {formatDate(record.onboarded_at)} · last worker check{' '}
            {record.last_checked_at ? formatDateTime(record.last_checked_at) : 'never'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SecondaryButton onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Hide preview' : 'Live preview'}
          </SecondaryButton>
          <PrimaryButton onClick={() => setQrOpen(true)}>
            <IconQr className="h-4 w-4" /> Generate QR
          </PrimaryButton>
        </div>
      </div>

      {showPreview ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="font-mono text-xs text-gray-400">{publicMenuUrl(restaurantId)}</span>
            <button
              onClick={() => window.open(`/r/${restaurantId}`, '_blank')}
              className="text-xs font-semibold text-forest-700 hover:underline"
            >
              Open in new tab ↗
            </button>
          </div>
          <iframe
            src={`/r/${restaurantId}`}
            title="Menu preview"
            className="mx-auto block h-[640px] w-full max-w-md border-0"
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-5 rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100 lg:col-span-2"
        >
          <h2 className="font-bold tracking-tight">Billing &amp; status</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Subscription expiry" hint="Source of truth — the nightly Worker pushes this to their sheet.">
              <input type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Master switch">
              <div
                className={`flex h-[42px] items-center justify-between rounded-xl border px-3.5 ${
                  active ? 'border-forest-200 bg-forest-50' : 'border-gray-200 bg-canvas'
                }`}
              >
                <span className={`text-sm font-semibold ${active ? 'text-forest-800' : 'text-gray-500'}`}>
                  {active ? 'Active' : 'Inactive'}
                </span>
                <Toggle checked={active} onChange={setActive} label="Active toggle" />
              </div>
            </Field>
          </div>

          <h2 className="pt-2 font-bold tracking-tight">Connection</h2>
          <Field label="Apps Script Web App URL" hint="Their deployed restaurant-template.gs endpoint.">
            <input value={appscriptUrl} onChange={(e) => setAppscriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" className={`${inputClass} font-mono text-xs`} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Google Sheet ID">
              <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} className={`${inputClass} font-mono text-xs`} />
            </Field>
            <Field label="Theme key" hint={`Installed: ${themeOptions.join(', ')}`}>
              <Select value={themeKey} onChange={setThemeKey} options={themeOptions} placeholder="Choose a theme…" />
            </Field>
          </div>

          <h2 className="pt-2 font-bold tracking-tight">Account</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner contact">
              <input value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Plan amount (₹/month)">
              <input type="number" min="0" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <PrimaryButton type="submit" disabled={busy || !dirty}>
              {busy ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
            </PrimaryButton>
            {!dirty && <span className="text-xs text-gray-400">All edits POST straight to the Admin Apps Script.</span>}
          </div>
        </form>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100">
            <h2 className="font-bold tracking-tight">Public URL</h2>
            <p className="mt-2 break-all rounded-lg bg-canvas px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-500">
              {publicMenuUrl(restaurantId)}
            </p>
            <button
              onClick={copyUrl}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {copied ? <IconCheck className="h-4 w-4 text-forest-600" /> : <IconCopy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
            {record.sheet_id ? (
              <a
                href={`https://docs.google.com/spreadsheets/d/${record.sheet_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <IconSheet className="h-4 w-4" />
                Open Google Sheet
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100">
            <h2 className="font-bold tracking-tight">Sync info</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Worker last check" value={record.last_checked_at ? formatDateTime(record.last_checked_at) : 'never'} />
              <Row label="Expiry date" value={formatDate(record.expiry_date)} />
              <Row label="Days remaining" value={isNaN(left) ? '—' : String(left)} />
              <Row label="Theme" value={record.theme_key} mono />
            </dl>
          </div>

          <div className="rounded-2xl bg-forest-900 p-6 text-white shadow-card">
            <h2 className="font-bold tracking-tight">Changing the theme?</h2>
            <p className="mt-2 text-xs leading-relaxed text-forest-200">
              New or changed themes are compiled at build time. After mapping a new theme here, run{' '}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono">npm run deploy</code>{' '}
              to make it live.
            </p>
          </div>
        </div>
      </div>

      {qrOpen ? (
        <QRCodeModal
          restaurantId={record.restaurant_id}
          restaurantName={record.restaurant_name}
          open
          onClose={() => setQrOpen(false)}
        />
      ) : null}

      <Toast message={toast} />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-gray-400">{label}</dt>
      <dd className={`text-right font-semibold text-gray-700 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
