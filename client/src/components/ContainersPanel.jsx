import { useMemo, useState } from 'react';

export function ContainersPanel({
  containers,
  pods,
  canManage,
  onCreateContainer,
  onContainerAction,
  onDeleteContainer,
  onCreatePod,
  onScalePod,
  onDeletePod
}) {
  const [expandedPods, setExpandedPods] = useState(() => new Set());
  const [containerDraft, setContainerDraft] = useState({ name: '', pod: '', region: 'us-east-1' });
  const [podDraft, setPodDraft] = useState({ pod: '', region: 'us-east-1' });

  const podSummaries = useMemo(
    () => pods.map((pod) => ({
      ...pod,
      healthy: pod.containers.filter((container) => container.status === 'Healthy').length,
      warning: pod.containers.filter((container) => container.status === 'Warning').length,
      crashed: pod.containers.filter((container) => container.status === 'Crashed').length
    })),
    [pods]
  );

  function togglePod(podName) {
    setExpandedPods((current) => {
      const next = new Set(current);
      if (next.has(podName)) next.delete(podName);
      else next.add(podName);
      return next;
    });
  }

  function handleCreateContainer() {
    if (!containerDraft.name.trim() || !containerDraft.pod.trim()) return;
    onCreateContainer?.({ ...containerDraft, name: containerDraft.name.trim(), pod: containerDraft.pod.trim() });
    setContainerDraft({ name: '', pod: '', region: containerDraft.region });
  }

  function handleCreatePod() {
    if (!podDraft.pod.trim()) return;
    onCreatePod?.({ ...podDraft, pod: podDraft.pod.trim() });
    setPodDraft({ pod: '', region: podDraft.region });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <div className="panel overflow-hidden">
        <div className="border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Containers</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Docker-like workloads and health status</h3>
          {canManage && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={containerDraft.name}
                onChange={(event) => setContainerDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Container name"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                value={containerDraft.pod}
                onChange={(event) => setContainerDraft((current) => ({ ...current, pod: event.target.value }))}
                placeholder="Pod name"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                value={containerDraft.region}
                onChange={(event) => setContainerDraft((current) => ({ ...current, region: event.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="us-east-1">us-east-1</option>
                <option value="us-west-2">us-west-2</option>
                <option value="eu-west-1">eu-west-1</option>
              </select>
              <button
                onClick={handleCreateContainer}
                className="rounded-xl bg-cloud-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Add Container
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Pod</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">CPU</th>
                <th className="px-5 py-4">Memory</th>
                <th className="px-5 py-4">Restarts</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {containers.map((container) => (
                <tr key={container.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">{container.name}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{container.pod}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{container.region}</td>
                  <td className="px-5 py-4">
                    <StatusPill value={container.status} />
                  </td>
                  <td className="px-5 py-4">{container.cpu}%</td>
                  <td className="px-5 py-4">{container.memory}%</td>
                  <td className="px-5 py-4">{container.restartCount}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={!canManage}
                        onClick={() => onContainerAction?.(container.id, 'start')}
                        className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300"
                      >
                        Start
                      </button>
                      <button
                        disabled={!canManage}
                        onClick={() => onContainerAction?.(container.id, 'stop')}
                        className="rounded-xl bg-slate-500/10 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300"
                      >
                        Stop
                      </button>
                      <button
                        disabled={!canManage}
                        onClick={() => onContainerAction?.(container.id, 'restart')}
                        className="rounded-xl bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-300"
                      >
                        Restart
                      </button>
                      <button
                        disabled={!canManage}
                        onClick={() => {
                          if (window.confirm(`Delete ${container.name}?`)) {
                            onDeleteContainer?.(container.id);
                          }
                        }}
                        className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Pod groups</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Kubernetes-like grouping</h3>
        {canManage && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={podDraft.pod}
              onChange={(event) => setPodDraft((current) => ({ ...current, pod: event.target.value }))}
              placeholder="New pod name"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={podDraft.region}
              onChange={(event) => setPodDraft((current) => ({ ...current, region: event.target.value }))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="us-east-1">us-east-1</option>
              <option value="us-west-2">us-west-2</option>
              <option value="eu-west-1">eu-west-1</option>
            </select>
            <button
              onClick={handleCreatePod}
              className="rounded-xl bg-cloud-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Add Pod
            </button>
          </div>
        )}
        <div className="mt-4 space-y-4">
          {podSummaries.map((pod) => (
            <div key={pod.pod} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{pod.pod}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{pod.region}</p>
                </div>
                <button
                  onClick={() => togglePod(pod.pod)}
                  className="rounded-full bg-cloud-500/15 px-3 py-1 text-xs font-semibold text-cloud-700 transition hover:bg-cloud-500/25 dark:text-cloud-300"
                >
                  {expandedPods.has(pod.pod) ? 'Collapse' : 'Expand'} ({pod.containers.length})
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-700 dark:text-emerald-300">Healthy {pod.healthy}</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 font-semibold text-amber-700 dark:text-amber-300">Warning {pod.warning}</span>
                <span className="rounded-full bg-rose-500/15 px-2 py-1 font-semibold text-rose-700 dark:text-rose-300">Crashed {pod.crashed}</span>
                {canManage && (
                  <>
                    <button onClick={() => onScalePod?.(pod.pod, 1)} className="rounded-full bg-sky-500/15 px-2 py-1 font-semibold text-sky-700 dark:text-sky-300">Scale +1</button>
                    <button onClick={() => onScalePod?.(pod.pod, -1)} className="rounded-full bg-slate-500/15 px-2 py-1 font-semibold text-slate-700 dark:text-slate-300">Scale -1</button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete pod ${pod.pod}?`)) {
                          onDeletePod?.(pod.pod);
                        }
                      }}
                      className="rounded-full bg-rose-500/15 px-2 py-1 font-semibold text-rose-700 dark:text-rose-300"
                    >
                      Delete Pod
                    </button>
                  </>
                )}
              </div>
              {expandedPods.has(pod.pod) && (
                <div className="mt-4 space-y-2">
                  {pod.containers.map((container) => (
                    <div key={container.id} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-slate-900/70">
                      <span>{container.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">{container.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const tone =
    value === 'Healthy' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : value === 'Warning' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'bg-red-500/15 text-red-600 dark:text-red-300';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}