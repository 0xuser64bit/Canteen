import type { Metadata, Viewport } from "next";
import { Mona_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { preferencesScript } from "@/lib/preferences";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const mona = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mona",
  display: "swap",
});

const description =
  "Conversations behind per-thread aliases. Sign in with a university email; other students see your alias, not your email.";

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
