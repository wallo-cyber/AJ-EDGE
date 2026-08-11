'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f6f0e4] p-4 text-[#2f2417]">
    <section className="crm-card max-w-lg p-6 text-center">
      <p className="text-xs font-bold tracking-[.25em] text-[#9a7b2f]">ALGAEU</p>
      <h1 className="mt-3 text-xl font-bold">تعذر تحميل هذه الشاشة</h1>
      <p className="mt-2 text-sm text-[#75664d]">لم تتغير بياناتك. أعد المحاولة، وإن استمرت المشكلة راجع حالة النظام.</p>
      <div className="mt-5 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">إعادة المحاولة</button>
        <a href="/system-status" className="btn-ghost">حالة النظام</a>
      </div>
    </section>
  </main>;
}
