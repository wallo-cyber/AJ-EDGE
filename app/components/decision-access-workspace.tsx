'use client';

import Link from 'next/link';
import { accountFitScoreV2, buildBuyingCommittee, decisionAccessNextAction, pursuitScore, roleSearchQuery } from '../lib/intelligence/revenue-phase1';
import type { IntelligenceRow } from '../lib/intelligence/core';

const safe=(value:unknown)=>String(value??'').trim();

export function DecisionAccessWorkspace({company,contacts,signals=[],events=[],meetings=[],opportunities=[]}:{company:IntelligenceRow;contacts:IntelligenceRow[];signals?:IntelligenceRow[];events?:IntelligenceRow[];meetings?:IntelligenceRow[];opportunities?:IntelligenceRow[]}){
  const committee=buildBuyingCommittee(company,contacts);
  const fit=accountFitScoreV2(company,contacts);
  const pursuit=pursuitScore(company,contacts,{signals,events,meetings,opportunities});
  const next=decisionAccessNextAction(company,contacts);
  const companyName=safe(company.company_name||company.companyName);

  return <div className="space-y-4">
    <section className="crm-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#9a742b]">DECISION ACCESS</p>
          <h3 className="mt-1 text-xl font-bold">خريطة لجنة الشراء والوصول الفعلي</h3>
          <p className="mt-1 max-w-3xl text-sm text-[#75664d]">البريد أو الهاتف العام لا يُحسب وصولًا. النقاط تأتي من أشخاص حقيقيين، تحقق بالمصدر، وقناة مباشرة.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#f8f1e4] p-3"><span className="text-xs text-[#75664d]">Access</span><strong className="block text-2xl">{committee.accessScore}</strong></div>
          <div className="rounded-xl bg-[#f8f1e4] p-3"><span className="text-xs text-[#75664d]">Fit</span><strong className="block text-2xl">{fit.score}</strong></div>
          <div className="rounded-xl bg-[#f8f1e4] p-3"><span className="text-xs text-[#75664d]">Pursuit</span><strong className="block text-2xl">{pursuit.score}</strong></div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[#ead9b3] bg-[#fdf8ee] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-[#75664d]">الإجراء الأعلى أثرًا</p><strong>{next.label}</strong><p className="mt-1 text-sm text-[#75664d]">{next.reason}</p></div><Link href={`/contacts?company_id=${safe(company.id)}`} className="btn-primary">إضافة / توثيق شخص</Link></div>
      </div>
    </section>

    <section className="crm-card overflow-hidden">
      <header className="border-b bg-[#faf5eb] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="section-title">Buying Committee</h3><p className="mt-1 text-xs text-[#75664d]">{committee.contactableRoles} من {committee.requiredRoles} أدوار لديها وصول مباشر موثق.</p></div><span className={`crm-chip ${committee.accessScore>=70?'bg-emerald-50 text-emerald-700':committee.accessScore>=40?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{committee.accessScore>=70?'جاهز لتواصل متعدد':'الوصول ناقص'}</span></div></header>
      <div className="divide-y divide-[#eee3cd]">{committee.roles.map(item=>{
        const contact=item.bestContact;
        const query=roleSearchQuery(companyName,item);
        return <article key={item.role} className="grid gap-3 p-4 lg:grid-cols-[1.2fr_.8fr_.8fr_auto] lg:items-center">
          <div><strong>{item.label}</strong><p className="mt-1 text-xs text-[#75664d]">وزن تجاري {item.weight}%</p></div>
          <div><p className="text-xs text-[#75664d]">أفضل شخص</p><p className="font-semibold">{safe(contact?.full_name||contact?.name)||'غير موجود'}</p><p className="text-xs text-[#75664d]">{safe(contact?.position||contact?.department)||'—'}</p></div>
          <div><span className={`crm-chip ${item.status==='CONTACTABLE'?'bg-emerald-50 text-emerald-700':item.status==='VERIFIED_NO_CHANNEL'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{item.status==='CONTACTABLE'?'موثق + قناة مباشرة':item.status==='VERIFIED_NO_CHANNEL'?'موثق بلا قناة مباشرة':item.status==='UNVERIFIED'?'شخص غير موثق':'مفقود'}</span></div>
          <div className="flex flex-wrap gap-2"><a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(query)}`} className="btn-secondary">ابحث الآن</a><a target="_blank" rel="noreferrer" href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName+' '+item.label)}`} className="btn-ghost">LinkedIn</a></div>
        </article>
      })}</div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="crm-card p-4"><h3 className="section-title">Account Fit V2 · {fit.grade}</h3><div className="mt-4 space-y-2 text-sm">{Object.entries(fit.breakdown).map(([key,value])=><div key={key} className="flex justify-between border-b border-[#eee3cd] pb-2"><span>{key}</span><b>{value}</b></div>)}</div></div>
      <div className="crm-card p-4"><h3 className="section-title">Timing / Intent · {pursuit.intent.level}</h3><div className="mt-4 space-y-2 text-sm">{Object.entries(pursuit.intent.breakdown).map(([key,value])=><div key={key} className="flex justify-between border-b border-[#eee3cd] pb-2"><span>{key}</span><b>{value}</b></div>)}</div><p className="mt-4 rounded-xl bg-[#f8f1e4] p-3 text-sm"><b>Pursuit:</b> {pursuit.priority} · {pursuit.score}/100</p></div>
    </section>
  </div>;
}
