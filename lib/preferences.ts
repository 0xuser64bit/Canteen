export const PREFERENCE_OPTIONS = {
  accent: ["yellow", "blue", "green", "rose", "violet", "orange"],
  intensity: ["soft", "vivid"],
  motion: ["system", "reduce"],
  wallpaper: ["show", "hide"],
  timestamps: ["relative", "exact"],
  clock: ["auto", "12", "24"],
} as const;

export type Preferences = {
  [
    Key in keyof typeof PREFERENCE_OPTIONS
  ]: (typeof PREFERENCE_OPTIONS)[Key][number];
};

export const DEFAULT_PREFERENCES: Preferences = {
  accent: "yellow",
  intensity: "soft",
  motion: "system",
  wallpaper: "show",
  timestamps: "relative",
  clock: "auto",
};

export const PREFERENCES_KEY = "canteen:preferences";
export const PREFERENCES_CHANGED = "canteen:preferences-changed";

function resolvePreferences(
  raw: string | null,
  defaults: Preferences,
  options: typeof PREFERENCE_OPTIONS,
): Preferences {
  const preferences = { ...defaults };
  try {
    const stored: unknown = JSON.parse(raw ?? "null");
    if (!stored || typeof stored !== "object") return preferences;
    for (const key of Object.keys(preferences) as (keyof Preferences)[]) {
      const value = (stored as Record<string, unknown>)[key];
      if (
        typeof value === "string" &&
        (options[key] as readonly string[]).includes(value)
      ) {
        // Each value has been checked against the options for this key.
        Object.assign(preferences, { [key]: value });
      }
    }
  } catch {
    // Corrupt or older storage must never prevent the app from opening.
  }
  return preferences;
}

export function parsePreferences(raw: string | null): Preferences {
  return resolvePreferences(raw, DEFAULT_PREFERENCES, PREFERENCE_OPTIONS);
}

export function applyPreferences(preferences: Preferences) {
  for (const [key, value] of Object.entries(preferences)) {
    document.documentElement.setAttribute(`data-${key}`, value);
  }
}

// Run the same validation before first paint and after browser storage changes.
export const preferencesScript = `(() => {
  let raw = null;
  try { raw = localStorage.getItem(${JSON.stringify(PREFERENCES_KEY)}); } catch {}
  (${applyPreferences.toString()})(
    (${resolvePreferences.toString()})(raw, ${JSON.stringify(DEFAULT_PREFERENCES)}, ${JSON.stringify(PREFERENCE_OPTIONS)})
  );
})();`;
