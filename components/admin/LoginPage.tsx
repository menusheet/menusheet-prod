'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebaseAuth';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { ErrorBanner, PrimaryButton, Spinner, inputClass } from '@/components/admin/ui';

export default function LoginPage() {
  const { status, deniedEmail } = useAuthGuard();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    if (status === 'ok') router.replace('/admin');
  }, [status, router]);

  const handleGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
      router.replace('/admin');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setBusy('email');
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/admin');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  if (status === 'ok') {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Spinner label="Signed in — taking you to the dashboard…" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-800 text-white shadow-card">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M7 3v7a2.5 2.5 0 0 0 5 0V3" />
              <path d="M9.5 12.5V21" />
              <path d="M17 3c-1.7 1.5-2.5 4.5-2.5 7 0 .8.7 1.5 1.5 1.5h1v9.5" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Sign in to MenuSheet</h1>
          <p className="mt-1 text-sm text-gray-500">Admin dashboard access only.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-gray-100">
          {status === 'denied' ? (
            <div className="mb-4">
              <ErrorBanner
                message={`This account is not authorized${
                  deniedEmail ? ` (${deniedEmail})` : ''
                }. Sign in with an allow-listed admin email.`}
              />
            </div>
          ) : null}

          <button
            onClick={handleGoogle}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'google' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            ) : (
              <GoogleIcon />
            )}
            Sign in with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-100" />
            or sign in with email
            <span className="h-px flex-1 bg-gray-100" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            {error ? <ErrorBanner message={error} /> : null}
            <PrimaryButton type="submit" disabled={busy !== null} className="w-full !py-3">
              {busy === 'email' ? 'Signing in…' : 'Sign in'}
            </PrimaryButton>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
          Access is restricted to allow-listed operator emails.
          <br />
          Unauthorized accounts are signed out automatically.
        </p>
      </div>
    </div>
  );
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/auth\/invalid-credential|auth\/wrong-password/i.test(msg)) return 'Incorrect email or password.';
  if (/auth\/user-not-found/i.test(msg)) return 'No account exists with that email.';
  if (/auth\/too-many-requests/i.test(msg)) return 'Too many attempts — please wait a minute and retry.';
  if (/auth\/popup-closed|cancelled-popup/i.test(msg)) return 'The Google sign-in window was closed before finishing.';
  if (/auth\/unauthorized-domain/i.test(msg))
    return 'This domain is not authorized in Firebase Authentication → Settings → Authorized domains.';
  if (/Firebase is not configured/i.test(msg)) return msg;
  return 'Sign-in failed. Please try again.';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
