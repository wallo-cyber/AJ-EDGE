'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7ebd2] p-6 text-[#2f2417]"><div className="max-w-lg rounded-[28px] border border-[#ead9b3] bg-white p-8 text-center shadow-xl"><p className="text-xs font-bold tracking-[.3em] text-[#9a7b2f]">ALGAEU</p><h1 className="mt-3 text-2xl font-bold">تعذر إكمال العملية</h1><p className="mt-3 text-sm leading-7 text-[#75664d]">تم تسجيل الخطأ تقنياً. لم تُعرض أي تفاصيل حساسة، ويمكن إعادة المحاولة بأمان.</p><button onClick={reset} className="mt-5 rounded-xl bg-[#2f2417] px-5 py-3 text-sm font-bold text-white">إعادة المحاولة</button></div></div>;
}
