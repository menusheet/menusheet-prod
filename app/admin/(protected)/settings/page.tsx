import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-firebase-project-id';
const allowedEmails = process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS || '(not set)';
const secretConfigured = Boolean(process.env.NEXT_PUBLIC_SHARED_SECRET);

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Everything on this page is configured through environment variables and requires a rebuild +
          redeploy to change.
        </p>
      </div>

      <Card title="Admin access (Firebase Authentication)">
        <p className="text-sm leading-relaxed text-gray-600">
          Sign-in runs through Firebase Auth (Google + Email/Password). After sign-in, the account email
          must be on the allow-list or the dashboard signs it out immediately. Manage actual user
          accounts in the Firebase console:
        </p>
        <a
          href={`https://console.firebase.google.com/project/${projectId}/authentication/users`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-800"
        >
          Open Firebase → Authentication → Users ↗
        </a>
        <Row label="Firebase project" value={projectId} mono />
        <Row label="Allowed emails" value={allowedEmails} mono />
        <Hint>Env vars: NEXT_PUBLIC_FIREBASE_* and NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS in .env.local</Hint>
      </Card>

      <Card title="Shared secret (Apps Script)">
        <p className="text-sm leading-relaxed text-gray-600">
          The SHARED_SECRET gates all write actions against your Google Sheets (add/update restaurant,
          update settings, worker reconciliation). It is embedded in this dashboard bundle by design —
          treat it as rotatable and keep it out of any public repo history.
        </p>
        <Row label="Configured" value={secretConfigured ? 'Yes' : 'No — set NEXT_PUBLIC_SHARED_SECRET'} />
        <Hint>
          Rotation runbook: docs/onboarding-checklist.md § SHARED_SECRET rotation. Remember existing
          restaurants&apos; deployed scripts keep the old secret until you redeploy their script too.
        </Hint>
      </Card>

      <Card title="Deploys & rebuilds">
        <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-600">
          <li>New restaurant or new/changed theme → rebuild + redeploy required.</li>
          <li>Menu edits, expiry changes, active toggles → live via Apps Script, no deploy needed.</li>
          <li>Deploy command: <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs">npm run build &amp;&amp; firebase deploy --only hosting</code></li>
          <li>The nightly Cloudflare Worker keeps billing state in sync across sheets.</li>
        </ul>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-forest-700 hover:underline">
          ← Back to dashboard
        </Link>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-100 sm:p-8">
      <h2 className="mb-3 font-bold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-gray-100 pt-3 first:border-0 first:pt-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-right font-semibold ${mono ? 'break-all font-mono text-xs' : 'text-sm'}`}>
        {value}
      </span>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs leading-relaxed text-gray-500">{children}</p>;
}
