import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fffdf9_0%,_#f7ebd2_45%,_#f4e6c8_100%)] px-4 py-6 text-right text-[#2f2417] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[36px] border border-[#e8d9b7] bg-white/80 p-6 shadow-[0_25px_60px_rgba(92,70,26,0.09)] backdrop-blur md:p-8 lg:p-10">
        <section className="rounded-[28px] bg-[#fdf8ee] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#9a7b2f]">ALGAEU</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#2f2417] sm:text-4xl">
            نظام إدارة علاقات الأعمال للمقاولات العامة في المنطقة الشرقية
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#6f6044] sm:text-lg">
            واجهة عربية بتصميم فاخر باللون البيج والذهبي، موجهة للشركات الصناعية والمقاولين الرئيسيين في الدمام والخبر والظهران والجبيل ورأس تنورة والقطيف وبقيق والخفجي والنيريه.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-[#2f2417] px-5 py-3 text-sm font-semibold text-[#fef8ec] transition hover:bg-[#47361f]"
            >
              الدخول إلى لوحة القيادة
            </Link>
            <Link
              href="/companies"
              className="rounded-full border border-[#d8c08d] bg-white px-5 py-3 text-sm font-semibold text-[#6f6044] transition hover:bg-[#f8efe0]"
            >
              عرض الشركات المستهدفة
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-[#e8d9b7] bg-[#fffdf8] p-5">
            <h2 className="text-lg font-semibold text-[#2f2417]">المجالات المستهدفة</h2>
            <p className="mt-2 text-sm leading-7 text-[#6f6044]">مصانع صناعية، شركات تصنيع، مقاولون رئيسيون، مطورو عقارات، استشاريون هندسيون.</p>
          </div>
          <div className="rounded-[24px] border border-[#e8d9b7] bg-[#f8efe0] p-5">
            <h2 className="text-lg font-semibold text-[#2f2417]">المنطقة</h2>
            <p className="mt-2 text-sm leading-7 text-[#6f6044]">الدمام، الخبر، الظهران، الجبيل، رأس تنورة، القطيف، بقيق، الخفجي، النيريه.</p>
          </div>
          <div className="rounded-[24px] border border-[#e8d9b7] bg-[#fdf8ee] p-5">
            <h2 className="text-lg font-semibold text-[#2f2417]">المرحلة الحالية</h2>
            <p className="mt-2 text-sm leading-7 text-[#6f6044]">بنية تطبيق نظيفة ومهيأة للتكامل مع Supabase بدون بيانات تجريبية.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
