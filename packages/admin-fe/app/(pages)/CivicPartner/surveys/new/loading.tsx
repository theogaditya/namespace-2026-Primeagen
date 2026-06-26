export default function NewSurveyLoading() {
  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f3faff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar skeleton (matches site layout) */}
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
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-[#e6f6ff] rounded-lg" />
            <div className="h-4 w-96 bg-[#e6f6ff] rounded" />
          </div>
          <div className="h-10 w-36 bg-[#e6f6ff] rounded-xl" />
        </header>

        {/* Stepper skeleton */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="relative flex justify-between items-center">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-[#cfe6f2] -z-10" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-20">
                <div className="w-10 h-10 rounded-full bg-[#e6f6ff] animate-pulse" />
                <div className="h-3 w-24 bg-[#e6f6ff] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-12 gap-8">
          {/* Left: large form skeleton */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-xl animate-pulse" style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}>
              <div className="h-8 w-48 bg-[#e6f6ff] rounded-lg mb-6" />
              <div className="space-y-4">
                <div className="h-12 w-full bg-[#f3faff] rounded-xl" />
                <div className="h-12 w-full bg-[#f3faff] rounded-xl" />
                <div className="h-32 w-full bg-[#f3faff] rounded-xl" />
              </div>
            </div>

            <div className="bg-[#e6f6ff] p-8 rounded-xl animate-pulse" style={{ border: "2px dashed rgba(193,199,208,0.5)" }}>
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-40 bg-[#e6f6ff] rounded-lg" />
                <div className="h-10 w-36 bg-white rounded-xl" />
              </div>
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[#cfe6f2] mb-4" />
                <div className="h-4 w-80 bg-[#e6f6ff] rounded" />
              </div>
            </div>

            {/* Placeholder for question cards */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-8 rounded-xl animate-pulse" style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}>
                <div className="h-6 w-36 bg-[#e6f6ff] rounded mb-4" />
                <div className="h-4 w-full bg-[#f3faff] rounded mb-3" />
                <div className="h-3 w-3/4 bg-[#f3faff] rounded" />
              </div>
            ))}
          </div>

          {/* Right: sidebar skeleton */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-[#cfe6f2] p-8 rounded-xl animate-pulse">
              <div className="h-6 w-40 bg-[#e6f6ff] rounded-lg mb-4" />
              <div className="h-3 w-56 bg-[#f3faff] rounded mb-2" />
              <div className="h-3 w-48 bg-[#f3faff] rounded" />
            </div>

            <div className="p-8 rounded-xl text-white animate-pulse" style={{ background: "#003358" }}>
              <div className="h-6 w-40 bg-[#094357]/20 rounded mb-4 opacity-40" />
              <div className="h-3 w-full bg-[#094357]/20 rounded mb-2 opacity-40" />
              <div className="h-3 w-3/4 bg-[#094357]/20 rounded opacity-40" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
