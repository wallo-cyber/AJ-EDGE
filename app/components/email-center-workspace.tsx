'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { conversationStrategy, evaluateMessageQuality, generateProfessionalMessage } from '../lib/intelligence/v6';
import { exclusionReason, nurtureDecision } from '../lib/intelligence/smart-nurture';
import { recommendAttachment } from '../lib/intelligence/attachment-recommendation';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const text = (value: unknown) => String(value ?? '').trim();

type Tab = 'composer' | 'campaigns' | 'review' | 'nurture' | 'history' | 'attachments';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'composer', label: 'Single Composer' },
  { id: 'campaigns', label: 'Campaign Drafts' },
  { id: 'review', label: 'Review/Approve' },
  { id: 'nurture', label: 'Smart Nurture' },
  { id: 'history', label: 'Communication History' },
  { id: 'attachments', label: 'Sales Kit' },
];

export function EmailCenterWorkspace() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [tab, setTab] = useState<Tab>('composer');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [campaignSelection, setCampaignSelection] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const names = [
        'companies',
        'contacts',
        'messages',
        'communication_events',
        'opportunities',
        'outreach_campaigns',
        'campaign_companies',
        'sales_kit_assets',
        'nurture_suggestions',
      ];
      const rows = await Promise.all(names.map(async (name) => [name, await simpleCrud.list(name)] as const));
      const loaded = Object.fromEntries(rows);
      setData(loaded);
      if (!companyId && loaded.companies?.[0]) setCompanyId(loaded.companies[0].id);
      if (!selectedCampaign && loaded.outreach_campaigns?.[0]) setSelectedCampaign(loaded.outreach_campaigns[0].id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر تحميل مركز التواصل.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const companies = data.companies ?? [];
  const contacts = data.contacts ?? [];
  const messages = data.messages ?? [];
  const events = data.communication_events ?? [];
  const opportunities = data.opportunities ?? [];
  const campaigns = data.outreach_campaigns ?? [];
  const campaignCompanies = data.campaign_companies ?? [];
  const assets = (data.sales_kit_assets ?? []).filter((item) => item.active !== false);

  const selectedCompany = companies.find((item) => item.id === companyId);
  const companyContacts = contacts.filter((item) => item.company_id === companyId && !item.archived_at);
  const selectedContact = companyContacts.find((item) => item.id === contactId) ?? companyContacts[0];

  const recommendedAttachment = selectedCompany
    ? recommendAttachment(assets, selectedCompany, text(selectedContact?.position || selectedCompany.recommended_role || ''))
    : null;

  const draftQuality = selectedCompany
    ? evaluateMessageQuality({
        body,
        companyName: text(selectedCompany.company_name),
        businessAngle: text(selectedCompany.business_angle || selectedCompany.contracting_angle || ''),
        channel: 'EMAIL',
        personalizationLevel: selectedContact ? 3 : 2,
        relationshipAware: true,
        evidenceSafe: !/مشروع قائم|current project|awarded project/i.test(body),
        existingDrafts: messages.map((item) => text(item.body)),
      })
    : null;

  const resetComposer = () => {
    setDraftId('');
    setSubject('');
    setBody('');
  };

  const generateForCompany = (company: SimpleRow, contact?: SimpleRow) => {
    const strategy = conversationStrategy({
      company,
      contacts,
      drafts: messages,
      events,
      opportunities,
      channel: 'EMAIL',
      language: text(company.recommended_language).toUpperCase() === 'ENGLISH' ? 'ENGLISH' : 'ARABIC',
    });

    return generateProfessionalMessage({
      strategy,
      companyName: text(company.company_name),
      recipientName: text(contact?.full_name || contact?.name),
      verifiedRecipient: Boolean(contact && text(contact.verification_status).toUpperCase() === 'VERIFIED'),
      evidence: contact
        ? [{ label: 'Contact source', value: text(contact.full_name || contact.name), source: text(contact.source_url || contact.source) }]
        : [],
    });
  };

  const regenerateComposer = () => {
    if (!selectedCompany) {
      setNotice('اختر شركة أولاً.');
      return;
    }
    const generated = generateForCompany(selectedCompany, selectedContact);
    setSubject(`تواصل مهني مع ${text(selectedCompany.company_name)}`);
    setBody(generated.body);
  };

  const saveComposerDraft = async () => {
    if (!selectedCompany || !subject.trim() || !body.trim()) {
      setNotice('الرجاء تحديد الشركة وكتابة الموضوع والرسالة.');
      return;
    }

    const payload = {
      company_id: selectedCompany.id,
      company_name: text(selectedCompany.company_name),
      contact_id: selectedContact?.id ?? null,
      recipient: text(selectedContact?.full_name || selectedContact?.name),
      subject: subject.trim(),
      body: body.trim(),
      channel: 'Email',
      status: 'Draft',
      recommended_attachment_id: recommendedAttachment?.id ?? null,
      draft_classification: selectedContact ? 'PERSONALIZED' : 'PREPARATION',
      quality_score: draftQuality?.score ?? 0,
      quality_status: draftQuality?.status ?? 'WEAK',
      quality_issues: draftQuality?.warnings ?? [],
      duplicate_similarity: draftQuality?.duplicateSimilarity ?? 0,
    };

    try {
      if (draftId) {
        await simpleCrud.update('messages', draftId, payload);
        setNotice('تم تحديث المسودة بنجاح.');
      } else {
        const created = await simpleCrud.create('messages', payload);
        setDraftId(created.id);
        setNotice('تم حفظ المسودة للمراجعة. لا يوجد إرسال خارجي.');
      }
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر حفظ المسودة.');
    }
  };

  const reviewRows = messages.filter((item) => !item.archived_at).filter((item) => ['Draft', 'Approved', 'Ready for Manual Send'].includes(text(item.status)));
  const historyRows = events.filter((item) => !item.archived_at);

  const approveDraft = async (row: SimpleRow) => {
    const company = companies.find((item) => item.id === row.company_id);
    if (!company) {
      setNotice('تعذر العثور على الشركة المرتبطة بهذه المسودة.');
      return;
    }

    const quality = evaluateMessageQuality({
      body: text(row.body),
      companyName: text(company.company_name),
      businessAngle: text(company.business_angle || company.contracting_angle || ''),
      channel: 'EMAIL',
      personalizationLevel: row.contact_id ? 3 : 2,
      relationshipAware: true,
      evidenceSafe: !/مشروع قائم|current project|awarded project/i.test(text(row.body)),
      existingDrafts: messages.filter((item) => item.id !== row.id).map((item) => text(item.body)),
    });

    if (quality.score < 65) {
      setNotice(`جودة المسودة ${quality.score}/100 أقل من الحد الأدنى للاعتماد.`);
      return;
    }

    try {
      await simpleCrud.update('messages', row.id, {
        status: 'Approved',
        approved_at: new Date().toISOString(),
        quality_score: quality.score,
        quality_status: quality.status,
        quality_issues: quality.warnings,
        duplicate_similarity: quality.duplicateSimilarity,
      });
      setNotice('تم اعتماد المسودة للمراجعة البشرية فقط.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر اعتماد المسودة.');
    }
  };

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      setNotice('اكتب اسم الحملة.');
      return;
    }
    try {
      const created = await simpleCrud.create('outreach_campaigns', {
        name: campaignName.trim(),
        outreach_type: 'Email Campaign',
        status: 'DRAFT',
        sequence: [{ channel: 'EMAIL', approval_required: true }],
      });
      setCampaignName('');
      setSelectedCampaign(created.id);
      setNotice('تم إنشاء الحملة.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر إنشاء الحملة.');
    }
  };

  const generateCampaignDrafts = async () => {
    if (!selectedCampaign || !campaignSelection.length) {
      setNotice('اختر حملة وشركة واحدة على الأقل.');
      return;
    }

    try {
      for (const companyValue of campaignSelection) {
        const company = companies.find((item) => item.id === companyValue);
        if (!company) continue;

        const dm = contacts.find((item) => item.company_id === company.id && item.decision_maker === true && text(item.verification_status).toUpperCase() === 'VERIFIED');
        const generated = generateForCompany(company, dm);
        const attachment = recommendAttachment(assets, company, text(dm?.position || company.recommended_role || ''));
        const quality = evaluateMessageQuality({
          body: generated.body,
          companyName: text(company.company_name),
          businessAngle: text(company.business_angle || company.contracting_angle || ''),
          channel: 'EMAIL',
          personalizationLevel: dm ? 3 : 2,
          relationshipAware: true,
          evidenceSafe: true,
          existingDrafts: messages.map((item) => text(item.body)),
        });

        await simpleCrud.create('messages', {
          campaign_id: selectedCampaign,
          company_id: company.id,
          company_name: text(company.company_name),
          contact_id: dm?.id ?? null,
          recipient: text(dm?.full_name || dm?.name),
          subject: `تعريف تعاون مع ${text(company.company_name)}`,
          body: generated.body,
          channel: 'Email',
          status: 'Draft',
          draft_classification: dm ? 'PERSONALIZED' : 'PREPARATION',
          recommended_attachment_id: attachment?.id ?? null,
          quality_score: quality.score,
          quality_status: quality.status,
          quality_issues: quality.warnings,
        });

        const memberExists = campaignCompanies.some((item) => text(item.campaign_id) === selectedCampaign && text(item.company_id) === company.id);
        if (!memberExists) {
          await simpleCrud.create('campaign_companies', {
            campaign_id: selectedCampaign,
            company_id: company.id,
            status: 'DRAFT',
          });
        }
      }

      setNotice('تم إنشاء مسودات مخصصة للحملة.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر إنشاء مسودات الحملة.');
    }
  };

  const nurtureRows = useMemo(() => {
    return companies
      .map((company) => {
        const companyEvents = events.filter((item) => item.company_id === company.id);
        const companyOpps = opportunities.filter((item) => item.company_id === company.id);
        const companyContactsRows = contacts.filter((item) => item.company_id === company.id);
        const decision = nurtureDecision(company, { events: companyEvents, opportunities: companyOpps });
        const excluded = exclusionReason(company, { contacts: companyContactsRows, events: companyEvents, opportunities: companyOpps });
        return { company, decision, excluded };
      })
      .filter((item) => ['CONTACT_NOW', 'FOLLOW_UP', 'NURTURE', 'WAIT', 'RE_ENGAGE', 'DO_NOT_CONTACT'].includes(item.decision.decision));
  }, [companies, contacts, events, opportunities]);

  const saveNurtureSuggestion = async (company: SimpleRow) => {
    const companyEvents = events.filter((item) => item.company_id === company.id);
    const companyOpps = opportunities.filter((item) => item.company_id === company.id);
    const decision = nurtureDecision(company, { events: companyEvents, opportunities: companyOpps });
    const excluded = exclusionReason(company, {
      contacts: contacts.filter((item) => item.company_id === company.id),
      events: companyEvents,
      opportunities: companyOpps,
    });

    try {
      await simpleCrud.create('nurture_suggestions', {
        company_id: company.id,
        decision: decision.decision,
        reason: decision.reason,
        status: excluded ? 'BLOCKED' : 'PENDING',
        recommended_channel: 'EMAIL',
        suggested_send_date: decision.timing === 0 ? new Date().toISOString().slice(0, 10) : null,
      });
      setNotice('تم حفظ توصية nurture للمراجعة.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تعذر حفظ توصية nurture.');
    }
  };

  return (
    <CRMPage title="Email / Communication Center" description="تأليف فردي + حملات مخصصة + Nurture ذكي + مراجعة/اعتماد + سجل تواصل. EXTERNAL SENDING: DISABLED.">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <b>External sending is disabled</b>
        <span>يمكن التحضير، المراجعة، الاعتماد، وحفظ الأحداث فقط. لا يوجد إرسال من النظام.</span>
      </div>

      {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}

      <div className="crm-card flex flex-wrap gap-2 p-3">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'btn-primary' : 'btn-ghost'}>
            {item.label}
          </button>
        ))}
        <Link href="/campaigns" className="btn-secondary">فتح مركز الحملات</Link>
      </div>

      {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل مركز التواصل...</div> : null}

      {!loading && tab === 'composer' ? (
        <section className="crm-card space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setContactId(''); resetComposer(); }} className="rounded-xl border p-2">
              <option value="">اختر الشركة</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{text(company.company_name)}</option>
              ))}
            </select>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} className="rounded-xl border p-2">
              <option value="">المستلم (اختياري)</option>
              {companyContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {text(contact.full_name || contact.name)} · {text(contact.position || contact.department)}
                </option>
              ))}
            </select>
            <button onClick={regenerateComposer} className="btn-secondary">توليد مخصص</button>
          </div>

          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="موضوع الرسالة" className="w-full rounded-xl border p-2" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="نص الرسالة" className="min-h-52 w-full rounded-xl border p-3" />

          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p><b>Attachment:</b> {text(recommendedAttachment?.name || recommendedAttachment?.asset_type) || 'لا يوجد أصل مناسب'}</p>
            <p><b>Quality:</b> {draftQuality ? `${draftQuality.score}/100 (${draftQuality.status})` : '—'}</p>
            <p><b>Workflow:</b> {'Draft -> Review -> Approve -> Manual send only'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => void saveComposerDraft()} className="btn-primary">حفظ Draft</button>
            <button onClick={resetComposer} className="btn-ghost">مسودة جديدة</button>
          </div>
        </section>
      ) : null}

      {!loading && tab === 'campaigns' ? (
        <section className="space-y-3">
          <div className="crm-card grid gap-2 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <select value={selectedCampaign} onChange={(event) => setSelectedCampaign(event.target.value)} className="rounded-xl border p-2">
              <option value="">اختر حملة</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{text(campaign.name) || 'Campaign'}</option>
              ))}
            </select>
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="اسم حملة جديدة" className="rounded-xl border p-2" />
            <button onClick={() => void createCampaign()} className="btn-secondary">إنشاء حملة</button>
            <button onClick={() => void generateCampaignDrafts()} className="btn-primary">Generate Personalized Drafts</button>
          </div>

          <div className="crm-card max-h-[30rem] overflow-auto p-3">
            <h3 className="font-bold">اختيار شركات الحملة</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {companies.filter((item) => !item.archived_at).map((company) => {
                const selected = campaignSelection.includes(company.id);
                return (
                  <label key={company.id} className="flex items-start gap-2 rounded-xl border p-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => setCampaignSelection((items) => (selected ? items.filter((id) => id !== company.id) : [...items, company.id]))}
                    />
                    <span>{text(company.company_name)} · {text(company.sector) || '—'}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {!loading && tab === 'review' ? (
        <section className="grid gap-3">
          {reviewRows.map((row) => (
            <article key={row.id} className="crm-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{text(row.subject) || 'Draft'}</b>
                <span className="crm-chip status-neutral">{text(row.status)}</span>
              </div>
              <p className="mt-1 text-xs text-[#75664d]">{text(row.company_name) || text(companies.find((item) => item.id === row.company_id)?.company_name)}</p>
              <textarea
                value={text(row.body)}
                onChange={(event) => setData((current) => ({
                  ...current,
                  messages: (current.messages ?? []).map((item) => item.id === row.id ? { ...item, body: event.target.value } as SimpleRow : item),
                }))}
                className="mt-3 min-h-36 w-full rounded-xl border p-3"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    await simpleCrud.update('messages', row.id, { body: text((data.messages ?? []).find((item) => item.id === row.id)?.body), status: 'Draft' });
                    setNotice('تم حفظ تعديل المسودة.');
                    await load();
                  }}
                  className="btn-ghost"
                >
                  حفظ التعديل
                </button>
                <button onClick={() => void approveDraft(row)} className="btn-primary">اعتماد للمراجعة البشرية</button>
              </div>
            </article>
          ))}
          {!reviewRows.length ? <div className="crm-empty">لا توجد مسودات للمراجعة حالياً.</div> : null}
        </section>
      ) : null}

      {!loading && tab === 'nurture' ? (
        <section className="grid gap-3">
          {nurtureRows.map((item) => (
            <article key={item.company.id} className="crm-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/companies/${item.company.id}`} className="font-bold">{text(item.company.company_name)}</Link>
                <span className={`crm-chip ${item.decision.decision === 'DO_NOT_CONTACT' ? 'status-danger' : item.decision.decision === 'WAIT' ? 'status-neutral' : 'status-warning'}`}>
                  {item.decision.decision}
                </span>
              </div>
              <p className="mt-2 text-sm">{item.decision.reason}</p>
              <p className="mt-1 text-xs text-[#75664d]">{item.excluded ? `Blocked: ${item.excluded}` : 'Eligible for manual review'}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => void saveNurtureSuggestion(item.company)} className="btn-secondary">حفظ توصية</button>
                <Link href={`/companies/${item.company.id}`} className="btn-ghost">فتح Company 360</Link>
              </div>
            </article>
          ))}
          {!nurtureRows.length ? <div className="crm-empty">لا توجد قرارات nurture متاحة حالياً.</div> : null}
        </section>
      ) : null}

      {!loading && tab === 'history' ? (
        <section className="grid gap-3">
          {historyRows.map((event) => (
            <article key={event.id} className="crm-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{text(event.recipient) || 'Recipient'}</b>
                <span className={`crm-chip ${text(event.direction).toUpperCase() === 'INBOUND' ? 'status-warning' : 'status-success'}`}>
                  {text(event.direction).toUpperCase() || 'EVENT'}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#75664d]">{text(companies.find((item) => item.id === event.company_id)?.company_name)} · {text(event.channel)} · {text(event.occurred_at || event.created_at)}</p>
              <p className="mt-2 text-sm">{text(event.outcome) || text(event.notes) || '—'}</p>
            </article>
          ))}
          {!historyRows.length ? <div className="crm-empty">لا يوجد سجل تواصل فعلي بعد.</div> : null}
        </section>
      ) : null}

      {!loading && tab === 'attachments' ? (
        <section className="grid gap-3 md:grid-cols-2">
          {assets.map((asset) => (
            <article key={asset.id} className="crm-card p-4">
              <div className="flex items-start justify-between gap-2">
                <b>{text(asset.name) || text(asset.asset_type)}</b>
                <span className={`crm-chip ${asset.active === false ? 'status-neutral' : 'status-success'}`}>{asset.active === false ? 'Inactive' : 'Active'}</span>
              </div>
              <p className="mt-2 text-sm">{text(asset.asset_type)} · {text(asset.language || 'ARABIC')}</p>
              <p className="mt-1 text-xs text-[#75664d]">{text(asset.notes) || '—'}</p>
            </article>
          ))}
          {!assets.length ? <div className="crm-empty md:col-span-2">لا توجد أصول Sales Kit نشطة.</div> : null}
        </section>
      ) : null}
    </CRMPage>
  );
}
