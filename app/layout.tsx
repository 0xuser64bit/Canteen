import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Canteen",
  description: "Meet Students from Other Colleges",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} new-amsterdam-regular font-sa bg-[#f9f9fb] dark:bg-[#262c36]`}
      >
        <Providers>
          <Toaster position="bottom-center" richColors />
          {children}
        </Providers>
      </body>
    </html>
  );
}
