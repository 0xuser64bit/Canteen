import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className="w-[80%] mx-auto" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
