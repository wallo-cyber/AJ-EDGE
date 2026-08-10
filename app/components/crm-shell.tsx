'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

const navItems = [
  { href: '/agent-center', label: 'مركز الوكلاء', icon: '⚙' },
  { href: '/daily', label: 'مركز العمل اليومي', icon: '✓' },
  { href: '/search', label: 'البحث الشامل', icon: '⌕' },
  { href: '/exports', label: 'تصدير البيانات', icon: '↓' },
  { href: '/discovery', label: 'اكتشاف الشركات', icon: '⌕' },
  { href: '/enrichment', label: 'استكمال البيانات', icon: '+' },
  { href: '/ready-outreach', label: 'جاهز للتواصل', icon: '→' },
  { href: '/dashboard', label: 'لوحة القيادة', icon: '◈' },
  { href: '/companies', label: 'الشركات', icon: '◉' },
  { href: '/contacts', label: 'جهات الاتصال', icon: '◎' },
  { href: '/agents', label: 'الوكلاء', icon: '◖' },
  { href: '/outreach', label: 'التواصل', icon: '◌' },
  { href: '/follow-ups', label: 'المتابعات', icon: '◍' },
  { href: '/meetings', label: 'الاجتماعات', icon: '◎' },
  { href: '/opportunities', label: 'الفرص', icon: '◐' },
  { href: '/quotations', label: 'العروض', icon: '◑' },
  { href: '/contracts', label: 'العقود', icon: '◒' },
  { href: '/reports', label: 'التقارير', icon: '◓' },
  { href: '/settings', label: 'الإعدادات', icon: '◔' },
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fffdf9_0%,_#f7ebd2_45%,_#f4e6c8_100%)] text-[#2f2417]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
        <aside className="w-full rounded-[28px] border border-[#e8d9b7] bg-white/80 p-4 shadow-[0_20px_45px_rgba(92,70,26,0.08)] backdrop-blur lg:w-72">
          <div className="mb-6 rounded-[20px] bg-[#f8efe0] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#8a6f35]">
              AJ-EDGE CRM
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[#2f2417]">المنصة التجارية</h1>
            <p className="mt-1 text-sm text-[#6f6044]">المنطقة الشرقية - متصل بـ Supabase</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-[#2f2417] text-[#fef8ec] shadow-md'
                      : 'text-[#4f3f26] hover:bg-[#f8efe0] hover:text-[#2f2417]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-base">{item.icon}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[20px] border border-[#ead9b3] bg-[#fdf9f1] p-4 text-sm text-[#6f6044]">
            <p className="font-semibold text-[#2f2417]">التركيز الإقليمي</p>
            <ul className="mt-2 space-y-1">
              <li>الدمام</li>
              <li>الخبر</li>
              <li>الظهران</li>
              <li>الجبيل</li>
            </ul>
          </div>
          <button onClick={signOut} className="mt-3 w-full rounded-2xl border border-[#d8c08d] bg-white px-3 py-2.5 text-sm font-semibold text-[#6f6044]">تسجيل الخروج</button>
        </aside>

        <main className="flex-1 rounded-[30px] border border-[#e8d9b7] bg-white/85 p-4 shadow-[0_20px_45px_rgba(92,70,26,0.08)] backdrop-blur sm:p-6">
          <div className="mb-6 flex flex-col gap-4 rounded-[24px] bg-[#fdf8ee] p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#9a7b2f]">إدارة علاقات الأعمال</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#2f2417]">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6f6044]">{description}</p>
            </div>
            {action}
          </div>

          <div className="space-y-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
