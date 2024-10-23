export default function UniversityPage({
  params,
}: {
  params: { name: string };
}) {
  return <div>University Page {params.name.split("-").join(" ")}</div>;
}
