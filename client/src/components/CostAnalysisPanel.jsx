export function CostAnalysisPanel({ cost, vms, containers }) {
  const runningVms = vms.filter((vm) => vm.status === 'Running').length;
  const activeContainers = containers.filter((container) => container.status !== 'Crashed').length;

  const vmCost = Number((cost?.breakdown?.vmCompute ?? runningVms * 58).toFixed(2));
  const containerCost = Number((cost?.breakdown?.containerCompute ?? activeContainers * 12.5).toFixed(2));
  const storageCost = Number((cost?.breakdown?.storage ?? runningVms * 8.5).toFixed(2));
  const networkCost = Number((cost?.breakdown?.network ?? (runningVms + activeContainers) * 4.1).toFixed(2));
  const orchestrationCost = Number((cost?.breakdown?.orchestration ?? 0).toFixed(2));
  const autoscalePremium = Number((cost?.breakdown?.autoscalingPremium ?? 0).toFixed(2));
  const projectedTotal = Number((cost?.overallEstimate ?? vmCost + containerCost + storageCost + networkCost + orchestrationCost + autoscalePremium).toFixed(2));
  const optimizedBaseline = Number((cost?.optimization?.baselineWithoutAutoscaled ?? projectedTotal - autoscalePremium).toFixed(2));
  const autoscaledVmCount = Number(cost?.optimization?.autoscaledVmCount ?? 0);

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
          <CostTile label="Orchestration" value={orchestrationCost} />
          <CostTile label="Autoscaling premium" value={autoscalePremium} />
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
          Projected total: <span className="font-semibold">${projectedTotal}/mo</span>
          <div>Without temporary autoscaled VMs: <span className="font-semibold">${optimizedBaseline}/mo</span></div>
          <div>{cost?.optimization?.optimizationNote || 'Costs update from live VM/container capacity.'}</div>
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
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {entry.runningVms ?? 0} running VMs ({entry.autoscaledVms ?? 0} autoscaled), {entry.activeContainers ?? 0} active containers, {entry.pods ?? 0} pods
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-cloud-500" style={{ width: `${Math.max(8, (entry.monthlyEstimate / maxRegion) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Autoscaling impact</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Capacity-driven cost behavior</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CostTile label="Autoscaled VMs" value={autoscaledVmCount} unit="count" />
          <CostTile label="Temporary premium" value={autoscalePremium} />
          <CostTile label="Potential drop post scale-in" value={Math.max(0, Number((projectedTotal - optimizedBaseline).toFixed(2)))} />
        </div>
      </div>
    </div>
  );
}

function CostTile({ label, value, unit = 'currency' }) {
  const renderedValue = unit === 'currency' ? `$${value}` : value;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{renderedValue}</p>
    </div>
  );
}
