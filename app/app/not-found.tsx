import Link from 'next/link';

export default function NotFound() {
  return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7ebd2] p-6 text-[#2f2417]"><div className="max-w-lg rounded-[28px] border border-[#ead9b3] bg-white p-8 text-center shadow-xl"><p className="text-xs font-bold tracking-[.3em] text-[#9a7b2f]">نوفافيرك</p><h1 className="mt-3 text-2xl font-bold">الصفحة غير موجودة</h1><p className="mt-3 text-sm text-[#75664d]">تحقق من الرابط أو عد إلى مركز العمل اليومي.</p><Link href="/daily" className="mt-5 inline-block rounded-xl bg-[#2f2417] px-5 py-3 text-sm font-bold text-white">مركز العمل اليومي</Link></div></div>;
}
