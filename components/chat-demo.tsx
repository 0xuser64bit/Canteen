"use client";

import { ArrowUp, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/preferences";
import { AliasAvatar, AliasName } from "@/components/alias";
import { cn } from "@/lib/utils";

// Illustrative only: fictional universities and aliases, labelled "Example" in the UI.
type Line = {
  mine?: boolean;
  op?: boolean;
  alias: { name: string; hue: number };
  university: string;
  text: string;
};

const SCRIPT: Line[] = [
  {
    op: true,
    alias: { name: "Brave Heron", hue: 215 },
    university: "Maplewood University",
    text: "Is everyone in second year already sorted? Internships, research, side projects. I'm just trying to pass Calc II.",
  },
  {
    alias: { name: "Quiet Otter", hue: 155 },
    university: "Kestrel Institute of Technology",
    text: "Not just you. Half the people posting offers are panicking too, they just don't post that part.",
  },
  {
    mine: true,
    alias: { name: "Witty Lynx", hue: 40 },
    university: "",
    text: "Honestly needed to read this today.",
  },
  {
    alias: { name: "Sunny Puffin", hue: 25 },
    university: "Saltmarsh College",
    text: "Second year was my worst. I stopped comparing timelines and it got so much better.",
  },
  {
    op: true,
    alias: { name: "Brave Heron", hue: 215 },
    university: "Maplewood University",
    text: "Okay, this thread helped more than my advisor did.",
  },
];

function Typing({ line }: { line: Line }) {
  return (
    <div
      className={cn("flex items-end gap-2", line.mine && "flex-row-reverse")}
    >
      {!line.mine && (
        <AliasAvatar alias={line.alias} className="size-7 text-[11px]" />
      )}
      <div
        className={cn(
          "flex gap-1 rounded-[18px] px-4 py-3",
          line.mine ? "bg-you-surface" : "bg-surface ring-1 ring-line",
        )}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className={cn(
              "size-1.5 animate-typing rounded-full",
              line.mine ? "bg-you-surface-ink" : "bg-muted",
            )}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Bubble({ line, animate }: { line: Line; animate: boolean }) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        line.mine && "flex-row-reverse",
        animate && "animate-bubble-pop",
      )}
    >
      {!line.mine && (
        <AliasAvatar alias={line.alias} className="size-7 text-[11px]" />
      )}
      <div
        className={cn("flex max-w-[84%] flex-col", line.mine && "items-end")}
      >
        {!line.mine && (
          <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-muted">
            <AliasName alias={line.alias} className="text-[12px]" />
            {line.op && (
              <span className="rounded bg-ink px-1 py-px text-[9px] font-bold tracking-wide text-background">
                OP
              </span>
            )}
            <span aria-hidden>·</span>
            <span className="truncate">{line.university}</span>
          </p>
        )}
        <p
          className={cn(
            "rounded-[18px] px-3.5 py-2 text-[14px] leading-snug",
            line.mine
              ? "rounded-tr-md bg-you-surface text-you-surface-ink"
              : "rounded-tl-md bg-surface shadow-soft ring-1 ring-line",
          )}
        >
          {line.text}
        </p>
      </div>
    </div>
  );
}

export function ChatDemo({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  // step 2n: typing for line n; step 2n+1: line n shown.
  const [step, setStep] = useState(0);
  const finished = step >= SCRIPT.length * 2;

  useEffect(() => {
    if (reduced) return;
    const delay = finished ? 5200 : step % 2 === 0 ? 1100 : 900;
    const timer = setTimeout(() => setStep(finished ? 0 : step + 1), delay);
    return () => clearTimeout(timer);
  }, [step, finished, reduced]);

  const shown = reduced ? SCRIPT.length : Math.floor((step + 1) / 2);
  const typing =
    !reduced && !finished && step % 2 === 0 ? SCRIPT[step / 2] : undefined;

  return (
    <figure
      aria-label="Example of a Canteen thread"
      className={cn(
        "w-full max-w-[400px] overflow-hidden rounded-[36px] bg-background shadow-pop ring-1 ring-line",
        className,
      )}
    >
      <figcaption className="flex items-center gap-3 border-b border-line bg-surface/80 px-5 py-3.5 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">
            Anyone else feel behind in second year?
          </p>
          <p className="text-[11px] text-muted">4 students · Mental health</p>
        </div>
        <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-muted">
          Example
        </span>
      </figcaption>
      <div
        className="wallpaper flex h-[420px] flex-col justify-end gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_64px)] px-4 py-4"
        aria-live="off"
      >
        {SCRIPT.slice(0, shown).map((line, index) => (
          <Bubble
            key={index}
            line={line}
            animate={!reduced && index === shown - 1}
          />
        ))}
        {typing && <Typing line={typing} />}
      </div>
      <div className="flex items-center gap-2 border-t border-line bg-surface/80 px-3 py-2.5">
        <span className="flex-1 rounded-full bg-surface-2 px-4 py-2 text-[13px] text-muted ring-1 ring-line">
          Reply as Witty Lynx
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-you text-you-ink">
          <ArrowUp className="size-4 stroke-[2.6]" />
        </span>
      </div>
      <p className="flex items-center justify-center gap-1.5 bg-surface/80 pb-3 text-[11px] text-muted">
        <Lock className="size-3" /> Aliases change in every thread
      </p>
    </figure>
  );
}
