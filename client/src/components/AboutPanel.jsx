export function AboutPanel() {
  return (
    <div className="panel p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">About this project</p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Unified Monitoring Dashboard for VMs and Containers</h3>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Main Idea"
          content="This project simulates a cloud operations dashboard where teams can monitor virtual machines and container workloads in one place."
        />
        <SectionCard
          title="Purpose"
          content="To demonstrate real-time infrastructure observability, incident response, and operational decision-making in a hackathon-ready full-stack app."
        />
        <SectionCard
          title="Tech Stack Used"
          content="Frontend: React + Vite + Tailwind + Recharts. Backend: Node.js + Express + Socket.io. Auth: JWT roles (Admin/Viewer). Database: MongoDB Atlas with Mongoose."
        />
        <SectionCard
          title="Website Function"
          content="The website shows live metrics, allows VM control actions, triggers synthetic incidents, manages alerts/logs, and updates charts continuously using WebSockets."
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Panel Q&A Quick Notes</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Dynamic, not static: data is updated in real-time via Socket.io every few seconds.</li>
          <li>Persistent backend: app state is stored in MongoDB Atlas for continuity.</li>
          <li>Role-based access: Admin can control incidents and VM actions, Viewer is read-only.</li>
          <li>Use case: suitable for cloud operations, SRE demos, and incident simulation showcases.</li>
        </ul>
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