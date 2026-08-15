'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

const primary = [
  ['/daily', 'اليوم', '✓'], ['/companies', 'الشركات', '◉'], ['/contacts', 'جهات الاتصال', '◎'],
  ['/research', 'البحث والاستكمال', '⌕'], ['/outreach', 'التواصل', '↗'], ['/pipeline', 'الفرص', '◇'],
  ['/agent-center', 'الوكلاء', '⚙'], ['/reports', 'التقارير', '◫'],
] as const;
const secondary = [
  ['/search', 'البحث الشامل'], ['/exports', 'تصدير البيانات'], ['/settings', 'الإعدادات'], ['/system-status', 'حالة النظام'],
] as const;

type Props = { title: string; description: string; action?: ReactNode; children: ReactNode };
type Theme = 'original' | 'modern' | 'modern-2';

const themeLabels: Record<Theme, string> = {
  original: 'الأصلية',
  modern: 'مودرن',
  'modern-2': 'مودرن 2',
};

export function CRMPage({ title, description, action, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('original');

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('algaeu-nav-collapsed') === '1');
    const savedTheme = window.localStorage.getItem('algaeu-theme');
    const selectedTheme: Theme = savedTheme === 'modern' || savedTheme === 'modern-2' ? savedTheme : 'original';
    setTheme(selectedTheme);
    document.documentElement.dataset.theme = selectedTheme;
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
  const selectTheme = (value: Theme) => {
    setTheme(value);
    window.localStorage.setItem('algaeu-theme', value);
    document.documentElement.dataset.theme = value;
  };
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  if (checking || !authenticated) return <div className="grid min-h-screen place-items-center bg-[#f6f0e4] text-[#6f6044]">جارٍ التحقق من الجلسة…</div>;

  return <div className="algaeu-shell min-h-screen text-[#2f2417]">
    <header className="algaeu-mobile-header sticky top-0 z-40 flex items-center justify-between border-b border-[#e7d8b8] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur lg:hidden">
      <div><strong>ALGAEU</strong><span className="mr-2 text-xs text-[#8a6f35]">تطوير الأعمال</span></div>
      <div className="flex items-center gap-2"><label className="sr-only" htmlFor="mobile-theme">الواجهة</label><select id="mobile-theme" className="theme-select" value={theme} onChange={(event) => selectTheme(event.target.value as Theme)}>{(Object.keys(themeLabels) as Theme[]).map(value => <option key={value} value={value}>{themeLabels[value]}</option>)}</select><button className="btn-ghost" aria-label="فتح القائمة" onClick={() => setOpen(!open)}>{open ? 'إغلاق' : 'القائمة'}</button></div>
    </header>
    <div className="mx-auto flex max-w-[1680px] gap-4 px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
      {open && <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-[#24190d]/35 lg:hidden" />}
      <aside className={`algaeu-sidebar ${open ? 'translate-x-0' : 'translate-x-full'} ${collapsed ? 'lg:w-[78px]' : 'lg:w-60'} fixed inset-y-0 right-0 z-50 w-[286px] overflow-y-auto border-l border-[#e8d9b7] bg-[#fffdf9] p-3 shadow-2xl transition-[width,transform] lg:sticky lg:top-5 lg:z-auto lg:h-[calc(100vh-2.5rem)] lg:translate-x-0 lg:rounded-3xl lg:border` }>
        <button onClick={toggleCollapsed} className="btn-ghost mb-3 hidden w-full lg:block" title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}>{collapsed ? '←' : 'طي القائمة'}</button>
        <div className="algaeu-brand mb-4 rounded-2xl bg-[#2f2417] p-4 text-[#fff8e8]">
          <p className="text-[11px] font-bold tracking-[.3em] text-[#d5b66f]">ALGAEU</p>
          {!collapsed && <><h1 className="mt-1 font-bold">منصة تطوير الأعمال</h1><p className="mt-2 text-xs text-[#d9c8a2]"><span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />متصل ببيانات العمل</p></>}
        </div>
        <nav aria-label="التنقل الرئيسي" className="space-y-1">
          {primary.map(([href, label, icon]) => <Link key={href} href={href} title={collapsed ? label : undefined} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold ${active(href) ? 'bg-[#2f2417] text-white shadow' : 'text-[#59482f] hover:bg-[#f5ecdb]'}`}><span className={collapsed ? 'lg:hidden' : ''}>{label}</span><span aria-hidden>{icon}</span></Link>)}
        </nav>
        {!collapsed && <div className="mt-4 border-t border-[#eadfc9] pt-3"><p className="mb-1 px-3 text-[10px] font-bold text-[#9a7b2f]">أدوات مساندة</p>{secondary.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`block rounded-xl px-3 py-2 text-xs ${active(href) ? 'bg-[#f0e3ca] font-bold' : 'text-[#6f6044] hover:bg-[#f8f1e4]'}`}>{label}</Link>)}</div>}
        {!collapsed && <label className="mt-4 block text-xs font-bold"><span className="mb-1 block">الواجهة</span><select className="theme-select w-full" value={theme} onChange={(event) => selectTheme(event.target.value as Theme)}>{(Object.keys(themeLabels) as Theme[]).map(value => <option key={value} value={value}>{themeLabels[value]}</option>)}</select></label>}
        <button onClick={async () => { await getSupabaseClient().auth.signOut(); router.replace('/login'); }} className="btn-ghost mt-4 w-full">{collapsed ? '↪' : 'تسجيل الخروج'}</button>
      </aside>
      <main className="algaeu-main min-w-0 flex-1 rounded-3xl border border-[#e8d9b7] bg-[#fffdf9]/92 p-4 shadow-[0_16px_45px_rgba(70,48,18,.06)] sm:p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-[#eadfc9] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold text-[#9a7b2f]">ALGAEU · تطوير الأعمال</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#75664d]">{description}</p></div>{action}</div>
        <div className="space-y-4">{children}</div>
      </main>
    </div>
  </div>;
}
