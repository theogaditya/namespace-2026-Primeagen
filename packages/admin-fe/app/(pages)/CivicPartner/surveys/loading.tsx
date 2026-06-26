export default function SurveysLoading() {
  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f3faff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar skeleton */}
      <aside className="h-screen w-64 fixed left-0 bg-[#f3faff] flex flex-col py-6 z-20">
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
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto">
        {/* Top header bar */}
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#f3faff] sticky top-0 z-10">
          <div className="h-10 w-96 bg-[#e6f6ff] rounded-full" />
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#e6f6ff]" />
            <div className="h-10 w-32 bg-[#e6f6ff] rounded-lg" />
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Page title + New Survey button */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-[#e6f6ff] rounded-lg animate-pulse" />
              <div className="h-4 w-80 bg-[#e6f6ff] rounded animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-[#e6f6ff] rounded-xl animate-pulse" />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 bg-[#e6f6ff] rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Survey card grid — 3 columns, 6 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl animate-pulse"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                {/* Status badge + date */}
                <div className="flex justify-between mb-4">
                  <div className="h-5 w-16 bg-[#e6f6ff] rounded-full" />
                  <div className="h-3 w-20 bg-[#e6f6ff] rounded" />
                </div>
                {/* Title */}
                <div className="h-5 w-40 bg-[#e6f6ff] rounded-lg mb-2" />
                {/* Description */}
                <div className="h-3 w-full bg-[#e6f6ff] rounded mb-1" />
                <div className="h-3 w-2/3 bg-[#e6f6ff] rounded mb-4" />
                {/* Footer stats */}
                <div
                  className="pt-3 flex justify-between"
                  style={{ borderTop: "1px solid rgba(193,199,208,0.15)" }}
                >
                  <div className="flex gap-4">
                    <div className="h-4 w-12 bg-[#e6f6ff] rounded" />
                    <div className="h-4 w-12 bg-[#e6f6ff] rounded" />
                  </div>
                  <div className="h-4 w-4 bg-[#e6f6ff] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
