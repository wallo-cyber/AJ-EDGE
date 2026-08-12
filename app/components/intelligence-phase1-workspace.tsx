'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { businessAngle, generateMessage } from '../lib/intelligence/core';
import { buildCompanyIntelligence, evaluateMessageQuality } from '../lib/intelligence/v6';
import { recommendAttachment } from '../lib/intelligence/attachment-recommendation';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const text = (value: unknown) => String(value ?? '').trim();

const assetTypes = ['Company Profile', 'Capability Statement', 'Services', 'Licenses', 'Certifications', 'Projects/References', 'Photos', 'Vendor Registration Material', 'Sector Material', 'Other'];
const campaignTypes = ['Company Introduction', 'Vendor Registration', 'Subcontracting', 'Industrial Expansion', 'Real Estate Development', 'Main Contractor Introduction', 'Follow-up', 'Project-Specific Outreach'];

type EditableAsset = {
  id?: string;
  name: string;
  asset_type: string;
  asset_url: string;
  notes: string;
  language: string;
  active: boolean;
  sector: string;
};

export function SalesKitWorkspace() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [active, setActive] = useState('');
  const [edit, setEdit] = useState<EditableAsset | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const data = await simpleCrud.list('sales_kit_assets');
    setRows(data);
  };

  useEffect(() => {
    void load().catch((error) => setNotice(error instanceof Error ? error.message : 'تعذر تحميل Sales Kit.'));
  }, []);

  const filtered = useMemo(
    () => rows.filter((row) => {
      const matchesQuery = `${text(row.name)} ${text(row.asset_url)} ${text(row.notes)} ${text(row.sector)}`.toLowerCase().includes(query.toLowerCase());
      const matchesType = !type || text(row.asset_type) === type;
      const matchesActive = !active || String(row.active) === active;
      return matchesQuery && matchesType && matchesActive;
    }),
    [active, query, rows, type],
  );

  const openNew = () => {
    setEdit({
      name: '',
      asset_type: 'Other',
      asset_url: '',
      notes: '',
      language: 'ARABIC',
      active: true,
      sector: '',
    });
  };

  const save = async () => {
    if (!edit || !edit.name.trim()) {
      setNotice('اسم الأصل مطلوب.');
      return;
    }

    const payload = {
      name: edit.name.trim(),
      asset_type: edit.asset_type,
      asset_url: text(edit.asset_url),
      notes: text(edit.notes),
      language: text(edit.language) || 'ARABIC',
      active: Boolean(edit.active),
      sector: text(edit.sector),
    };

    try {
      if (edit.id) await simpleCrud.update('sales_kit_assets', edit.id, payload);
      else await simpleCrud.create('sales_kit_assets', payload);
      setEdit(null);
      setNotice('تم حفظ أصل Sales Kit.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر حفظ الأصل.');
    }
  };

  const toggleActive = async (row: SimpleRow) => {
    try {
      await simpleCrud.update('sales_kit_assets', row.id, { active: row.active === false });
      setNotice('تم تحديث حالة الأصل.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر تحديث الحالة.');
    }
  };

  return (
    <CRMPage title="Sales Kit" description="Company Profile, Capability Statement, Services, Licenses, Certifications, References, Photos مع metadata وتفعيل/تعطيل.">
      {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
      <div className="crm-card grid gap-2 p-3 md:grid-cols-4">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث" className="rounded-xl border p-2" />
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border p-2">
          <option value="">كل الأنواع</option>
          {assetTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={active} onChange={(event) => setActive(event.target.value)} className="rounded-xl border p-2">
          <option value="">الكل</option>
          <option value="true">نشط</option>
          <option value="false">غير نشط</option>
        </select>
        <button onClick={openNew} className="btn-primary">إضافة أصل</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((row) => (
          <article key={row.id} className="crm-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <b>{text(row.name)}</b>
                <p className="text-sm text-[#75664d]">{text(row.asset_type)} · {text(row.language || 'ARABIC')} · {text(row.sector) || 'كل القطاعات'}</p>
              </div>
              <span className={`crm-chip ${row.active === false ? 'status-neutral' : 'status-success'}`}>{row.active === false ? 'Inactive' : 'Active'}</span>
            </div>
            <p className="mt-2 break-all text-xs">{text(row.asset_url) || 'لا يوجد رابط'}</p>
            <p className="mt-2 text-xs">{text(row.notes) || '—'}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEdit({ id: row.id, name: text(row.name), asset_type: text(row.asset_type) || 'Other', asset_url: text(row.asset_url), notes: text(row.notes), language: text(row.language) || 'ARABIC', active: row.active !== false, sector: text(row.sector) })} className="btn-ghost">تعديل</button>
              <button onClick={() => void toggleActive(row)} className="btn-secondary">{row.active === false ? 'تفعيل' : 'تعطيل'}</button>
            </div>
          </article>
        ))}
        {!filtered.length ? <div className="crm-empty md:col-span-2">لا توجد أصول مطابقة.</div> : null}
      </div>

      {edit ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-3">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5">
            <h3 className="font-bold">{edit.id ? 'تعديل أصل' : 'إضافة أصل جديد'}</h3>
            <div className="mt-3 grid gap-2">
              <input value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} placeholder="الاسم" className="rounded border p-2" />
              <select value={edit.asset_type} onChange={(event) => setEdit({ ...edit, asset_type: event.target.value })} className="rounded border p-2">
                {assetTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
              <input value={edit.asset_url} onChange={(event) => setEdit({ ...edit, asset_url: event.target.value })} placeholder="الرابط" className="rounded border p-2" />
              <input value={edit.sector} onChange={(event) => setEdit({ ...edit, sector: event.target.value })} placeholder="القطاع (اختياري)" className="rounded border p-2" />
              <input value={edit.language} onChange={(event) => setEdit({ ...edit, language: event.target.value })} placeholder="ARABIC / ENGLISH" className="rounded border p-2" />
              <textarea value={edit.notes} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} placeholder="ملاحظات" className="min-h-24 rounded border p-2" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(event) => setEdit({ ...edit, active: event.target.checked })} /> أصل نشط</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="btn-ghost">إلغاء</button>
              <button onClick={() => void save()} className="btn-primary">حفظ</button>
            </div>
          </div>
        </div>
      ) : null}
    </CRMPage>
  );
}

