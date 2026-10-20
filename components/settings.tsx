"use client";

import { Check, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { savePreferences, usePreferences } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/time";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/preferences";

const subscribeHydration = () => () => {};
const ACCENTS = [
  { id: "yellow", label: "Original", color: "oklch(0.885 0.165 96)" },
  { id: "blue", label: "Blue hour", color: "oklch(0.8 0.13 250)" },
  { id: "green", label: "Mint", color: "oklch(0.83 0.13 160)" },
  { id: "rose", label: "Rose", color: "oklch(0.83 0.12 5)" },
  { id: "violet", label: "Lilac", color: "oklch(0.82 0.11 300)" },
  { id: "orange", label: "Apricot", color: "oklch(0.85 0.13 60)" },
] as const;

function Choices({
  name,
  title,
  description,
  value,
  options,
  onChange,
}: {
  name: string;
  title: string;
  description?: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-[14px] font-semibold">{title}</legend>
      {description && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.id} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-[13px] font-semibold text-muted ring-1 ring-line transition-colors ring-inset peer-checked:bg-ink peer-checked:text-background peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:text-ink peer-checked:hover:text-background">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Settings() {
  const preferences = usePreferences();
  const [previewTime] = useState(() => new Date());
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  function update(patch: Partial<Preferences>) {
    if (!savePreferences(patch)) {
      toast.message("Applied for this visit", {
        description: "Your browser couldn't save this setting for next time.",
      });
    }
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <p className="max-w-lg text-[14px] leading-relaxed text-muted">
        Make yourself at home. Changes apply straight away and stay in this
        browser.
      </p>

      <section aria-labelledby="appearance-heading" className="space-y-6">
        <h2
          id="appearance-heading"
          className="text-[19px] font-bold tracking-tight"
        >
          Appearance
        </h2>
        <fieldset>
          <legend className="text-[14px] font-semibold">Color mode</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { id: "system", label: "Device", icon: Monitor },
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
            ].map((option) => (
              <label key={option.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="color-mode"
                  value={option.id}
                  checked={(hydrated ? theme : "system") === option.id}
                  onChange={() => setTheme(option.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-surface text-[13px] font-semibold text-muted ring-1 ring-line transition-colors ring-inset peer-checked:bg-surface-3 peer-checked:text-ink peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:text-ink">
                  <option.icon aria-hidden className="size-5" />
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Device follows your system’s light and dark schedule.
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-[14px] font-semibold">Your accent</legend>
          <p className="mt-1 text-[13px] text-muted">
            Your messages, buttons, and the Canteen logo, in the same color.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ACCENTS.map((accent) => (
              <label key={accent.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="accent"
                  value={accent.id}
                  checked={preferences.accent === accent.id}
                  onChange={() => update({ accent: accent.id })}
                  className="peer sr-only"
                />
                <span className="flex min-h-22 flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-1 text-[12px] font-semibold text-muted ring-1 ring-line transition-colors ring-inset peer-checked:text-ink peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:text-ink">
                  <span
                    className="accent-swatch grid size-8 place-items-center rounded-full ring-1 ring-current/15 ring-inset"
                    style={{ "--swatch-color": accent.color } as CSSProperties}
                  >
                    {preferences.accent === accent.id && (
                      <Check aria-hidden className="size-4 stroke-[2.5]" />
                    )}
                  </span>
                  {accent.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Choices
          name="intensity"
          title="Dark-mode accents"
          description="Soft gives your messages a dark tint with light text. Vivid fills them with your accent color."
          value={preferences.intensity}
          options={[
            { id: "soft", label: "Soft" },
            { id: "vivid", label: "Vivid" },
          ]}
          onChange={(intensity) =>
            update({ intensity: intensity as Preferences["intensity"] })
          }
        />

        <div
          aria-label="Live appearance preview"
          className="wallpaper overflow-hidden rounded-[26px] bg-surface-2 p-5 ring-1 ring-line"
        >
          <Logo className="mb-5" />
          <div className="max-w-[85%] rounded-[22px] rounded-tl-md bg-surface px-4 py-3 text-[14px] shadow-soft ring-1 ring-line">
            Same table. Your kind of color.
          </div>
          <div className="mt-3 ml-auto w-fit max-w-[85%] rounded-[22px] rounded-tr-md bg-you-surface px-4 py-3 text-[14px] font-medium text-you-surface-ink">
            Feels like me.
          </div>
          <p className="mt-3 text-right text-[12px] text-muted">
            <TimeAgo date={previewTime} /> · Preview
          </p>
        </div>
      </section>

      <section
        aria-labelledby="comfort-heading"
        className="space-y-6 border-t border-line pt-7"
      >
        <h2
          id="comfort-heading"
          className="text-[19px] font-bold tracking-tight"
        >
          Reading & comfort
        </h2>
        <Choices
          name="motion"
          title="Motion"
          description="Reduce turns off decorative animation. Your device’s reduced-motion setting is always respected."
          value={preferences.motion}
          options={[
            { id: "system", label: "Follow device" },
            { id: "reduce", label: "Reduce" },
          ]}
          onChange={(motion) =>
            update({ motion: motion as Preferences["motion"] })
          }
        />
        <Choices
          name="wallpaper"
          title="Chat wallpaper"
          description="Keep the doodles, or give your conversations a plain background."
          value={preferences.wallpaper}
          options={[
            { id: "show", label: "Doodles" },
            { id: "hide", label: "Plain" },
          ]}
          onChange={(wallpaper) =>
            update({ wallpaper: wallpaper as Preferences["wallpaper"] })
          }
        />
        <Choices
          name="timestamps"
          title="Message times"
          value={preferences.timestamps}
          options={[
            { id: "relative", label: "Time ago" },
            { id: "exact", label: "Date & time" },
          ]}
          onChange={(timestamps) =>
            update({ timestamps: timestamps as Preferences["timestamps"] })
          }
        />
        <Choices
          name="clock"
          title="Clock format"
          value={preferences.clock}
          options={[
            { id: "auto", label: "Device" },
            { id: "12", label: "12-hour" },
            { id: "24", label: "24-hour" },
          ]}
          onChange={(clock) => update({ clock: clock as Preferences["clock"] })}
        />
      </section>

      <div className="border-t border-line pt-6">
        <Button
          variant="ghost"
          onClick={() => {
            update(DEFAULT_PREFERENCES);
            setTheme("system");
            toast.success("Display settings reset to device defaults");
          }}
          className="-ml-3"
        >
          <RotateCcw /> Reset display settings
        </Button>
        <p className="mt-2 text-[12px] text-muted">
          Your account, posts, and saved threads stay as they are.
        </p>
      </div>
    </div>
  );
}
