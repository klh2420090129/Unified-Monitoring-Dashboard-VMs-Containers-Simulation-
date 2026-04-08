export function PredictionsPanel({ predictions }) {
  const items = predictions?.length ? predictions : [
    {
      id: 'no-risk',
      source: 'Model',
      severity: 'Info',
      confidence: 60,
      etaMinutes: 5,
      message: 'No immediate incidents are predicted from recent telemetry.',
      recommendation: 'Continue monitoring and keep autoscaling enabled.'
    }
  ];

  return (
    <div className="panel p-5">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">AI Prediction Panel</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Predictions</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Trend-based heuristics highlight likely failures before they happen.</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Demo cues: VM-2 CPU will exceed 90% in 2 mins; Container auth-service may restart soon.
      </p>
      <div className="mt-4 space-y-2">
        {items.map((prediction) => (
          <div key={prediction.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-950 dark:text-white">{prediction.source}</p>
                <p className="truncate text-slate-600 dark:text-slate-400">{prediction.message}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-semibold">
                <span className={`rounded-full px-2 py-1 ${severityTone(prediction.severity)}`}>{prediction.severity}</span>
                <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">{prediction.confidence}%</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>ETA {prediction.etaMinutes}m</span>
              <span>•</span>
              <span>{prediction.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function severityTone(severity) {
  if (severity === 'Critical') {
    return 'bg-rose-500/20 text-rose-700 dark:text-rose-200';
  }

  if (severity === 'Warning') {
    return 'bg-amber-500/20 text-amber-700 dark:text-amber-200';
  }

  return 'bg-slate-500/20 text-slate-700 dark:text-slate-200';
}
