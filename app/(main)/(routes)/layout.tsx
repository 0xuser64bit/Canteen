import { Navbar } from "@/components/Navbar";

export default async function MarketingPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <div className={`flex flex-col justify-center px-[10%]`}>
        <Navbar />
        <div className="">{children}</div>
      </div>
    </div>
  );
}
