export function AboutPanel() {
  return (
    <div className="panel p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">About this project</p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Unified Monitoring Dashboard for VMs and Containers</h3>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Main Idea"
          content="A single cloud ops dashboard for VMs and containers with live telemetry, incident simulation, and presentation-ready storytelling."
        />
        <SectionCard
          title="Purpose"
          content="To show real-time observability, predictive alerting, and incident response in a hackathon-ready full-stack app."
        />
        <SectionCard
          title="Tech Stack Used"
          content="Frontend: React + Vite + Tailwind + Recharts. Backend: Node.js + Express + Socket.io. Auth: JWT roles. Data: MongoDB Atlas with a safe in-memory fallback for demos."
        />
        <SectionCard
          title="What It Does"
          content="Shows live metrics, predicts likely incidents, simulates autoscaling, triggers synthetic incidents, manages alerts and logs, and updates charts continuously."
        />
        <SectionCard
          title="High-Impact Features"
          content="AI Prediction Panel, Run Incident Simulation button, expandable pod groups, cost analysis, dependency graph, region filters, CSV export, and dynamic system health tags."
        />
        <SectionCard
          title="Deployment"
          content="Validated on AWS EC2 with Docker and Docker Compose, plus an SSH helper script and a public demo URL."
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Panel Q&A Quick Notes</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Dynamic, not static: data is updated in real-time via Socket.io every few seconds.</li>
          <li>Persistent backend: app state is stored in MongoDB Atlas for continuity.</li>
          <li>Role-based access: Admin can control incidents and VM actions, Viewer is read-only.</li>
          <li>Predictive demo story: trend-based heuristics surface likely failures before they happen.</li>
          <li>Use case: ideal for cloud operations, SRE demos, and judge walkthroughs.</li>
        </ul>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <MiniFact label="Live updates" value="Socket.io stream" />
        <MiniFact label="Demo mode" value="One-click incident flow" />
        <MiniFact label="Cloud ready" value="Docker + EC2" />
      </div>
    </div>
  );
}

function SectionCard({ title, content }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{content}</p>
    </div>
  );
}

function MiniFact({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}