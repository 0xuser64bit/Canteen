export default async function MyUniversityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // don't know if we need this layout or not...
  return <div className="">{children}</div>;
}
