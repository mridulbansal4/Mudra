import { useSyncExternalStore } from "react";
import type { Locale, Role } from "@samadhan/shared-types";

export interface UserSession {
  userId: string;
  nexconnUserId: string;
  displayName: string;
  role: Role;
  locale: Locale;
  jwt: string;
  nexconnToken: string;
  appKey?: string;
  mode?: "live" | "simulated";
  simulatedCamera: boolean;
  onboarded: boolean;
}

const KEY = "samadhan.session.v1";
const listeners = new Set<() => void>();

function read(): UserSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    return null;
  }
}

let cache: UserSession | null = read();

export function setSession(s: UserSession | null) {
  cache = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function updateSession(patch: Partial<UserSession>) {
  if (cache) setSession({ ...cache, ...patch });
}

export function getSession() {
  return cache;
}

export function useSession(): UserSession | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cache,
  );
}
