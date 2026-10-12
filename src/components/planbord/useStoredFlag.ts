"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "stored-flag";
// Used when localStorage is blocked (private mode, previews), so toggles still work for this visit.
const memory = new Map<string, boolean>();

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? (memory.get(key) ?? fallback) : v === "1";
  } catch {
    return memory.get(key) ?? fallback;
  }
}

/**
 * A boolean remembered in this browser (e.g. a collapsed section). The server and the first client render use
 * the fallback, so there is no hydration mismatch; storage that is blocked simply falls back too.
 */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener("storage", cb);
    };
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback(
    (v: boolean) => {
      memory.set(key, v);
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {
        // Storage blocked: the in-memory value above keeps the toggle working.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}
