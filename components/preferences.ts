"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  applyPreferences,
  parsePreferences,
  PREFERENCES_CHANGED,
  PREFERENCES_KEY,
  type Preferences,
} from "@/lib/preferences";

let memory: string | null = null;
let unsaved = false;

function snapshot() {
  if (unsaved) return memory;
  try {
    return localStorage.getItem(PREFERENCES_KEY);
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFERENCES_KEY || event.key === null) {
      unsaved = false;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PREFERENCES_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PREFERENCES_CHANGED, onChange);
  };
}

const serverSnapshot = () => null;

export function usePreferences() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => parsePreferences(raw), [raw]);
}

/** Returns false when this session's preference could not be saved to disk. */
export function savePreferences(patch: Partial<Preferences>) {
  const preferences = parsePreferences(
    JSON.stringify({ ...parsePreferences(snapshot()), ...patch }),
  );
  memory = JSON.stringify(preferences);
  let saved = true;
  try {
    localStorage.setItem(PREFERENCES_KEY, memory);
    unsaved = false;
  } catch {
    saved = false;
    unsaved = true;
  }
  applyPreferences(preferences);
  window.dispatchEvent(new Event(PREFERENCES_CHANGED));
  return saved;
}

export function PreferenceSync() {
  const preferences = usePreferences();
  useEffect(() => applyPreferences(preferences), [preferences]);
  return null;
}

export function reducedMotion() {
  return (
    document.documentElement.dataset.motion === "reduce" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function subscribeMotion(onChange: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  const unsubscribe = subscribe(onChange);
  return () => {
    query.removeEventListener("change", onChange);
    unsubscribe();
  };
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, reducedMotion, () => false);
}
