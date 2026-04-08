export function DependencyGraphPanel() {
  const nodes = [
    { id: 'frontend', label: 'Frontend (React)', x: 80, y: 80 },
    { id: 'api', label: 'API (Express + Socket)', x: 320, y: 80 },
    { id: 'auth', label: 'Auth (JWT)', x: 560, y: 30 },
    { id: 'db', label: 'Database (MongoDB Atlas)', x: 560, y: 130 },
    { id: 'cache', label: 'Cache/Session Pod', x: 320, y: 190 },
    { id: 'metrics', label: 'Metrics + Alerts Engine', x: 80, y: 190 }
  ];

  const edges = [
    ['frontend', 'api'],
    ['api', 'auth'],
    ['api', 'db'],
    ['api', 'cache'],
    ['metrics', 'api'],
    ['metrics', 'db']
  ];

  function findNode(id) {
    return nodes.find((node) => node.id === id);
  }

  return (
    <div className="panel p-5">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Service map</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Dependency graph</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Traffic path: Frontend -&gt; API -&gt; downstream services (Auth, DB, Cache).</p>

      <div className="mt-4 overflow-x-auto">
        <svg width="760" height="280" viewBox="0 0 760 280" className="min-w-[760px]">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" className="fill-slate-500 dark:fill-slate-300" />
            </marker>
          </defs>

          {edges.map(([fromId, toId]) => {
            const from = findNode(fromId);
            const to = findNode(toId);
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x + 140}
                y1={from.y + 20}
                x2={to.x}
                y2={to.y + 20}
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-400 dark:text-slate-500"
                markerEnd="url(#arrow)"
              />
            );
          })}

          {nodes.map((node) => (
            <g key={node.id}>
              <rect x={node.x} y={node.y} width="160" height="44" rx="12" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700" />
              <text x={node.x + 80} y={node.y + 27} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200" fontSize="12" fontWeight="600">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
