export default function EditSurveyLoading() {
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

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-56 bg-[#e6f6ff] rounded-lg mb-2" />
            <div className="h-4 w-72 bg-[#e6f6ff] rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-[#e6f6ff] rounded-xl" />
            <div className="h-10 w-28 bg-[#e6f6ff] rounded-xl" />
            <div className="h-10 w-24 bg-[#e6f6ff] rounded-xl" />
          </div>
        </header>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Basic Info skeleton */}
          <section className="bg-white p-10 rounded-xl animate-pulse" style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}>
            <div className="h-6 w-48 bg-[#e6f6ff] rounded mb-6" />
            <div className="space-y-5">
              <div className="h-12 w-full bg-[#f3faff] rounded-xl" />
              <div className="grid grid-cols-2 gap-6">
                <div className="h-12 w-full bg-[#f3faff] rounded-xl" />
                <div className="h-12 w-full bg-[#f3faff] rounded-xl" />
              </div>
              <div className="h-24 w-full bg-[#f3faff] rounded-xl" />
            </div>
          </section>

          {/* Questions skeleton */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-6 w-40 bg-[#e6f6ff] rounded-lg animate-pulse" />
              <div className="h-10 w-36 bg-[#e6f6ff] rounded-xl animate-pulse" />
            </div>

            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl animate-pulse" style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-4 w-32 bg-[#e6f6ff] rounded" />
                  <div className="h-4 w-12 bg-[#e6f6ff] rounded" />
                </div>
                <div className="space-y-3">
                  <div className="h-12 w-full bg-[#f3faff] rounded-xl" />
                  <div className="flex gap-4 items-center">
                    <div className="h-10 w-48 bg-[#f3faff] rounded-xl" />
                    <div className="h-6 w-24 bg-[#f3faff] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
