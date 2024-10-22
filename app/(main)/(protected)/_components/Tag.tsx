export default function Tag({
  label,
  onClick,
  colour,
}: {
  label: string;
  onClick?: () => void;
  colour: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary-foreground border border-slate-600 px-2 text-sm dark:hover:border-white dark:bg-slate-200/20 bg-slate-200 dark:text-white text-black me-1 rounded-lg bg-slate-400/10"
    >
      {label}
    </button>
  );
}