type DraftBuild = {
  target?: SimpleRow;
  body: string;
  subject: string;
  score: number;
  quality: string;
  warning: string;
  attachment?: SimpleRow | null;
};

export function CampaignWorkspace() {
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [signals, setSignals] = useState<SimpleRow[]>([]);
  const [kits, setKits] = useState<SimpleRow[]>([]);
  const [campaigns, setCampaigns] = useState<SimpleRow[]>([]);
  const [members, setMembers] = useState<SimpleRow[]>([]);
  const [drafts, setDrafts] = useState<SimpleRow[]>([]);

  const [selected, setSelected] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [name, setName] = useState('');
  const [campaignType, setCampaignType] = useState(campaignTypes[0]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [companiesRows, contactRows, signalRows, kitRows, campaignRows, memberRows, draftRows] = await Promise.all([
      simpleCrud.list('companies'),
      simpleCrud.list('contacts'),
      simpleCrud.list('opportunity_signals'),
      simpleCrud.list('sales_kit_assets'),
      simpleCrud.list('outreach_campaigns'),
      simpleCrud.list('campaign_companies'),
      simpleCrud.list('messages'),
    ]);
    setCompanies(companiesRows.filter((row) => !row.archived_at));
    setContacts(contactRows.filter((row) => !row.archived_at));
    setSignals(signalRows.filter((row) => !row.archived_at));
    setKits(kitRows.filter((row) => row.active !== false));
    setCampaigns(campaignRows);
    setMembers(memberRows);
    setDrafts(draftRows);
    if (!current && campaignRows[0]) setCurrent(campaignRows[0].id);
  }, [current]);

  useEffect(() => {
    void load().catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'تعذر تحميل الحملات.'));
  }, [load]);

  const visible = useMemo(
    () => companies.filter((row) => `${text(row.company_name)} ${text(row.sector)} ${text(row.city)} ${text(row.target_segment)}`.toLowerCase().includes(query.toLowerCase())),
    [companies, query],
  );
  const currentCampaign = campaigns.find((row) => row.id === current);
  const currentDrafts = drafts.filter((row) => text(row.campaign_id) === current);

  const recommendedAudience = useMemo(() => {
    return companies
      .map((company) => {
        const intelligence = buildCompanyIntelligence({ company, contacts, drafts: drafts.filter((row) => row.company_id === company.id), events: [], opportunities: [], followups: [], meetings: [] });
        const score = intelligence.leadScore.score + intelligence.opportunitySignal.score + (intelligence.nextBestAction.priority === 'CRITICAL' ? 18 : intelligence.nextBestAction.priority === 'HIGH' ? 10 : 0);
        return { company, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [companies, contacts, drafts]);

  function build(company: SimpleRow, existing: string[] = []): DraftBuild {
    const target = contacts.find((row) => text(row.company_id) === company.id && (row.decision_maker === true || text(row.verification_status) === 'VERIFIED')) ?? contacts.find((row) => text(row.company_id) === company.id);
    const signal = signals.find((row) => text(row.company_id) === company.id && ['RELEVANT', 'NEW'].includes(text(row.status).toUpperCase()) && Boolean(row.source_url));
    const angle = businessAngle(company);
    const body = generateMessage({
      companyName: text(company.company_name),
      recipientName: text(target?.full_name || target?.name) || undefined,
      segment: angle.segment,
      angle: signal ? text(signal.title || signal.next_action) : angle.angle,
      role: text(target?.position) || angle.role,
      language: 'ARABIC',
      style: angle.style,
      type: angle.type,
      channel: 'Email',
    });
    const quality = evaluateMessageQuality({
      body,
      companyName: text(company.company_name),
      businessAngle: angle.angle,
      channel: 'EMAIL',
      personalizationLevel: target ? 3 : 2,
      relationshipAware: false,
      evidenceSafe: Boolean(company.website || company.source_url || signal?.source_url),
      existingDrafts: existing,
    });
    const attachment = recommendAttachment(kits, company, text(target?.position || company.recommended_role || angle.role)) as SimpleRow | null;
    return {
      target,
      body,
      subject: `تعريف تعاون محتمل مع ${text(company.company_name)}`,
      score: quality.score,
      quality: quality.status,
      warning: quality.warnings.join(' · '),
      attachment,
    };
  }

  async function generate() {
    if (!name.trim() || !selected.length) {
      setNotice('اختر شركة واحدة على الأقل واكتب اسم الحملة.');
      return;
    }
    setBusy(true);
    try {
      const campaign = await simpleCrud.create('outreach_campaigns', {
        name: name.trim(),
        outreach_type: campaignType,
        status: 'DRAFT',
        sequence: [{ channel: 'EMAIL', approval_required: true }],
      });
      for (const companyId of selected) {
        const company = companies.find((row) => row.id === companyId);
        if (!company) continue;
        const draft = build(company, drafts.filter((row) => row.company_id !== companyId).map((row) => text(row.body)));
        await simpleCrud.create('messages', {
          campaign_id: campaign.id,
          company_id: companyId,
          company_name: text(company.company_name),
          contact_id: draft.target?.id ?? null,
          recipient: text(draft.target?.full_name || draft.target?.name),
          subject: draft.subject,
          body: draft.body,
          channel: 'Email',
          status: 'Draft',
          personalization_score: draft.target ? 75 : 50,
          quality_score: draft.score,
          quality_status: draft.quality,
          quality_issues: draft.warning ? [draft.warning] : [],
          claim_warning: draft.warning,
          recommended_attachment_id: draft.attachment?.id ?? null,
        });

        await simpleCrud.create('campaign_companies', {
          campaign_id: campaign.id,
          company_id: companyId,
          status: 'DRAFT',
        });
      }
      setCurrent(campaign.id);
      setNotice('تم حفظ مسودات مخصصة لكل شركة في Supabase. الإرسال الخارجي معطّل.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر إنشاء المسودات.');
    } finally {
      setBusy(false);
    }
  }

  async function updateDraft(draft: SimpleRow, values: Record<string, unknown>, memberStatus?: string) {
    setBusy(true);
    try {
      await simpleCrud.update('messages', draft.id, values);
      const member = members.find((row) => text(row.campaign_id) === current && text(row.company_id) === text(draft.company_id));
      if (member && memberStatus) await simpleCrud.update('campaign_companies', member.id, { status: memberStatus });
      await load();
      setNotice('تم الحفظ في Supabase.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر الحفظ.');
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(draft: SimpleRow) {
    const company = companies.find((row) => row.id === draft.company_id);
    if (!company) return;
    const replacement = build(company, drafts.filter((row) => row.id !== draft.id).map((row) => text(row.body)));
    await updateDraft(
      draft,
      {
        subject: replacement.subject,
        body: replacement.body,
        status: 'Draft',
        personalization_score: replacement.target ? 75 : 50,
        quality_score: replacement.score,
        quality_status: replacement.quality,
        quality_issues: replacement.warning ? [replacement.warning] : [],
        claim_warning: replacement.warning,
        recommended_attachment_id: replacement.attachment?.id ?? null,
      },
      'DRAFT',
    );
  }

  return (
    <CRMPage title="مركز الحملات" description="شركة أو جمهور -> مسودة مخصصة -> مراجعة وتعديل -> اعتماد يدوي. لا يوجد إرسال خارجي.">
      <div className="crm-card grid gap-2 p-3 md:grid-cols-3">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم الحملة" className="rounded border p-2" />
        <select value={campaignType} onChange={(event) => setCampaignType(event.target.value)} className="rounded border p-2">
          {campaignTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث الشركات أو القطاع أو المدينة" className="rounded border p-2" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_2fr]">
        <section className="crm-card max-h-[34rem] overflow-auto p-3">
          <div className="mb-2 flex items-center justify-between"><b>اختيار الشركات ({selected.length})</b><button onClick={() => setSelected(recommendedAudience.slice(0, 10).map((item) => item.company.id))} className="btn-ghost">اقتراح جمهور AI</button></div>
          {visible.map((company) => (
            <label key={company.id} className="mt-2 flex gap-2 border-b p-2">
              <input type="checkbox" checked={selected.includes(company.id)} onChange={() => setSelected((items) => items.includes(company.id) ? items.filter((id) => id !== company.id) : [...items, company.id])} />
              <span>
                {text(company.company_name)} <small>· {text(company.recommended_role) || 'الدور المستهدف غير موثق'} · Lead {Number(company.lead_score ?? 0)}</small>
              </span>
            </label>
          ))}
        </section>

        <section className="space-y-3">
          <div className="crm-card p-3">
            <button disabled={busy} onClick={() => void generate()} className="btn-primary">Generate personalized drafts ({selected.length})</button>
            <p className="mt-2 text-xs">EXTERNAL SENDING: DISABLED</p>
            {notice ? <p className="mt-2 text-sm text-emerald-700">{notice}</p> : null}
          </div>

          <div className="crm-card p-3">
            <b>الحملات المحفوظة</b>
            <div className="mt-2 flex flex-wrap gap-2">
              {campaigns.map((campaign) => (
                <button key={campaign.id} onClick={() => setCurrent(campaign.id)} className={current === campaign.id ? 'btn-primary' : 'btn-ghost'}>
                  {text(campaign.name) || 'حملة'} · {text(campaign.status) || 'DRAFT'}
                </button>
              ))}
            </div>
          </div>

          {currentCampaign ? (
            <div className="crm-card p-3">
              <h3 className="font-bold">{text(currentCampaign.name)} — مراجعة المسودات</h3>
              <div className="mt-3 space-y-3">
                {currentDrafts.map((draft) => {
                  const company = companies.find((item) => item.id === draft.company_id);
                  const attachment = kits.find((asset) => asset.id === draft.recommended_attachment_id);
                  return (
                    <article key={draft.id} className="rounded-xl border p-3">
                      <p className="text-xs text-[#75664d]">{text(company?.company_name)} · {text(draft.status)}</p>
                      <input value={text(draft.subject)} onChange={(event) => setDrafts((items) => items.map((item) => item.id === draft.id ? { ...item, subject: event.target.value } as SimpleRow : item))} className="mt-2 w-full rounded border p-2" />
                      <textarea value={text(draft.body)} onChange={(event) => setDrafts((items) => items.map((item) => item.id === draft.id ? { ...item, body: event.target.value } as SimpleRow : item))} className="mt-2 min-h-36 w-full rounded border p-2" />
                      <p className="mt-2 text-xs">Attachment: {text(attachment?.name || attachment?.asset_type) || 'غير محدد'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => void updateDraft(draft, { subject: text((drafts.find((item) => item.id === draft.id)?.subject)), body: text((drafts.find((item) => item.id === draft.id)?.body)), status: 'Draft' }, 'DRAFT')} className="btn-ghost">حفظ التعديل</button>
                        <button onClick={() => void updateDraft(draft, { status: 'Approved', approved_at: new Date().toISOString() }, 'APPROVED')} className="btn-secondary">اعتماد</button>
                        <button onClick={() => void updateDraft(draft, { status: 'Rejected', reviewed_at: new Date().toISOString() }, 'REJECTED')} className="btn-ghost">رفض</button>
                        <button onClick={() => void regenerate(draft)} className="btn-primary">إعادة توليد</button>
                      </div>
                    </article>
                  );
                })}
                {!currentDrafts.length ? <div className="crm-empty">لا توجد مسودات لهذه الحملة.</div> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </CRMPage>
  );
}

export function RadarWorkspace() {
  const [rows, setRows] = useState<SimpleRow[]>([]);
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [minScore, setMinScore] = useState('0');
  const [evidenceOnly, setEvidenceOnly] = useState(true);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const [signalRows, companyRows] = await Promise.all([simpleCrud.list('opportunity_signals'), simpleCrud.list('companies')]);
    setRows(signalRows.filter((row) => !row.archived_at));
    setCompanies(companyRows);
  };

  useEffect(() => {
    void load().catch((error) => setNotice(error instanceof Error ? error.message : 'تعذر تحميل Opportunity Radar.'));
  }, []);

  const cities = useMemo(() => [...new Set(rows.map((row) => text(row.city)).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(
    () => rows.filter((row) => {
      const rowText = `${text(row.title)} ${text(row.signal_type)} ${text(row.city)} ${text(row.sector)} ${text(companies.find((company) => company.id === row.company_id)?.company_name)}`.toLowerCase();
      const matchesQuery = rowText.includes(query.toLowerCase());
      const matchesStatus = !status || text(row.status).toUpperCase() === status;
      const matchesCity = !city || text(row.city) === city;
      const score = Number(row.opportunity_score ?? 0);
      const matchesScore = score >= Number(minScore || 0);
      const matchesEvidence = !evidenceOnly || Boolean(row.source_url || row.evidence || row.evidence_reference);
      return matchesQuery && matchesStatus && matchesCity && matchesScore && matchesEvidence;
    }),
    [city, companies, evidenceOnly, minScore, query, rows, status],
  );

  const updateStatus = async (row: SimpleRow, next: string) => {
    try {
      await simpleCrud.update('opportunity_signals', row.id, { status: next, reviewed_at: new Date().toISOString() });
      setRows((items) => items.map((item) => item.id === row.id ? { ...item, status: next } as SimpleRow : item));
      setNotice('تم تحديث حالة الإشارة.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر تحديث الحالة.');
    }
  };

  return (
    <CRMPage title="Opportunity Radar" description="Evidence-first signals only. External search remains paused.">
      {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
      <div className="crm-card grid gap-2 p-3 md:grid-cols-5">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث" className="rounded border p-2" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border p-2">
          <option value="">كل الحالات</option>
          {['NEW', 'REVIEWED', 'RELEVANT', 'NOT_RELEVANT', 'EXPIRED'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={city} onChange={(event) => setCity(event.target.value)} className="rounded border p-2">
          <option value="">كل المدن</option>
          {cities.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={minScore} onChange={(event) => setMinScore(event.target.value)} type="number" min="0" max="100" className="rounded border p-2" placeholder="Min score" />
        <label className="flex items-center gap-2 rounded border bg-white px-3 py-2 text-sm"><input type="checkbox" checked={evidenceOnly} onChange={(event) => setEvidenceOnly(event.target.checked)} />Evidence only</label>
      </div>

      {!filtered.length ? (
        <div className="crm-empty">لا توجد إشارات متاحة حالياً - البحث الخارجي متوقف مؤقتاً.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((row) => {
            const company = companies.find((item) => item.id === row.company_id);
            const evidence = text(row.source_url || row.evidence_reference || row.evidence);
            return (
              <article key={row.id} className="crm-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <b>{text(row.title) || text(row.signal_type) || 'Signal'}</b>
                    <p className="mt-1 text-xs text-[#75664d]">{text(company?.company_name) || 'بدون شركة'} · {text(row.city) || '—'} · {text(row.sector) || '—'}</p>
                  </div>
                  <div className="flex gap-2"><span className="crm-chip status-warning">{Number(row.opportunity_score ?? 0)}/100</span><span className="crm-chip status-neutral">{text(row.status) || 'NEW'}</span></div>
                </div>
                <p className="mt-2 text-sm">{text(row.description || row.next_action || 'لا يوجد وصف إضافي')}</p>
                <p className="mt-2 text-xs">Confidence: {text(row.confidence) || '0'}%</p>
                <p className="mt-1 text-xs text-[#75664d]">Evidence: {evidence || 'غير متاح'}</p>
                {row.source_url ? <a href={text(row.source_url)} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">فتح المصدر</a> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/companies/${text(row.company_id)}`} className="btn-ghost">Company 360</Link>
                  <button onClick={() => void updateStatus(row, 'RELEVANT')} className="btn-secondary">مهم</button>
                  <button onClick={() => void updateStatus(row, 'REVIEWED')} className="btn-ghost">مراجَع</button>
                  <button onClick={() => void updateStatus(row, 'NOT_RELEVANT')} className="btn-ghost">غير مهم</button>
                  <button onClick={() => void updateStatus(row, 'EXPIRED')} className="btn-ghost">منتهي</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CRMPage>
  );
}
