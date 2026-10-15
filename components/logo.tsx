import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn("size-8", className)}
    >
      <path
        d="M33 17h2.5a7.5 7.5 0 0 1 0 15H33"
        stroke="#16181D"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M33 17h2.5a7.5 7.5 0 0 1 0 15H33"
        stroke="#FFD84A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14.5 9.5h12a8 8 0 0 1 8 8v13a8 8 0 0 1-8 8h-11l-7.5 5.5 1.6-7.4A8 8 0 0 1 6.5 30.5v-13a8 8 0 0 1 8-8Z"
        fill="#FFD84A"
        stroke="#16181D"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="24" r="2.4" fill="#16181D" />
      <circle cx="20.5" cy="24" r="2.4" fill="#16181D" />
      <circle cx="27" cy="24" r="2.4" fill="#16181D" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[22px] leading-none font-display">canteen</span>
    </span>
  );
}
