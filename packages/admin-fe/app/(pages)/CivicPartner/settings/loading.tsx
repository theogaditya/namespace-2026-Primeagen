export default function SettingsLoading() {
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
          {/* Page title + subtitle */}
          <div className="space-y-2">
            <div className="h-8 w-32 bg-[#e6f6ff] rounded-lg animate-pulse" />
            <div className="h-4 w-80 bg-[#e6f6ff] rounded animate-pulse" />
          </div>

          {/* Main content grid: 5-col left + 7-col right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left col -Organisation Profile + Session */}
            <div className="lg:col-span-5 space-y-6">

              {/* Organisation Profile card */}
              <div
                className="bg-white p-8 rounded-xl animate-pulse"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                {/* Card header: avatar + title block */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#e6f6ff]" />
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-[#e6f6ff] rounded-lg" />
                    <div className="h-3 w-52 bg-[#e6f6ff] rounded" />
                  </div>
                </div>
                {/* Field grid -2 columns, 6 fields */}
                <div className="grid grid-cols-2 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-2.5 w-24 bg-[#e6f6ff] rounded" />
                      <div className="h-4 w-32 bg-[#e6f6ff] rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Session card */}
              <div
                className="bg-white p-8 rounded-xl animate-pulse"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                <div className="space-y-2 mb-4">
                  <div className="h-5 w-20 bg-[#e6f6ff] rounded-lg" />
                  <div className="h-3 w-64 bg-[#e6f6ff] rounded" />
                </div>
                <div className="h-10 w-28 bg-[#ffecea] rounded-xl" />
              </div>
            </div>

            {/* Right col -Survey Management table */}
            <div className="lg:col-span-7">
              <div
                className="bg-white rounded-xl overflow-hidden"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                {/* Table header section */}
                <div className="p-6 flex items-center justify-between border-b border-[#e6f6ff]">
                  <div className="space-y-2">
                    <div className="h-5 w-44 bg-[#e6f6ff] rounded-lg animate-pulse" />
                    <div className="h-3 w-28 bg-[#e6f6ff] rounded animate-pulse" />
                  </div>
                  <div className="h-9 w-20 bg-[#e6f6ff] rounded-lg animate-pulse" />
                </div>

                {/* Table rows */}
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-2 py-3 rounded-lg">
                      {/* Survey title + date */}
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-48 bg-[#f3faff] rounded animate-pulse" />
                        <div className="h-3 w-20 bg-[#f3faff] rounded animate-pulse" />
                      </div>
                      {/* Status badge */}
                      <div className="h-5 w-14 bg-[#f3faff] rounded-full animate-pulse" />
                      {/* Responses count */}
                      <div className="h-4 w-10 bg-[#f3faff] rounded animate-pulse" />
                      {/* Action button */}
                      <div className="h-7 w-16 bg-[#f3faff] rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
