export function Layout({ sidebar, topbar, children }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-80 overflow-y-auto border-r border-slate-200/80 bg-slate-950/95 px-6 py-6 text-slate-100 shadow-2xl lg:flex lg:flex-col dark:border-slate-800/80">
        {sidebar}
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        {topbar}
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}