"use client";

import { ThemeProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      mobileOffset={{ bottom: "88px" }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !font-sans !text-[14px] !shadow-pop !ring-1 !ring-line !border-0 !bg-surface !text-ink",
          description: "!text-muted",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <ThemedToaster />
    </ThemeProvider>
  );
}
