import { Navbar } from "@/components/Navbar";

export default function MarketingPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full">
      <Navbar />
      <main className="h-full">{children}</main>
    </div>
  );
}
