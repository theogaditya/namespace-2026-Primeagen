export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f3faff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar skeleton */}
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

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto pt-4">
        {/* Header bar */}
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#f3faff] sticky top-0 z-10">
          <div className="h-10 w-96 bg-[#e6f6ff] rounded-full" />
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#e6f6ff]" />
            <div className="h-10 w-32 bg-[#e6f6ff] rounded-lg" />
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Page title + subtitle */}
          <div className="space-y-2">
            <div className="h-8 w-36 bg-[#e6f6ff] rounded-lg animate-pulse" />
            <div className="h-4 w-80 bg-[#e6f6ff] rounded animate-pulse" />
          </div>

          {/* Survey cards -3-column grid, 6 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl animate-pulse"
                style={{
                  boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)",
                  border: "1px solid rgba(193,199,208,0.1)",
                }}
              >
                {/* Status badge + category */}
                <div className="flex justify-between items-start mb-3">
                  <div className="h-5 w-16 bg-[#e6f6ff] rounded" />
                  <div className="h-3 w-20 bg-[#e6f6ff] rounded" />
                </div>
                {/* Survey title */}
                <div className="h-5 w-48 bg-[#e6f6ff] rounded-lg mb-3" />
                {/* Divider + responses */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid rgba(193,199,208,0.15)" }}
                >
                  <div className="h-4 w-28 bg-[#e6f6ff] rounded" />
                  <div className="h-5 w-5 bg-[#e6f6ff] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
