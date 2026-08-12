'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { companyLifecycle, decisionMakerTarget, qualificationGate } from '../lib/intelligence/bd-core';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const segmentSpecs: Record<string, { title: string; match: string[] }> = {
  developers: { title: 'المطورون العقاريون', match: ['real estate developer', 'developer', 'real_estate_developer'] },
  factories: { title: 'المصانع', match: ['factory', 'plant', 'manufacturer'] },
  industrial: { title: 'الشركات الصناعية', match: ['industrial company', 'industrial', 'industry'] },
  contractors: { title: 'المقاولون الرئيسيون', match: ['main contractor', 'contractor', 'epc', 'main_contractor'] },
  'main-contractors': { title: 'المقاولون الرئيسيون', match: ['main contractor', 'contractor', 'epc', 'main_contractor'] },
  consultants: { title: 'الاستشاريون الهندسيون', match: ['engineering consultant', 'consultant', 'designer'] },
  owners: { title: 'ملاك المشاريع', match: ['project owner', 'owner', 'asset owner'] },
  partners: { title: 'الموردون والشركاء', match: ['supplier', 'partner', 'vendor', 'distributor'] },
};

const text = (value: unknown) => String(value ?? '').trim();

type SegmentRow = {
  company: SimpleRow;
  contacts: SimpleRow[];
  signals: SimpleRow[];
  opportunities: SimpleRow[];
  drafts: SimpleRow[];
  events: SimpleRow[];
  followups: SimpleRow[];
  qualification: ReturnType<typeof qualificationGate>;
  lifecycle: ReturnType<typeof companyLifecycle>;
  target: ReturnType<typeof decisionMakerTarget>;
};

