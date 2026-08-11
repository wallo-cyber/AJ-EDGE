'use client';

import Link from 'next/link';
import { buildCompanyIntelligence, buildRelationshipMemory, conversationStrategy, type NextActionCode } from '../lib/intelligence/v6';
import type { IntelligenceRow } from '../lib/intelligence/core';
import { FeedbackControls } from './feedback-controls';

const safe = (value: unknown) => String(value ?? '').trim();
const segmentLabels: Record<string, string> = { INDUSTRIAL_FACTORY:'مصنع صناعي',REAL_ESTATE_DEVELOPER:'مطور عقاري',MAIN_CONTRACTOR:'مقاول رئيسي',INDUSTRIAL_CONTRACTOR:'مقاول صناعي',ENGINEERING_CONSULTANT:'استشاري هندسي',MANUFACTURER:'مصنّع',SUPPLIER:'مورد',FACILITY_OPERATOR:'مشغل مرافق',OTHER:'يحتاج تصنيفاً يدوياً' };
const actionLabels: Record<NextActionCode, string> = { VERIFY_COMPANY:'تحقق من الشركة',COMPLETE_RESEARCH:'استكمل البحث',FIND_DECISION_MAKER:'حدد صانع القرار',VERIFY_CONTACT:'تحقق من جهة الاتصال',CHECK_VENDOR_REGISTRATION:'راجع تسجيل الموردين',PREPARE_OUTREACH_STRATEGY:'جهز استراتيجية التواصل',PREPARE_DRAFT:'جهز مسودة',REVIEW_DRAFT:'راجع المسودة',RECORD_COMMUNICATION:'سجل التواصل الفعلي',FOLLOW_UP:'نفذ المتابعة',REPLY_REQUIRED:'عالج الرد الوارد',SCHEDULE_MEETING:'جهز الاجتماع',CREATE_OPPORTUNITY:'راجع إنشاء فرصة',REVIEW_OPPORTUNITY:'راجع الفرصة',RECONNECT_LATER:'حدد إعادة التواصل',CLOSE_NOT_RELEVANT:'أغلق كغير مناسب' };

function actionHref(code: NextActionCode, companyId: string) {
  if (['VERIFY_COMPANY','COMPLETE_RESEARCH','FIND_DECISION_MAKER','VERIFY_CONTACT'].includes(code)) return `/research?tab=manual&company_id=${companyId}`;
  if (['PREPARE_OUTREACH_STRATEGY','PREPARE_DRAFT','REVIEW_DRAFT','RECORD_COMMUNICATION','REPLY_REQUIRED'].includes(code)) return `/outreach?tab=${code === 'PREPARE_OUTREACH_STRATEGY' ? 'strategy' : code === 'REVIEW_DRAFT' ? 'review' : code === 'RECORD_COMMUNICATION' ? 'ready' : code === 'REPLY_REQUIRED' ? 'history' : 'drafts'}&company_id=${companyId}`;
  if (code === 'FOLLOW_UP' || code === 'RECONNECT_LATER') return `/follow-ups?company_id=${companyId}`;
  if (code === 'CHECK_VENDOR_REGISTRATION') return `/vendor-registration?company_id=${companyId}`;
  return `/pipeline?company_id=${companyId}`;
}

