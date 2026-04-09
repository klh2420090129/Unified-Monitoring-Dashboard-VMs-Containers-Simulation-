export function AuditTrailPanel({ logs }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Audit trail</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Administrator activity timeline</h3>
      </div>

      <div className="max-h-[560px] divide-y divide-slate-200/70 overflow-y-auto dark:divide-slate-800">
        {logs?.length ? logs.map((entry) => (
          <div key={entry.id} className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[180px_1fr_90px] sm:items-center">
            <div className="text-slate-500 dark:text-slate-400">{new Date(entry.timestamp).toLocaleString()}</div>
            <div>
              <p className="font-medium text-slate-950 dark:text-white">{entry.serviceName}</p>
              <p className="text-slate-600 dark:text-slate-400">{entry.message}</p>
            </div>
            <div className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${entry.level === 'ERROR' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'}`}>
              {entry.level}
            </div>
          </div>
        )) : (
          <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">No admin audit entries yet.</p>
        )}
      </div>
    </div>
  );
}
