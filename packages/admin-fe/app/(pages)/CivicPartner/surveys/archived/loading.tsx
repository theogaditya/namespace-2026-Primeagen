export default function ArchivedSurveysLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-pulse p-8">
      <div className="h-8 w-64 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-gray-50 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
