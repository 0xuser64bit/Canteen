import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Alias = { name: string; hue: number };

/** Colours derive from the alias hue; lightness and chroma come from the theme tokens. */
export function aliasStyle(hue: number) {
  return { "--hue": hue } as CSSProperties;
}

export function AliasAvatar({
  alias,
  className,
}: {
  alias: Alias;
  className?: string;
}) {
  const initials = alias.name
    .split(" ")
    .map((word) => word[0])
    .join("");
  return (
    <span
      aria-hidden
      style={aliasStyle(alias.hue)}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold tracking-tight",
        "bg-[oklch(var(--alias-bg-l)_var(--alias-bg-c)_var(--hue))] text-[oklch(var(--alias-fg-l)_var(--alias-fg-c)_var(--hue))]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function AliasName({
  alias,
  className,
}: {
  alias: Alias;
  className?: string;
}) {
  return (
    <span
      style={aliasStyle(alias.hue)}
      className={cn(
        "font-semibold text-[oklch(var(--alias-name-l)_var(--alias-name-c)_var(--hue))]",
        className,
      )}
    >
      {alias.name}
    </span>
  );
}
