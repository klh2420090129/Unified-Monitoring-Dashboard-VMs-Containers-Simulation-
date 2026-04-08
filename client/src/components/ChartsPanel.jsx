import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function ChartsPanel({ history }) {
  return (
    <div className="panel p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Realtime telemetry</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">CPU, memory, and network trends</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> CPU
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Memory
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Network
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="CPU & Memory">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} tickFormatter={(value) => value.slice(11, 19)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="memory" stroke="#34d399" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Network throughput">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="netFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} tickFormatter={(value) => value.slice(11, 19)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="network" stroke="#f59e0b" fill="url(#netFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{title}</h4>
      {children}
    </div>
  );
}