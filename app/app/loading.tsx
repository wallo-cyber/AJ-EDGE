export default function Loading() {
  return <main className="min-h-screen bg-[#f6f0e4] p-4 sm:p-8" aria-busy="true" aria-live="polite">
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="h-10 w-52 animate-pulse rounded-xl bg-[#eadfc8]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[#e7d8b8] bg-white/70" />)}</div>
      <div className="h-72 animate-pulse rounded-2xl border border-[#e7d8b8] bg-white/70" />
    </div>
  </main>;
}
