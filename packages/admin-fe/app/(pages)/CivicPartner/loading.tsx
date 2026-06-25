export default function CivicPartnerLoading() {
  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f3faff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar skeleton */}
      <aside className="h-screen w-64 fixed left-0 bg-[#f3faff] flex flex-col py-6 z-20">
        <div className="px-8 mb-10">
          <div className="h-8 w-40 bg-[#e6f6ff] rounded-md animate-pulse" />
          <div className="mt-3 h-3 w-24 bg-[#eef7ff] rounded-md animate-pulse" />
        </div>

        <nav className="flex-1 space-y-4 px-4 mt-2">
          <div className="h-10 w-full bg-white/60 rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-white/60 rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-white/60 rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-white/60 rounded-xl animate-pulse" />
        </nav>

        <div className="px-6 mt-auto">
          <div className="h-12 w-full rounded-xl bg-gradient-to-br from-[#cfe8f7] to-[#dff3ff] animate-pulse" />
        </div>
      </aside>

      {/* Main area skeleton */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto">
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#f3faff] sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-[#e6f6ff] px-4 py-2 rounded-full w-96">
            <div className="h-4 w-4 bg-white/60 rounded-full animate-pulse" />
            <div className="h-4 w-full bg-white/60 rounded-md animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-white/60 animate-pulse" />
            <div className="h-10 w-40 bg-white/60 rounded-md animate-pulse" />
          </div>
        </header>

        <div className="flex-1 px-8 py-6 space-y-6">
          {/* Top metrics */}
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-white/70 shadow-sm animate-pulse h-28" />
            <div className="p-4 rounded-xl bg-white/70 shadow-sm animate-pulse h-28" />
            <div className="p-4 rounded-xl bg-white/70 shadow-sm animate-pulse h-28" />
          </div>

          {/* Large chart/card area */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 rounded-xl bg-white/70 shadow-sm animate-pulse h-72" />
            <div className="rounded-xl bg-white/70 shadow-sm animate-pulse h-72" />
          </div>

          {/* List skeletons */}
          <div className="space-y-4">
            <div className="h-4 w-40 bg-white/60 rounded-md animate-pulse" />
            <div className="space-y-3">
              <div className="h-16 rounded-lg bg-white/70 animate-pulse" />
              <div className="h-16 rounded-lg bg-white/70 animate-pulse" />
              <div className="h-16 rounded-lg bg-white/70 animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
