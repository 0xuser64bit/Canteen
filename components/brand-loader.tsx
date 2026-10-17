import { LogoMark } from "@/components/logo";

export function BrandLoader() {
  return (
    <div
      role="status"
      aria-label="Loading Canteen"
      className="wallpaper grid min-h-dvh place-items-center bg-background px-6 py-16"
    >
      <div aria-hidden className="flex flex-col items-center text-center">
        <LogoMark className="brand-loader size-24" />
        <span className="mt-4 text-[38px] leading-none font-display">
          canteen
        </span>
        <p className="mt-5 text-[14px] text-muted">Pulling up a chair…</p>
      </div>
    </div>
  );
}
