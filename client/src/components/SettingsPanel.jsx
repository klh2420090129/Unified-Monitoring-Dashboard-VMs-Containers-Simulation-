import { useEffect, useState } from 'react';

export function SettingsPanel({ overview, pods, regions, cost, autoscaling, settings, canManage, onToggleAutoscaling, onSaveAutoscalingPolicy }) {
  const autoscalingEnabled = autoscaling?.enabled !== false;
  const [policy, setPolicy] = useState(() => ({
    cpuThreshold: settings?.autoscalingPolicy?.cpuThreshold ?? 70,
    cooldownSeconds: settings?.autoscalingPolicy?.cooldownSeconds ?? 20,
    minVmsPerRegion: settings?.autoscalingPolicy?.minVmsPerRegion ?? 1,
    maxVmsPerRegion: settings?.autoscalingPolicy?.maxVmsPerRegion ?? 4
  }));

  useEffect(() => {
    setPolicy({
      cpuThreshold: settings?.autoscalingPolicy?.cpuThreshold ?? 70,
      cooldownSeconds: settings?.autoscalingPolicy?.cooldownSeconds ?? 20,
      minVmsPerRegion: settings?.autoscalingPolicy?.minVmsPerRegion ?? 1,
      maxVmsPerRegion: settings?.autoscalingPolicy?.maxVmsPerRegion ?? 4
    });
  }, [settings]);

  function savePolicy() {
    onSaveAutoscalingPolicy?.(policy);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Simulation settings</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Multi-region cost and scaling view</h3>
        <div className="mt-5 space-y-4">
          <InfoRow label="Regions" value={regions.join(', ')} />
          <InfoRow label="Cost estimate" value={`$${cost?.overallEstimate ?? overview.costEstimate ?? 0}/mo`} />
          <InfoRow label="Autoscaling" value={autoscaling?.state ?? overview.autoscalingState ?? 'Stable'} />
          <InfoRow label="Recommended action" value={autoscaling?.recommendedAction ?? 'No changes needed'} />
          <InfoRow label="Last scaling action" value={autoscaling?.lastScalingAction ?? 'No scaling action yet'} />
          <InfoRow label="Pod groups" value={String(pods.length)} />
          {canManage && (
            <button
              onClick={() => onToggleAutoscaling?.(!autoscalingEnabled)}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${autoscalingEnabled ? 'bg-rose-500/20 text-rose-700 hover:bg-rose-500/30 dark:text-rose-200' : 'bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 dark:text-emerald-200'}`}
            >
              {autoscalingEnabled ? 'Disable autoscaling simulation' : 'Enable autoscaling simulation'}
            </button>
          )}
        </div>
      </div>
      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Autoscaling policy</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Region-based VM automation</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          When every running VM in a region crosses the threshold, the simulator adds a VM there. Once the region settles, it removes only the autoscaled VM.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <NumberField label="Scale-out CPU threshold" value={policy.cpuThreshold} onChange={(value) => setPolicy((current) => ({ ...current, cpuThreshold: value }))} />
          <NumberField label="Cooldown (seconds)" value={policy.cooldownSeconds} onChange={(value) => setPolicy((current) => ({ ...current, cooldownSeconds: value }))} />
          <NumberField label="Min VMs per region" value={policy.minVmsPerRegion} onChange={(value) => setPolicy((current) => ({ ...current, minVmsPerRegion: value }))} />
          <NumberField label="Max VMs per region" value={policy.maxVmsPerRegion} onChange={(value) => setPolicy((current) => ({ ...current, maxVmsPerRegion: value }))} />
        </div>
        {canManage && (
          <button
            onClick={savePolicy}
            className="mt-4 rounded-2xl bg-cloud-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Save Autoscaling Policy
          </button>
        )}
      </div>
      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Deployment notes</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">AWS EC2 and Azure ready</h3>
        <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <p>Use the Docker Compose stack for local development, then deploy the client and server containers to EC2, Azure Container Apps, or a VM-based Docker host.</p>
          <p>The backend exposes JWT auth, REST APIs, and Socket.io streams so you can place a reverse proxy in front without changing the frontend code.</p>
          <p>The data model is mock-backed by default, which keeps the app self-contained for hackathon demos and easy to extend to MongoDB later.</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full bg-transparent font-semibold text-slate-950 outline-none dark:text-white"
      />
    </label>
  );
}