export default function ReportsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#465FFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400 tracking-wider uppercase">Loading Reports...</p>
      </div>
    </div>
  )
}
