import type { Metadata, Viewport } from "next";
import { Mona_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const mona = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mona",
  display: "swap",
});

const description =
  "Anonymous conversations between verified university students. Your university email proves you're a student; nobody ever sees who you are.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Canteen: talk like nobody's watching",
    template: "%s · Canteen",
  },
  description,
  applicationName: "Canteen",
  openGraph: {
    type: "website",
    siteName: "Canteen",
    title: "Canteen",
    description,
  },
  twitter: { card: "summary_large_image", title: "Canteen", description },
  appleWebApp: { title: "Canteen", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#121418" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={mona.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
