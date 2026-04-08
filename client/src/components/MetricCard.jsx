export function MetricCard({ label, value, detail, status }) {
  const tone =
    status === 'critical'
      ? 'border-red-500/30 bg-red-500/10 text-red-200'
      : status === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';

  return (
    <div className="panel metric-accent p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{value}</p>
          {detail && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{detail}</p>}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${tone}`}>
          {status}
        </span>
      </div>
    </div>
  );
}