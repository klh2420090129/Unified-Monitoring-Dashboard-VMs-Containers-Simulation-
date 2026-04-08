export function LogsPanel({ logs, level, setLevel }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Logs</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Service events and error stream</h3>
        </div>
        <div className="flex gap-2">
          {['ALL', 'INFO', 'ERROR'].map((item) => (
            <button key={item} onClick={() => setLevel(item)} className={`rounded-xl px-4 py-2 text-xs font-semibold ${level === item ? 'bg-cloud-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[420px] divide-y divide-slate-200/70 overflow-y-auto dark:divide-slate-800">
        {logs.map((log) => (
          <div key={log.id} className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[180px_1fr_90px] sm:items-center">
            <div className="text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
            <div>
              <p className="font-medium text-slate-950 dark:text-white">{log.serviceName}</p>
              <p className="text-slate-600 dark:text-slate-400">{log.message}</p>
            </div>
            <div className={`justify-self-start rounded-full px-3 py-1 text-xs font-semibold ${log.level === 'ERROR' ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'}`}>
              {log.level}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}