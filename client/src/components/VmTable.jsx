export function VmTable({ vms, onAction, canManage }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">VM fleet</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Virtual machine monitoring</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{vms.length} nodes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/60">
            <tr className="text-left text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Region</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">CPU</th>
              <th className="px-5 py-4">Memory</th>
              <th className="px-5 py-4">Disk</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {vms.map((vm) => (
              <tr key={vm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">{vm.name}</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{vm.region}</td>
                <td className="px-5 py-4">
                  <StatusPill value={vm.status} />
                </td>
                <td className="px-5 py-4">{vm.cpu}%</td>
                <td className="px-5 py-4">{vm.memory}%</td>
                <td className="px-5 py-4">{vm.disk}%</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button disabled={!canManage} onClick={() => onAction(vm.id, 'start')} className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300">
                      Start
                    </button>
                    <button disabled={!canManage} onClick={() => onAction(vm.id, 'stop')} className="rounded-xl bg-slate-500/10 px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300">
                      Stop
                    </button>
                    <button disabled={!canManage} onClick={() => onAction(vm.id, 'spike')} className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-300">
                      Spike CPU
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const color = value === 'Running' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{value}</span>;
}