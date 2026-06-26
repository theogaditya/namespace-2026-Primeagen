export default function SurveyDetailLoading() {
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

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Survey header: back link + status + title + action buttons */}
          <section className="flex flex-col md:flex-row md:items-start justify-between gap-6 animate-pulse">
            <div className="flex-1 space-y-3">
              {/* "Back to Surveys" link */}
              <div className="h-4 w-28 bg-[#e6f6ff] rounded" />
              {/* Status badge + created date */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 bg-[#e6f6ff] rounded-full" />
                <div className="h-3 w-32 bg-[#e6f6ff] rounded" />
              </div>
              {/* Title */}
              <div className="h-9 w-2/3 bg-[#e6f6ff] rounded-xl" />
              {/* Description */}
              <div className="h-4 w-full max-w-lg bg-[#e6f6ff] rounded" />
              <div className="h-4 w-2/5 bg-[#e6f6ff] rounded" />
            </div>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <div className="h-10 w-28 bg-[#e6f6ff] rounded-xl" />
              <div className="h-10 w-28 bg-[#e6f6ff] rounded-xl" />
              <div className="h-10 w-24 bg-[#e6f6ff] rounded-xl" />
            </div>
          </section>

          {/* Tab bar */}
          <div className="flex gap-1 bg-[#e6f6ff] p-1 rounded-xl w-fit animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-28 bg-white/60 rounded-lg" />
            ))}
          </div>

          {/* Overview tab content */}
          {/* KPI cards — 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl animate-pulse"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
              >
                <div className="h-3 w-24 bg-[#e6f6ff] rounded mb-3" />
                <div className="h-8 w-16 bg-[#e6f6ff] rounded-lg" />
                {i === 2 && <div className="h-1.5 w-full bg-[#e6f6ff] rounded-full mt-3" />}
              </div>
            ))}
          </div>

          {/* Detail + sidebar: 2-col then 1-col */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main detail card */}
            <div
              className="lg:col-span-2 bg-white p-8 rounded-xl animate-pulse"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
            >
              <div className="h-5 w-40 bg-[#e6f6ff] rounded mb-6" />
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-2.5 w-20 bg-[#e6f6ff] rounded" />
                    <div className="h-4 w-36 bg-[#e6f6ff] rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar card */}
            <div
              className="bg-white p-6 rounded-xl space-y-5 animate-pulse"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
            >
              <div className="h-5 w-32 bg-[#e6f6ff] rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-3 w-24 bg-[#e6f6ff] rounded" />
                  <div className="h-4 w-12 bg-[#e6f6ff] rounded" />
                </div>
              ))}
              <div className="h-1.5 w-full bg-[#e6f6ff] rounded-full mt-2" />
              <div className="h-10 w-full bg-[#e6f6ff] rounded-xl mt-4" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
