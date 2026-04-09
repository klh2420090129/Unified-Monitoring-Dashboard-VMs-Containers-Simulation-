import { useEffect, useMemo, useState } from 'react';

export function OperationsInsightsPanel({ insights, cost, history, alerts, vms, containers }) {
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const timeline = insights?.timeline || [];
  const regions = insights?.regions || [];
  const forecast = insights?.forecast || cost?.forecast || null;
  const health = insights?.health || buildFallbackHealth({ alerts, vms, containers });

  useEffect(() => {
    if (!playing || timeline.length === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % timeline.length);
    }, 1800);

    return () => clearInterval(timer);
  }, [playing, timeline.length]);

  useEffect(() => {
    if (activeIndex >= timeline.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, timeline.length]);

  const selectedEvent = timeline[activeIndex] || timeline[0] || null;
  const highlightedRegion = regions.reduce((best, region) => {
    if (!best) return region;
    return region.trafficPressure > best.trafficPressure ? region : best;
  }, null);
  const healthTone = health.score >= 82 ? 'healthy' : health.score >= 65 ? 'warning' : 'critical';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Operational insights</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Health, traffic, and forecast</h3>
            </div>
            <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${toneClass(healthTone)}`}>
              {health.label} {health.score}/100
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightTile label="Health score" value={`${health.score}/100`} detail={health.summary} />
            <InsightTile label="Alerts" value={health.alertsCount ?? alerts.length} detail={`${health.autoscaledCount ?? 0} autoscaled VMs active`} />
            <InsightTile label="Demand trend" value={forecast?.trendSummary || 'Stable demand'} detail={`Multiplier ${forecast?.growthMultiplier ?? 1.0}x`} />
            <InsightTile label="Top region" value={highlightedRegion?.region || 'n/a'} detail={`${highlightedRegion?.trafficPressure ?? 0}% traffic pressure`} />
          </div>

          <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-slate-900 dark:text-slate-100">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">Cost forecast</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <ForecastTile label="Current monthly" value={formatMoney(forecast?.monthlyEstimate ?? cost?.overallEstimate ?? 0)} />
              <ForecastTile label="Next hour" value={formatMoney(forecast?.nextHourEstimate ?? 0)} />
              <ForecastTile label="Next 24h" value={formatMoney(forecast?.nextDayEstimate ?? 0)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-sky-900 dark:text-sky-100">
              <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-950/60">Normalized hourly: {formatMoney(forecast?.normalizedHourlyEstimate ?? 0)}</span>
              <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-950/60">Autoscaling premium: {formatMoney(forecast?.autoscalingPremium ?? 0)}</span>
              <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-950/60">Savings if normalized: {formatMoney(forecast?.savingsPotential ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Incident replay</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Timeline of automated actions</h3>
            </div>
            <button
              onClick={() => setPlaying((current) => !current)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${playing ? 'bg-rose-500/15 text-rose-700 dark:text-rose-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'}`}
            >
              {playing ? 'Pause replay' : 'Play replay'}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            {selectedEvent ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-950 dark:text-white">{selectedEvent.title}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass(severityTone(selectedEvent.severity))}`}>{selectedEvent.severity}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{selectedEvent.details}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                  <span>Region: {selectedEvent.region || 'global'}</span>
                  {selectedEvent.vmName && <span>VM: {selectedEvent.vmName}</span>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No timeline events captured yet.</p>
            )}
          </div>

          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {timeline.length ? timeline.map((event, index) => (
              <button
                key={event.id}
                onClick={() => setActiveIndex(index)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${index === activeIndex ? 'border-cloud-500 bg-cloud-500/10' : 'border-slate-200/70 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-950 dark:text-white">{event.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{event.region}</span>
                  <span>{event.type}</span>
                </div>
              </button>
            )) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No timeline data available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Region comparison</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Where pressure is building</h3>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Based on current traffic, VM load, and autoscaler state</div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {regions.map((region) => (
            <div key={region.region} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-950 dark:text-white">{region.region}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(region.status)}`}>{region.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                <MiniStat label="Traffic" value={`${region.trafficPressure}%`} />
                <MiniStat label="Avg CPU" value={`${region.averageCpu}%`} />
                <MiniStat label="VMs" value={`${region.runningVms}`} />
                <MiniStat label="Autoscaled" value={`${region.autoscaledVms}`} />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-cloud-500" style={{ width: `${Math.max(10, region.trafficPressure)}%` }} />
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">${region.monthlyEstimate}/mo estimated monthly spend</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildFallbackHealth({ alerts, vms, containers }) {
  const runningVms = vms.filter((vm) => vm.status === 'Running');
  const avgCpu = runningVms.length ? runningVms.reduce((sum, vm) => sum + vm.cpu, 0) / runningVms.length : 0;
  const avgMemory = runningVms.length ? runningVms.reduce((sum, vm) => sum + vm.memory, 0) / runningVms.length : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - alerts.length * 4 - Math.max(0, avgCpu - 65) - Math.max(0, avgMemory - 70))));

  return {
    score,
    label: score >= 82 ? 'Healthy' : score >= 65 ? 'Watch' : 'At Risk',
    summary: score >= 82 ? 'System state is balanced.' : score >= 65 ? 'Some load is building across the fleet.' : 'System pressure is elevated.',
    alertsCount: alerts.length,
    autoscaledCount: vms.filter((vm) => vm.createdByAutoscaler).length
  };
}

function InsightTile({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function ForecastTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-sky-500/20 bg-white/70 px-4 py-3 dark:bg-slate-950/50">
      <p className="text-[10px] uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function severityTone(severity) {
  if (String(severity).toLowerCase() === 'critical') return 'critical';
  if (String(severity).toLowerCase() === 'warning') return 'warning';
  return 'healthy';
}

function toneClass(tone) {
  if (tone === 'critical') return 'bg-rose-500/15 text-rose-700 dark:text-rose-200';
  if (tone === 'warning') return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
}

function statusTone(status) {
  if (status === 'Hot') return 'bg-rose-500/15 text-rose-700 dark:text-rose-200';
  if (status === 'Warm') return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
}
