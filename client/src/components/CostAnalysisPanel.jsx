export function CostAnalysisPanel({ cost, vms, containers }) {
  const runningVms = vms.filter((vm) => vm.status === 'Running').length;
  const activeContainers = containers.filter((container) => container.status !== 'Crashed').length;

  const vmCost = Number((runningVms * 62.5).toFixed(2));
  const containerCost = Number((activeContainers * 18.2).toFixed(2));
  const storageCost = Number((runningVms * 7.4 + 24).toFixed(2));
  const networkCost = Number((activeContainers * 3.8 + 14).toFixed(2));
  const projectedTotal = Number((vmCost + containerCost + storageCost + networkCost).toFixed(2));

  const maxRegion = Math.max(...(cost?.regionSummary || []).map((entry) => entry.monthlyEstimate), 1);

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Cost analysis</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Estimated monthly cloud spend</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CostTile label="VM compute" value={vmCost} />
          <CostTile label="Containers" value={containerCost} />
          <CostTile label="Storage" value={storageCost} />
          <CostTile label="Network" value={networkCost} />
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">
          Projected total: <span className="font-semibold">${projectedTotal}/mo</span>
          <span className="mx-2">|</span>
          Simulator baseline: <span className="font-semibold">${cost?.overallEstimate ?? projectedTotal}/mo</span>
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Regional breakdown</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Spend by deployment region</h3>
        <div className="mt-5 space-y-3">
          {(cost?.regionSummary || []).map((entry) => (
            <div key={entry.region} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{entry.region}</span>
                <span className="text-slate-600 dark:text-slate-300">${entry.monthlyEstimate}/mo</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-cloud-500" style={{ width: `${Math.max(8, (entry.monthlyEstimate / maxRegion) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CostTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">${value}</p>
    </div>
  );
}
