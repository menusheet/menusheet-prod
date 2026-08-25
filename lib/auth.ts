import { getSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type { User };

export function allowedEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowedEmails();
  if (!list.length) return true;
  return list.includes(email.trim().toLowerCase());
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-in succeeded but no user returned.');
  return data.user;
}

export async function logoutUser(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  const supabase = getSupabase();

  // Supabase's onAuthStateChange may not fire immediately on page load.
  // Fetch the current session explicitly so we resolve the initial state fast.
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}