export function CompanySegmentWorkspace({ segment }: { segment: string }) {
  const spec = segmentSpecs[segment] ?? segmentSpecs.developers;
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'priority'>('score');
  const [campaignId, setCampaignId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [companies, contacts, signals, opportunities, messages, events, followups, campaigns, campaignCompanies] = await Promise.all([
        simpleCrud.list('companies'),
        simpleCrud.list('contacts'),
        simpleCrud.list('opportunity_signals'),
        simpleCrud.list('opportunities'),
        simpleCrud.list('messages'),
        simpleCrud.list('communication_events'),
        simpleCrud.list('follow_ups'),
        simpleCrud.list('outreach_campaigns'),
        simpleCrud.list('campaign_companies'),
      ]);
      setData({ companies, contacts, signals, opportunities, messages, events, followups, campaigns, campaignCompanies });
      if (!campaignId && campaigns[0]) setCampaignId(campaigns[0].id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر تحميل بيانات القطاع.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<SegmentRow[]>(() => {
    const companies = data.companies ?? [];
    const all = companies.filter((company) => {
      const haystack = `${text(company.company_type)} ${text(company.business_type)} ${text(company.target_segment)} ${Array.isArray(company.company_types) ? company.company_types.join(' ') : ''}`.toLowerCase();
      const matchesSegment = spec.match.some((item) => haystack.includes(item));
      const matchesPriority = !priority || text(company.priority) === priority;
      const matchesQuery = `${text(company.company_name)} ${text(company.sector)} ${text(company.city)}`.toLowerCase().includes(query.toLowerCase());
      return matchesSegment && matchesPriority && matchesQuery && !company.archived_at;
    });

    return all
      .map((company) => {
        const contacts = (data.contacts ?? []).filter((row) => row.company_id === company.id && !row.archived_at);
        const signals = (data.signals ?? []).filter((row) => row.company_id === company.id && !row.archived_at);
        const opportunities = (data.opportunities ?? []).filter((row) => row.company_id === company.id && !row.archived_at);
        const drafts = (data.messages ?? []).filter((row) => row.company_id === company.id && !row.archived_at);
        const events = (data.events ?? []).filter((row) => row.company_id === company.id && !row.archived_at);
        const followups = (data.followups ?? []).filter((row) => row.company_id === company.id && !row.archived_at);
        return {
          company,
          contacts,
          signals,
          opportunities,
          drafts,
          events,
          followups,
          qualification: qualificationGate(company, contacts, signals),
          lifecycle: companyLifecycle({ company, contacts, signals, opportunities, drafts, events, followups }),
          target: decisionMakerTarget(company),
        };
      })
      .sort((a, b) => {
        if (sortBy === 'name') return text(a.company.company_name).localeCompare(text(b.company.company_name));
        if (sortBy === 'priority') return text(a.company.priority).localeCompare(text(b.company.priority)) || b.qualification.score - a.qualification.score;
        return b.qualification.score - a.qualification.score;
      });
  }, [data, priority, query, sortBy, spec.match]);

  const campaigns = data.campaigns ?? [];
  const campaignMembership = data.campaignCompanies ?? [];

  const kpis = {
    total: rows.length,
    priorityA: rows.filter((row) => text(row.company.priority) === 'A').length,
    readyOutreach: rows.filter((row) => row.contacts.some((contact) => contact.decision_maker === true && text(contact.verification_status).toUpperCase() === 'VERIFIED' && Boolean(contact.source || contact.source_url))).length,
    activeOpportunities: rows.filter((row) => row.opportunities.some((item) => !['WON', 'LOST'].includes(text(item.stage).toUpperCase()))).length,
  };

  const addToCampaign = async (row: SegmentRow) => {
    if (!campaignId) {
      setNotice('اختر حملة أولاً.');
      return;
    }

    const exists = campaignMembership.some((item) => text(item.campaign_id) === campaignId && text(item.company_id) === row.company.id);
    if (exists) {
      setNotice('الشركة موجودة بالفعل داخل الحملة المحددة.');
      return;
    }

    try {
      setBusyId(row.company.id);
      await simpleCrud.create('campaign_companies', {
        campaign_id: campaignId,
        company_id: row.company.id,
        status: 'DRAFT',
      });
      setNotice(`تمت إضافة ${text(row.company.company_name)} إلى الحملة.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر إضافة الشركة إلى الحملة.');
    } finally {
      setBusyId('');
    }
  };

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      setNotice('اكتب اسم الحملة أولاً.');
      return;
    }
    try {
      const created = await simpleCrud.create('outreach_campaigns', {
        name: campaignName.trim(),
        status: 'DRAFT',
        outreach_type: 'Segment Outreach',
        sequence: [{ channel: 'EMAIL', approval_required: true }],
      });
      setCampaignName('');
      setCampaignId(created.id);
      setNotice('تم إنشاء حملة جديدة وربطها بهذا القطاع.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر إنشاء الحملة.');
    }
  };

  return (
    <CRMPage title={spec.title} description="قطاع تشغيلي من قاعدة Companies الموحدة مع KPIs وفلاتر وبحث وربط مباشر بـ Company 360 والحملات.">
      {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="crm-kpi p-4"><p className="text-xs text-[#75664d]">إجمالي الشركات</p><strong className="mt-1 block text-2xl">{kpis.total}</strong></article>
        <article className="crm-kpi p-4"><p className="text-xs text-[#75664d]">أولوية A</p><strong className="mt-1 block text-2xl">{kpis.priorityA}</strong></article>
        <article className="crm-kpi p-4"><p className="text-xs text-[#75664d]">جاهز للتواصل</p><strong className="mt-1 block text-2xl">{kpis.readyOutreach}</strong></article>
        <article className="crm-kpi p-4"><p className="text-xs text-[#75664d]">فرص نشطة</p><strong className="mt-1 block text-2xl">{kpis.activeOpportunities}</strong></article>
      </section>

      <section className="crm-card grid gap-2 p-3 md:grid-cols-4">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالشركة أو القطاع أو المدينة" className="rounded-xl border p-2" />
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-xl border p-2">
          <option value="">كل الأولويات</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'score' | 'name' | 'priority')} className="rounded-xl border p-2">
          <option value="score">ترتيب حسب التأهيل</option>
          <option value="priority">ترتيب حسب الأولوية</option>
          <option value="name">ترتيب أبجدي</option>
        </select>
        <Link href="/companies" className="btn-ghost">الانتقال إلى كل الشركات</Link>
      </section>

      <section className="crm-card grid gap-2 p-3 lg:grid-cols-[1fr_1fr_auto]">
        <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="rounded-xl border p-2">
          <option value="">اختر حملة للإضافة</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {text(campaign.name) || 'Campaign'}
            </option>
          ))}
        </select>
        <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="اسم حملة جديدة" className="rounded-xl border p-2" />
        <button onClick={() => void createCampaign()} className="btn-secondary">إنشاء حملة</button>
      </section>

      {loading ? (
        <div className="crm-empty animate-pulse">جارٍ تحميل شركات القطاع...</div>
      ) : (
        <section className="grid gap-3">
          {rows.map((row) => {
            const verifiedDecisionMaker = row.contacts.find((item) => item.decision_maker === true && text(item.verification_status).toUpperCase() === 'VERIFIED' && Boolean(item.source || item.source_url));
            const hasOpportunity = row.opportunities.some((item) => !['WON', 'LOST'].includes(text(item.stage).toUpperCase()));
            return (
              <article key={row.company.id} className="crm-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/companies/${row.company.id}`} className="font-bold">{text(row.company.company_name)}</Link>
                    <p className="mt-1 text-xs text-[#75664d]">{text(row.company.sector) || '—'} · {text(row.company.city) || '—'} · أولوية {text(row.company.priority) || 'C'}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="crm-chip status-neutral">{row.lifecycle.stage}</span>
                    <span className="crm-chip status-warning">{row.qualification.score}/100</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <p><b>صانع القرار:</b> {text(verifiedDecisionMaker?.full_name || verifiedDecisionMaker?.name) || 'غير موثق بعد'}</p>
                  <p><b>الدور المستهدف:</b> {row.target.role}</p>
                  <p><b>الفرص:</b> {hasOpportunity ? 'نشطة' : 'لا توجد فرصة نشطة'}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/companies/${row.company.id}`} className="btn-primary">Company 360</Link>
                  <Link href={`/outreach?tab=strategy&company_id=${row.company.id}`} className="btn-ghost">Prepare Outreach</Link>
                  <button disabled={!campaignId || busyId === row.company.id} onClick={() => void addToCampaign(row)} className="btn-secondary disabled:opacity-40">{busyId === row.company.id ? 'جارٍ الإضافة...' : 'Add to Campaign'}</button>
                </div>
              </article>
            );
          })}
          {!rows.length ? <div className="crm-empty">لا توجد شركات مطابقة لهذا القطاع وفق الفلاتر الحالية.</div> : null}
        </section>
      )}
    </CRMPage>
  );
}
