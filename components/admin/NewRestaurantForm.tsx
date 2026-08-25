'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import manifestJson from '@/data/restaurants.json';
import { addRestaurant, listRestaurants, updateRestaurant } from '@/lib/adminApi';
import { getThemeKeys } from '@/themes';
import type { RestaurantRecord } from '@/lib/types';
import {
  ErrorBanner,
  Field,
  PrimaryButton,
  SecondaryButton,
  Select,
  Spinner,
  inputClass,
} from '@/components/admin/ui';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'restaurant'
  );
}

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const buildTimeIds = new Set(
  ((manifestJson as { restaurants?: Array<{ restaurant_id: string }> }).restaurants || []).map(
    (r) => r.restaurant_id
  )
);

export default function NewRestaurantForm() {
  return (
    <Suspense fallback={<Spinner label="Loading form…" />}>
      <Form />
    </Suspense>
  );
}

function Form() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [loadingRecord, setLoadingRecord] = useState<boolean>(Boolean(editId));
  const [record, setRecord] = useState<RestaurantRecord | null>(null);
  const [name, setName] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [contact, setContact] = useState('');
  const [appscriptUrl, setAppscriptUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [themeKey, setThemeKey] = useState('demo');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry());
  const [planAmount, setPlanAmount] = useState('100');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<RestaurantRecord | null>(null);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoadingRecord(true);
    listRestaurants()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((r) => r.restaurant_id === editId) || null;
        if (found) {
          setRecord(found);
          setName(found.restaurant_name);
          setRestaurantId(found.restaurant_id);
          setIdManuallyEdited(true);
          setContact(found.owner_contact);
          setAppscriptUrl(found.appscript_url);
          setSheetId(found.sheet_id);
          setThemeKey(found.theme_key || 'demo');
          setExpiryDate(found.expiry_date || defaultExpiry());
          setPlanAmount(String(found.plan_amount ?? '100'));
          setNotes(found.notes);
          setActive(found.active);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingRecord(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    if (idManuallyEdited || record) return;
    setRestaurantId(slugify(name));
  }, [name, idManuallyEdited, record]);

  const themeOptions = useMemo(() => getThemeKeys(), []);
  const isEdit = Boolean(record);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setBusy(true);
    const fields: Partial<RestaurantRecord> = {
      restaurant_name: name.trim(),
      owner_contact: contact.trim(),
      appscript_url: appscriptUrl.trim(),
      sheet_id: sheetId.trim(),
      theme_key: themeKey.trim() || 'demo',
      expiry_date: expiryDate,
      plan_amount: Number(planAmount) || 100,
      notes: notes.trim(),
      active,
    };
    try {
      let saved: RestaurantRecord | null;
      if (isEdit && record) {
        saved = await updateRestaurant({ ...fields, restaurant_id: record.restaurant_id });
      } else {
        saved = await addRestaurant({ ...fields, restaurant_id: slugify(restaurantId || name) });
      }
      setDone(saved || ({ ...(fields as RestaurantRecord), restaurant_id: restaurantId || slugify(name) } as RestaurantRecord));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) return <SuccessPanel record={done} wasEdit={isEdit} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {isEdit ? `Quick edit — ${record?.restaurant_name}` : 'Add a new restaurant'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit
            ? 'This restaurant was added after the last deploy — edit its billing fields here; changes save straight to the Admin Sheet.'
            : 'Creates the row in your Admin Google Sheet. The public menu page appears after the next build & deploy.'}
        </p>
      </div>

      {loadingRecord ? (
        <Spinner label="Loading restaurant…" />
      ) : (
        <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100 sm:p-8">
          {!isEdit ? (
            <Field label="Restaurant name" hint="Used for the display name and to auto-generate the ID below.">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spice Route" className={inputClass} />
            </Field>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner contact" hint="Phone or email of the restaurant owner.">
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
            </Field>
            <Field label="Plan amount (₹/month)">
              <input type="number" min="0" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field
            label={isEdit ? 'Restaurant ID' : 'Restaurant ID'}
            hint={isEdit ? 'Fixed for existing restaurants.' : 'Public URL slug — /r/{id}. Lowercase letters, numbers, dashes.'}
          >
            <input
              required
              value={restaurantId}
              disabled={isEdit}
              onChange={(e) => {
                setIdManuallyEdited(true);
                setRestaurantId(slugify(e.target.value));
              }}
              placeholder="spice-route"
              className={`${inputClass} ${isEdit ? 'opacity-60' : 'font-mono'}`}
            />
          </Field>

          <Field
            label="Apps Script Web App URL"
            hint='The /exec URL from deploying apps-script/restaurant-template.gs on the owner’s sheet.'
          >
            <input value={appscriptUrl} onChange={(e) => setAppscriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/AKfy…/exec" className={`${inputClass} font-mono text-xs`} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Google Sheet ID" hint="Optional — lets you open their sheet quickly.">
              <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} className={`${inputClass} font-mono text-xs`} />
            </Field>
            <Field label="Theme key" hint={`Installed themes: ${themeOptions.join(', ')}. Add new ones under themes/.`}>
              <Select value={themeKey} onChange={setThemeKey} options={themeOptions} placeholder="Choose a theme…" />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Expiry date" hint="Source of truth for billing. The nightly Worker enforces this.">
              <input type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Active now?" hint="You can also toggle this later from the dashboard.">
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                  active ? 'border-forest-200 bg-forest-50 text-forest-800' : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${active ? 'bg-forest-500' : 'bg-gray-300'}`} />
                {active ? 'Active' : 'Inactive (default)'}
              </button>
            </Field>
          </div>

          <Field label="Notes" hint="Free text — anything worth remembering about this account.">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </Field>

          {error ? <ErrorBanner message={error} /> : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create restaurant'}
            </PrimaryButton>
            <Link href="/admin">
              <SecondaryButton>Cancel</SecondaryButton>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function SuccessPanel({ record, wasEdit }: { record: RestaurantRecord; wasEdit: boolean }) {
  const deployed = buildTimeIds.has(record.restaurant_id);
  const steps = [
    { done: true, text: 'Row created in the Admin Sheet' },
    {
      done: Boolean(record.sheet_id),
      text: 'Owner copies docs/sheet-templates structure into their own Google Sheet',
    },
    {
      done: Boolean(record.appscript_url),
      text: 'Deploy apps-script/restaurant-template.gs on that sheet → paste the /exec URL above',
    },
    {
      done: deployed && record.theme_key !== 'demo',
      text: `Generate themes/${record.theme_key}/ with the AI prompt (themes/README.md), commit it`,
    },
    { done: deployed, text: 'Rebuild & redeploy so /r/' + record.restaurant_id + ' exists publicly' },
    { done: false, text: 'Download QR from the dashboard and hand it over 🎉' },
  ];

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-gray-100">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest-50 text-2xl">✅</span>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight">
          {wasEdit ? 'Changes saved' : `${record.restaurant_name} is onboarded!`}
        </h1>
        <p className="mt-1 font-mono text-sm text-gray-400">/r/{record.restaurant_id}</p>

        <div className="mt-6 space-y-2.5 text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 px-4 py-3">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  s.done ? 'bg-forest-100 text-forest-700' : 'bg-canvas text-gray-400'
                }`}
              >
                {i + 1}
              </span>
              <p className={`text-sm leading-snug ${s.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {deployed ? (
            <Link href={`/admin/restaurants/${record.restaurant_id}`}>
              <PrimaryButton>Open restaurant page</PrimaryButton>
            </Link>
          ) : null}
          <Link href="/admin">
            <SecondaryButton>Back to dashboard</SecondaryButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
