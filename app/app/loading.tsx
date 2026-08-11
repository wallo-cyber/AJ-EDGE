export default function Loading() {
  return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f6f0e4] p-4 text-[#6f6044]">
    <div className="crm-card w-full max-w-md p-6 text-center" role="status" aria-live="polite">
      <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#d7bc7c]" />
      <p className="mt-4 font-semibold">جارٍ تجهيز مساحة العمل…</p>
      <p className="mt-1 text-xs">يتم تحميل بيانات Supabase المحفوظة بأمان.</p>
    </div>
  </main>;
}
