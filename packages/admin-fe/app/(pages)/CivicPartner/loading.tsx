export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f3faff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="h-screen w-64 fixed left-0 bg-[#f3faff] flex flex-col py-6 z-20"
        style={{ borderRight: "1px solid rgba(7,30,39,0.12)" }}
      >
        <div className="px-8 mb-10">
          <div className="h-8 w-40 bg-[#e6f6ff] rounded-lg" />
          <div className="mt-2 h-3 w-24 bg-[#e6f6ff] rounded" />
        </div>
          <nav className="flex-1 space-y-2 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full bg-[#e6f6ff] rounded-xl" />
          ))}
        </nav>
        <div className="px-6 mt-auto">
          <div className="h-14 w-full rounded-xl bg-[#e6f6ff]" />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto pt-4">
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#f3faff] sticky top-0 z-10">
          <div className="h-10 w-96 bg-[#e6f6ff] rounded-full" />
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#e6f6ff]" />
            <div className="h-10 w-32 bg-[#e6f6ff] rounded-lg" />
          </div>
        </header>

        <div className="flex-1 p-8 space-y-10">
          {/* Hero metric cards */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-5 h-[220px] rounded-xl bg-[#e6f6ff] animate-pulse" />
            <div className="col-span-3 h-[220px] rounded-xl bg-white animate-pulse" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }} />
            <div className="col-span-4 h-[220px] rounded-xl bg-white animate-pulse" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }} />
          </div>

          {/* Recent surveys table + drafts sidebar */}
          <div className="grid grid-cols-12 gap-8">
            {/* Table */}
            <div className="col-span-8 space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-40 bg-[#e6f6ff] rounded-lg animate-pulse" />
                  <div className="h-3 w-64 bg-[#e6f6ff] rounded animate-pulse" />
                </div>
                <div className="h-4 w-28 bg-[#e6f6ff] rounded animate-pulse" />
              </div>
              <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
                {/* Table header */}
                <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-[#e6f6ff]/50">
                  {[48, 20, 16, 16].map((w, i) => (
                    <div key={i} className={`h-3 w-${w} bg-[#e6f6ff] rounded animate-pulse`} />
                  ))}
                </div>
                {/* Table rows */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-5 border-t border-[#e6f6ff]">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-[#f3faff] rounded animate-pulse" />
                      <div className="h-3 w-24 bg-[#f3faff] rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-16 bg-[#f3faff] rounded-full animate-pulse" />
                    <div className="h-4 w-12 bg-[#f3faff] rounded animate-pulse" />
                    <div className="h-8 w-24 bg-[#f3faff] rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Drafts sidebar */}
            <div className="col-span-4 space-y-4">
              <div className="h-6 w-36 bg-[#e6f6ff] rounded-lg animate-pulse" />
              {[1, 2].map((i) => (
                <div key={i} className="bg-[#e6f6ff]/40 p-5 rounded-xl animate-pulse">
                  <div className="h-4 w-32 bg-[#dbf1fe] rounded mb-3" />
                  <div className="h-2 w-full bg-[#dbf1fe] rounded-full mb-2" />
                  <div className="h-3 w-20 bg-[#dbf1fe] rounded" />
                </div>
              ))}
              {/* Weekly insight placeholder */}
              <div className="h-44 bg-[#e6f6ff] rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
