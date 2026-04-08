const navItems = ['Dashboard', 'VMs', 'Containers', 'Alerts', 'Logs', 'Settings', 'Cost Analysis', 'Architecture', 'About'];

export function Sidebar({ activeView, setActiveView, overview, user, pods, regions, onSignOut }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cloud-400 to-cyan-400 text-lg font-black text-slate-950">
            UMD
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Cloud Ops</p>
            <h1 className="text-lg font-semibold text-white">Unified Monitoring</h1>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-400">VMs</p>
            <p className="mt-1 text-xl font-semibold text-white">{overview.totalVmRunning ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-400">Containers</p>
            <p className="mt-1 text-xl font-semibold text-white">{overview.totalContainersRunning ?? 0}</p>
          </div>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveView(item)}
            className={`nav-pill w-full justify-start ${activeView === item ? 'nav-pill-active' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-4 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Signed in as</span>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user?.role === 'Admin' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {user?.role || 'Viewer'}
          </span>
        </div>
        <div>
          <p className="font-medium text-white">{user?.name}</p>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-400">Pods</p>
            <p className="mt-1 text-lg font-semibold text-white">{pods?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-400">Regions</p>
            <p className="mt-1 text-lg font-semibold text-white">{regions?.length ?? 0}</p>
          </div>
        </div>
        <button onClick={onSignOut} className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15">
          Sign out
        </button>
      </div>
    </div>
  );
}