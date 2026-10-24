"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "../supabase/browser";

export interface GoogleProfile {
  provider: "google";
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

/** Reads the profile fields Kavala needs from a Supabase user signed in with Google. */
export function profileFromUser(user: User | null): GoogleProfile | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = (meta.full_name as string) || (meta.name as string) || user.email || "Google user";
  return {
    provider: "google",
    userId: user.id,
    name,
    email: user.email ?? "",
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined,
  };
}

/**
 * Google sign-in through Supabase Auth. `available` is false until the
 * Supabase keys are configured, so the UI can explain instead of failing.
 */
export function useGoogleAccount() {
  const supabase = browserSupabase();
  const [profile, setProfile] = useState<GoogleProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setProfile(profileFromUser(data.session?.user ?? null));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfile(profileFromUser(session?.user ?? null));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (err) {
      setError(`Google sign-in didn't start: ${err.message}`);
      setBusy(false);
    }
    // On success the browser leaves for Google and comes back signed in.
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  return { available: !!supabase, ready, profile, error, busy, signIn, signOut };
}

export type GoogleAccount = ReturnType<typeof useGoogleAccount>;

/** The four-colour Google "G", drawn as a small inline icon for the sign-in button. */
export function googleIconPaths(): { d: string; fill: string }[] {
  return [
    { d: "M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z", fill: "#4285F4" },
    { d: "M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z", fill: "#34A853" },
    { d: "M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6L6.4 14z", fill: "#FBBC05" },
    { d: "M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9z", fill: "#EA4335" },
  ];
}
