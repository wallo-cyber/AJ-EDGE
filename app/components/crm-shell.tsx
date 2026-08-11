'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

const navItems = [
  { href: '/daily', label: 'مركز العمل اليومي', icon: '✓' },
  { href: '/dashboard', label: 'لوحة القيادة', icon: '◈' },
  { href: '/companies', label: 'الشركات', icon: '◉' },
  { href: '/contacts', label: 'جهات الاتصال', icon: '◎' },
  { href: '/discovery', label: 'اكتشاف الشركات', icon: '⌕' },
  { href: '/enrichment', label: 'استكمال البيانات', icon: '+' },
  { href: '/vendor-registration', label: 'تسجيل الموردين', icon: '◇' },
  { href: '/ready-outreach', label: 'جاهز للتواصل', icon: '→' },
  { href: '/follow-ups', label: 'المتابعات', icon: '◍' },
  { href: '/meetings', label: 'الاجتماعات', icon: '◎' },
  { href: '/opportunities', label: 'الفرص', icon: '◐' },
  { href: '/quotations', label: 'العروض', icon: '◑' },
  { href: '/contracts', label: 'العقود', icon: '◒' },
  { href: '/agents', label: 'الوكلاء والمعرّفون', icon: '◖' },
  { href: '/agent-center', label: 'مركز الوكلاء', icon: '⚙' },
  { href: '/manual-research', label: 'البحث اليدوي', icon: '⌕' },
  { href: '/search', label: 'البحث الشامل', icon: '⌕' },
  { href: '/reports', label: 'التقارير', icon: '◓' },
  { href: '/exports', label: 'تصدير البيانات', icon: '↓' },
  { href: '/settings', label: 'الإعدادات', icon: '◔' },
  { href: '/system-status', label: 'حالة النظام', icon: '●' },
];

type CRMPageProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

export function CRMPage({ title, description, action, children }: CRMPageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login');
      else setIsAuthenticated(true);
      setCheckingAuth(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      if (!session?.user) router.replace('/login');
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  if (checkingAuth || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7ebd2] text-[#6f6044]">جارٍ التحقق من الجلسة...</div>;
  }

  const signOut = async () => {
    await getSupabaseClient().auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen text-[#2f2417]">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#e7d8b8] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div><strong>ALGAEU</strong><span className="mr-2 text-xs text-[#8a6f35]">BDP</span></div>
        <button aria-label="فتح القائمة" onClick={() => setNavOpen((value) => !value)} className="rounded-xl border border-[#dac79f] bg-white px-3 py-2 text-lg">{navOpen ? '×' : '☰'}</button>
      </div>
      <div className="mx-auto flex max-w-[1600px] gap-5 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
        {navOpen && <button aria-label="إغلاق القائمة" onClick={() => setNavOpen(false)} className="fixed inset-0 z-40 bg-[#24190d]/35 lg:hidden" />}
        <aside className={`${navOpen ? 'translate-x-0' : 'translate-x-full'} ${navCollapsed ? 'lg:w-[84px]' : 'lg:w-64'} fixed inset-y-0 right-0 z-50 w-[286px] overflow-y-auto border-l border-[#e8d9b7] bg-[#fffdf9] p-4 shadow-2xl transition-[width,transform] lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:translate-x-0 lg:rounded-[26px] lg:border lg:shadow-[0_18px_50px_rgba(70,48,18,.08)]`}>
          <button type="button" onClick={() => setNavCollapsed((value) => !value)} className="mb-3 hidden w-full rounded-xl border border-[#e6d6b4] bg-white px-3 py-2 text-xs font-semibold text-[#6f6044] lg:block" aria-label={navCollapsed ? 'توسيع القائمة' : 'طي القائمة'}>{navCollapsed ? '☰' : 'طي القائمة'}</button>
          <div className={`mb-5 rounded-[20px] bg-gradient-to-br from-[#332619] to-[#4a3620] p-4 text-[#fff8e8] shadow-lg ${navCollapsed ? 'lg:px-2 lg:text-center' : ''}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8a6f35]">
              ALGAEU
            </p>
            <h1 className={`mt-2 text-lg font-bold ${navCollapsed ? 'lg:hidden' : ''}`}>Business Development Platform</h1>
            <p className={`mt-1 flex items-center gap-2 text-xs text-[#d9c8a2] ${navCollapsed ? 'lg:justify-center' : ''}`}><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className={navCollapsed ? 'lg:hidden' : ''}>متصل بـ Supabase</span></p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={navCollapsed ? item.label : undefined}
                  onClick={() => setNavOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-[#2f2417] text-[#fef8ec] shadow-md'
                      : 'text-[#59482f] hover:bg-[#f5ecdb] hover:text-[#2f2417]'
                  }`}
                >
                  <span className={navCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  <span className="text-base">{item.icon}</span>
                </Link>
              );
            })}
          </nav>

          <div className={`mt-5 rounded-[18px] border border-[#ead9b3] bg-[#fdf9f1] p-3 text-xs text-[#6f6044] ${navCollapsed ? 'lg:hidden' : ''}`}><strong className="text-[#2f2417]">النطاق التشغيلي</strong><p className="mt-1">المنطقة الشرقية · تطوير أعمال المقاولات</p></div>
          <button onClick={signOut} title="تسجيل الخروج" className="mt-3 w-full rounded-xl border border-[#d8c08d] bg-white px-3 py-2.5 text-sm font-semibold text-[#6f6044] hover:bg-red-50 hover:text-red-700">{navCollapsed ? <span className="hidden lg:inline">↪</span> : null}<span className={navCollapsed ? 'lg:hidden' : ''}>تسجيل الخروج</span></button>
        </aside>

        <main className="min-w-0 flex-1 rounded-[26px] border border-[#e8d9b7] bg-[#fffdf9]/90 p-4 shadow-[0_18px_55px_rgba(70,48,18,.07)] backdrop-blur sm:p-6 lg:p-7">
          <div className="mb-6 flex flex-col gap-4 border-b border-[#eadfc9] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-wide text-[#9a7b2f]">ALGAEU · Business Development Platform</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#2f2417] sm:text-3xl">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#75664d]">{description}</p>
            </div>
            {action}
          </div>

          <div className="space-y-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