export function OutreachIntelligenceCard({ company, contacts=[], drafts=[], events=[], followups=[], opportunities=[] }: { company:IntelligenceRow; contacts?:IntelligenceRow[]; drafts?:IntelligenceRow[]; events?:IntelligenceRow[]; followups?:IntelligenceRow[]; opportunities?:IntelligenceRow[] }) {
  const intelligence = buildCompanyIntelligence({ company, contacts, drafts, events, followups, opportunities });
  const memory = buildRelationshipMemory({ company, contacts, drafts, events, opportunities });
  const strategy = conversationStrategy({ company, contacts, drafts, events, opportunities });
  const next = intelligence.nextBestAction;
  return <section className="crm-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#9a7b2f]">INTELLIGENCE CORE V6</p><h3 className="mt-1 text-lg font-bold">قرار الاستهداف والعلاقة والخطوة التالية</h3></div><div className="flex flex-wrap gap-2"><span className="crm-chip status-neutral">{intelligence.relationshipStage}</span><span className={`crm-chip ${next.priority === 'CRITICAL' ? 'status-danger' : next.priority === 'HIGH' ? 'status-warning' : 'status-success'}`}>{next.priority}</span></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Score label="Lead Score" score={intelligence.leadScore.score} reason={intelligence.leadScore.reason}/><Score label="Opportunity Signal" score={intelligence.opportunitySignal.score} reason={intelligence.opportunitySignal.reason}/><Score label="Business Fit" score={intelligence.businessFit.score} reason={intelligence.businessFit.reason}/><Score label="Reachability" score={intelligence.reachability.score} reason={intelligence.reachability.reason}/><Score label="Outreach Readiness" score={intelligence.outreachReadiness.score} reason={intelligence.outreachReadiness.reason}/></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="الفئة المستهدفة" value={segmentLabels[intelligence.targetSegment]}/><div className="rounded-xl border border-[#eadfc9] bg-white p-3"><p className="text-xs text-[#75664d]">زاوية التعاون</p><p className="mt-1 text-sm font-semibold leading-6">{strategy.businessAngle}</p><div className="mt-2"><FeedbackControls targetType="BUSINESS_ANGLE" targetId={safe(company.id)} companyId={safe(company.id)}/></div></div><Info label="الدور المستهدف" value={strategy.targetRole}/><Info label="مسار الموردين" value={intelligence.vendorRegistrationStatus}/></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-[#eadfc9] bg-[#fdf9f1] p-4"><p className="text-xs font-bold text-[#9a7b2f]">ذاكرة العلاقة</p><p className="mt-2 text-sm leading-6">{memory.relationshipSummary}</p><p className="mt-2 text-xs text-[#75664d]">آخر رد: <span className="data-ltr">{memory.lastReplyAt || '—'}</span> · آخر تواصل صادر: <span className="data-ltr">{memory.lastOutboundAt || '—'}</span></p></div><div className="rounded-xl border-r-4 border-r-[#b78d38] bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-800">الإجراء الأساسي الواحد</p><strong className="mt-1 block">{actionLabels[next.code]}</strong><p className="mt-2 text-sm">{next.reason}</p>{next.blockingRequirement && <p className="mt-2 text-xs text-[#75664d]">المتطلب المانع: {next.blockingRequirement}</p>}</div></div>
    {intelligence.signals.length > 0 && <div className="mt-4"><p className="text-xs font-bold text-[#9a7b2f]">الإشارات الداخلية الموثقة</p><div className="mt-2 flex flex-wrap gap-2">{intelligence.signals.map(item => <span key={`${item.type}-${item.detectedAt}`} title={item.evidence.map(entry => entry.value).join(' · ')} className={`crm-chip ${item.strength === 'CRITICAL' ? 'status-danger' : item.strength === 'HIGH' ? 'status-warning' : 'status-neutral'}`}>{item.type} · {item.confidence}%</span>)}</div></div>}
    <div className="mt-4 flex flex-wrap items-center gap-2"><Link href={actionHref(next.code, safe(company.id))} className="btn-primary">{actionLabels[next.code]}</Link><Link href={`/outreach?tab=strategy&company_id=${safe(company.id)}`} className="btn-secondary">استراتيجية المحادثة</Link><FeedbackControls targetType="NEXT_BEST_ACTION" targetId={safe(company.id)} companyId={safe(company.id)}/></div>
  </section>;
}

function Score({ label, score, reason }: { label:string; score:number; reason:string }) { return <div className="rounded-xl bg-[#f8f1e4] p-3" title={reason}><div className="flex items-center justify-between gap-2"><p className="text-xs text-[#75664d]">{label}</p><strong>{score}/100</strong></div><div className="crm-progress mt-2"><span style={{ width:`${score}%` }}/></div></div>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-xl border border-[#eadfc9] bg-white p-3"><p className="text-xs text-[#75664d]">{label}</p><p className="mt-1 text-sm font-semibold leading-6">{value || 'غير محدد'}</p></div>; }
