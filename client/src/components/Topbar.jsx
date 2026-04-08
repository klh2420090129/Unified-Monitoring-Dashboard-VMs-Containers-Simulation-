import { useTheme } from '../context/ThemeContext';

export function Topbar({
  search,
  setSearch,
  overview,
  alertsCount,
  notifications,
  user,
  selectedRegion,
  setSelectedRegion,
  regions,
  connectionStatus,
  lastUpdatedAt,
  canManage,
  onIncident,
  onRunDemo,
  systemStatus
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200/80 bg-slate-100/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Observability control plane</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-slate-950 dark:text-white">Live monitoring for VMs and containers</h2>
          </div>
          <div className="glass rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em]">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {connectionStatus}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="glass rounded-2xl px-3 py-2 text-xs text-slate-500 dark:text-slate-300">
            Last update {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '--:--:--'}
          </div>
          <div className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${statusTone(systemStatus?.tone)}`}>
            {systemStatus?.label || 'System Healthy'}
          </div>
          <div className="glass flex w-full min-w-[220px] items-center gap-2 rounded-2xl px-3 py-2 lg:w-[300px]">
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search VMs, containers, logs"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>
          <select
            value={selectedRegion}
            onChange={(event) => setSelectedRegion(event.target.value)}
            className="glass rounded-2xl px-3 py-2 text-sm"
          >
            <option value="ALL">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          {canManage && (
            <>
              <button
                onClick={() => onIncident('start')}
                className="rounded-2xl bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-200"
              >
                Trigger Incident
              </button>
              <button
                onClick={() => onIncident('resolve')}
                className="rounded-2xl bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200"
              >
                Resolve Incident
              </button>
              <button
                onClick={onRunDemo}
                className="rounded-2xl bg-cloud-600 px-3 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-cloud-700"
              >
                Run Incident Simulation
              </button>
            </>
          )}
          <button
            onClick={toggleTheme}
            className="glass rounded-2xl px-3 py-2 text-sm font-medium transition hover:shadow-glow"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="glass rounded-2xl px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Notifications {notifications}
            </div>
          </div>
          <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2 text-sm">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
              {user?.name?.slice(0, 2).toUpperCase() || 'UM'}
            </div>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4 sm:px-6 lg:px-8">
        <MiniStat label="VMs" value={overview.totalVmRunning ?? 0} tone="from-emerald-500/15 to-emerald-500/5" />
        <MiniStat label="Containers" value={overview.totalContainersRunning ?? 0} tone="from-sky-500/15 to-sky-500/5" />
        <MiniStat label="Alerts" value={alertsCount} tone="from-amber-500/15 to-amber-500/5" />
        <MiniStat label="Network" value={`${overview.networkThroughput ?? 0} Mbps`} tone="from-violet-500/15 to-violet-500/5" />
      </div>
    </header>
  );
}

function statusTone(tone) {
  if (tone === 'critical') {
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-200';
  }

  if (tone === 'warning') {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
  }

  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
}

function MiniStat({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-gradient-to-br ${tone} px-3 py-2 shadow-sm dark:border-slate-800`}>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}