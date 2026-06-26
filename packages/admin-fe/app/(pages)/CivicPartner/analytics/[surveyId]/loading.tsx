export default function SurveyAnalyticsLoading() {
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

        <div className="p-8 max-w-7xl mx-auto space-y-10">
          {/* Survey header: status + title + back/export buttons */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-pulse">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-[#e6f6ff] rounded" />
                <div className="h-3 w-32 bg-[#e6f6ff] rounded" />
              </div>
              <div className="h-10 w-2/3 bg-[#e6f6ff] rounded-xl" />
              <div className="h-4 w-full max-w-lg bg-[#e6f6ff] rounded" />
              <div className="h-4 w-1/2 bg-[#e6f6ff] rounded" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 bg-[#e6f6ff] rounded-xl" />
              <div className="h-10 w-32 bg-[#e6f6ff] rounded-xl" />
            </div>
          </section>

          {/* KPI grid — 4 cards */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl animate-pulse"
                style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}
              >
                <div className="h-3 w-24 bg-[#e6f6ff] rounded mb-4" />
                <div className="h-10 w-20 bg-[#e6f6ff] rounded-lg mb-3" />
                {i === 2 && <div className="h-1.5 w-full bg-[#e6f6ff] rounded-full" />}
              </div>
            ))}
          </section>

          {/* Response trend chart placeholder */}
          <section
            className="bg-white p-6 rounded-xl animate-pulse"
            style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1.5">
                <div className="h-5 w-36 bg-[#e6f6ff] rounded-lg" />
                <div className="h-3 w-52 bg-[#e6f6ff] rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-[#e6f6ff] rounded-lg" />
                <div className="h-8 w-16 bg-[#e6f6ff] rounded-lg" />
              </div>
            </div>
            {/* Bar chart stand-in */}
            <div className="flex items-end gap-2 h-32">
              {[40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#e6f6ff] rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </section>

          {/* Questions breakdown list */}
          <section className="space-y-4">
            <div className="h-6 w-48 bg-[#e6f6ff] rounded-lg animate-pulse" />
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl animate-pulse"
                style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-64 bg-[#e6f6ff] rounded" />
                    <div className="h-3 w-24 bg-[#e6f6ff] rounded" />
                  </div>
                  <div className="h-5 w-16 bg-[#e6f6ff] rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-[#e6f6ff] rounded-full" />
                  <div className="h-2 w-3/4 bg-[#e6f6ff] rounded-full" />
                  <div className="h-2 w-1/2 bg-[#e6f6ff] rounded-full" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
