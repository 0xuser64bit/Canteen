export default function Tag({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-slate-600 px-2 text-sm dark:hover:border-white dark:bg-slate-200/20 bg-slate-200 dark:text-white text-black me-1 rounded-lg"
    >
      {label}
    </button>
  );
}
