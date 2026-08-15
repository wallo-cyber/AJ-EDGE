'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

const primary = [
  ['/', 'واجهة الموقع', '⌂'],
  ['/companies', 'السوق والشركات', '◉'],
  ['/marketing', 'فريق التسويق', '▣'],
  ['/radar', 'رادار الفرص', '◆'],
  ['/daily', 'مركز الاستقطاب', '◎'],
  ['/outreach', 'التواصل', '◈'],
  ['/email-center', 'الإيميلات', '✉'],
] as const;
const secondaryGroups = [
  { label: 'الاستقطاب والمشاريع', links: [['/market-intelligence', 'ذكاء السوق السعودي'], ['/intelligence', 'ذكاء المشاريع'], ['/projects', 'المشاريع المستهدفة'], ['/bid-board', 'لوحة العطاءات'], ['/watchlists', 'قوائم المراقبة']] },
  { label: 'الإدارة والنتائج', links: [['/contracts', 'العقود'], ['/quotations', 'عروض الأسعار'], ['/readiness', 'جاهزية السوق'], ['/reports/revenue', 'مسار الإيرادات'], ['/reports', 'التقارير'], ['/agent-center', 'الوكلاء'], ['/search', 'البحث الشامل'], ['/exports', 'تصدير البيانات'], ['/settings', 'الإعدادات'], ['/system-status', 'حالة النظام']] },
] as const;
type Props = { title: string; description: string; action?: ReactNode; children: ReactNode };

export function CRMPage({ title, description, action, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'original' | 'neon' | 'teal'>('neon');

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('algaeu-nav-collapsed') === '1');
    const storedTheme = window.localStorage.getItem('algaeu-theme-v3');
    const savedTheme = storedTheme === 'original' || storedTheme === 'teal' ? storedTheme : 'neon';
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    const supabase = getSupabaseClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login'); else setAuthenticated(true);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
      if (!session?.user) router.replace('/login');
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  const toggleCollapsed = () => setCollapsed((value) => {
    window.localStorage.setItem('algaeu-nav-collapsed', value ? '0' : '1');
    return !value;
  });
  const toggleTheme = () => {
    const next = theme === 'neon' ? 'teal' : theme === 'teal' ? 'original' : 'neon';
    setTheme(next);
    window.localStorage.setItem('algaeu-theme-v3', next);
    document.documentElement.dataset.theme = next;
  };
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeSecondaryGroup = secondaryGroups.find((group) => group.links.some(([href]) => active(href)));
  const currentNavLabel = primary.find(([href]) => active(href))?.[1]
    ?? activeSecondaryGroup?.links.find(([href]) => active(href))?.[1]
    ?? title;
  if (checking || !authenticated) return <div className="grid min-h-screen place-items-center bg-[#f6f0e4] text-[#6f6044]">جارٍ التحقق من الجلسة…</div>;

  return <div className="min-h-screen text-[#2f2417]">
    <header className="algaeu-mobile-header sticky top-0 z-40 flex items-center justify-between border-b border-[#e7d8b8] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur lg:hidden">
      <div><strong>ALGAEU</strong><span className="mr-2 text-xs text-[#8a6f35]">تطوير الأعمال</span></div>
      <div className="flex items-center gap-2"><button className="theme-toggle" onClick={toggleTheme} aria-label="تغيير الواجهة">{theme === 'neon' ? '✦ Teal' : theme === 'teal' ? '☀ الأصلية' : '✦ Neon'}</button>
      <button className="btn-ghost" aria-label="فتح القائمة" onClick={() => setOpen(!open)}>{open ? 'إغلاق' : 'القائمة'}</button></div>
    </header>
    <div className="mx-auto flex max-w-[1680px] gap-4 px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
      {open && <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-[#24190d]/35 lg:hidden" />}
      <aside className={`algaeu-sidebar ${open ? 'translate-x-0' : 'translate-x-full'} ${collapsed ? 'lg:w-[78px]' : 'lg:w-60'} fixed inset-y-0 right-0 z-50 w-[286px] overflow-y-auto border-l border-[#e8d9b7] bg-[#fffdf9] p-3 shadow-2xl transition-[width,transform] lg:sticky lg:top-5 lg:z-auto lg:h-[calc(100vh-2.5rem)] lg:translate-x-0 lg:rounded-3xl lg:border` }>
        <button onClick={toggleCollapsed} className="btn-ghost mb-3 hidden w-full lg:block" title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}>{collapsed ? '←' : 'طي القائمة'}</button>
        <Link href="/" onClick={() => setOpen(false)} className="algaeu-brand mb-4 block rounded-2xl bg-[#2f2417] p-4 text-[#fff8e8]" aria-label="العودة إلى واجهة الموقع">
          <p className="text-[11px] font-bold tracking-[.3em] text-[#d5b66f]">ALGAEU</p>
          {!collapsed && <><h1 className="mt-1 font-bold">منصة تطوير الأعمال</h1><p className="mt-2 text-xs text-[#d9c8a2]"><span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />متصل ببيانات العمل</p></>}
        </Link>
        <nav aria-label="التنقل الرئيسي" className="algaeu-primary-nav space-y-1">
          {primary.map(([href, label, icon]) => <Link key={href} href={href} title={collapsed ? label : undefined} aria-current={active(href) ? 'page' : undefined} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold ${active(href) ? 'nav-active' : 'text-[#59482f] hover:bg-[#f5ecdb]'}`}><span className={collapsed ? 'lg:hidden' : ''}>{label}</span><span aria-hidden>{icon}</span></Link>)}
        </nav>
        {!collapsed && <div className="mt-4 space-y-2 border-t border-[var(--nav-border)] pt-3">{secondaryGroups.map((group, index) => {const groupActive=group.links.some(([href])=>active(href));return <details key={group.label} open={groupActive || index === 0} className={`rounded-xl border px-2 py-1 ${groupActive ? 'nav-group-active' : 'border-[var(--nav-border)]'}`}><summary className={`cursor-pointer px-1 py-2 text-[11px] font-bold ${groupActive ? 'text-[var(--nav-accent)]' : 'text-[var(--nav-secondary)]'}`}>{group.label}</summary>{group.links.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2 text-xs ${active(href) ? 'nav-active' : 'text-[#6f6044] hover:bg-[var(--nav-hover)]'}`}>{label}</Link>)}</details>})}</div>}
        <div className="mt-4 hidden lg:block"><button className="theme-toggle w-full" onClick={toggleTheme}>{theme === 'neon' ? '✦ الواجهة Teal' : theme === 'teal' ? '☀ الواجهة الأصلية' : '✦ الواجهة Neon'}</button></div>
        <button onClick={async () => { await getSupabaseClient().auth.signOut(); router.replace('/login'); }} className="btn-ghost mt-4 w-full">{collapsed ? '↪' : 'تسجيل الخروج'}</button>
      </aside>
      <main className="algaeu-main min-w-0 flex-1 rounded-3xl border border-[#e8d9b7] bg-[#fffdf9]/92 p-4 shadow-[0_16px_45px_rgba(70,48,18,.06)] sm:p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-[var(--nav-border)] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-[var(--nav-secondary)]">ALGAEU · تطوير الأعمال</p><span className="nav-current-chip">القسم الحالي: {currentNavLabel}</span></div><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#75664d]">{description}</p></div>{action}</div>
        <div className="space-y-4">{children}</div>
      </main>
    </div>
  </div>;
}
