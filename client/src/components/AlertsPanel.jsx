export function AlertsPanel({ alerts, onClear, canManage }) {
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Alerts</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Threshold breaches and incident queue</h3>
        </div>
        <button disabled={!canManage} onClick={onClear} className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300">
          Clear alerts
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {alerts.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300/70 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No active alerts.</p>}
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityTone(alert.severity)}`}>{alert.severity}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{alert.source}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{alert.metric}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{alert.message}</p>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <p>{new Date(alert.timestamp).toLocaleString()}</p>
                <p>Threshold {alert.threshold}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function severityTone(severity) {
  if (severity === 'Critical') return 'bg-red-500/15 text-red-600 dark:text-red-300';
  if (severity === 'Warning') return 'bg-amber-500/15 text-amber-600 dark:text-amber-300';
  return 'bg-sky-500/15 text-sky-600 dark:text-sky-300';
}