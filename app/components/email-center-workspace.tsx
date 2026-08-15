'use client';

import Link from 'next/link';
import { TargetedEmailSender } from './targeted-email-sender';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { conversationStrategy, evaluateMessageQuality, generateProfessionalMessage } from '../lib/intelligence/v6';
import { exclusionReason, nurtureDecision } from '../lib/intelligence/smart-nurture';
import { recommendAttachment } from '../lib/intelligence/attachment-recommendation';
import { simpleCrud, type SimpleRow } from '../lib/supabase/simple-crud';

const text = (value: unknown) => String(value ?? '').trim();

const objectiveOptions = [
  'INTRODUCTION',
  'VENDOR_REGISTRATION',
  'SUBCONTRACTING',
  'PROJECT_DISCUSSION',
  'MEETING_REQUEST',
  'FOLLOW_UP',
  'RECONNECT',
] as const;

const replyOptions = ['ALL', 'REPLIED', 'NO_REPLY', 'POSITIVE', 'NEUTRAL', 'NOT_NOW'];
const languageOptions = ['ARABIC', 'ENGLISH'];
const relationshipStages = ['COLD', 'WARM', 'ACTIVE', 'STRATEGIC', 'DORMANT'];

type Tab = 'inbox' | 'drafts' | 'review' | 'approved' | 'followups' | 'nurture' | 'campaigns' | 'history' | 'composer';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'inbox', label: 'INBOX / RESPONSES' },
  { id: 'drafts', label: 'DRAFTS' },
  { id: 'review', label: 'READY FOR REVIEW' },
  { id: 'approved', label: 'APPROVED' },
  { id: 'followups', label: 'FOLLOW-UPS' },
  { id: 'nurture', label: 'NURTURE' },
  { id: 'campaigns', label: 'CAMPAIGNS' },
  { id: 'history', label: 'HISTORY' },
  { id: 'composer', label: 'COMPOSER' },
];

export function EmailCenterWorkspace() {
  const [data, setData] = useState<Record<string, SimpleRow[]>>({});
  const [tab, setTab] = useState<Tab>('inbox');
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
  const [objective, setObjective] = useState<(typeof objectiveOptions)[number]>('INTRODUCTION');
  const [serviceAngle, setServiceAngle] = useState('');
  const [language, setLanguage] = useState<'ARABIC' | 'ENGLISH'>('ARABIC');
  const [companyFilter, setCompanyFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');
  const [opportunityFilter, setOpportunityFilter] = useState('');
  const [replyFilter, setReplyFilter] = useState('ALL');

  const load = useCallback(async () => {
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
  }, [companyId, selectedCampaign]);

  useEffect(() => {
    void load();
  }, [load]);

  const companies = useMemo(() => data.companies ?? [], [data.companies]);
  const contacts = useMemo(() => data.contacts ?? [], [data.contacts]);
  const messages = useMemo(() => data.messages ?? [], [data.messages]);
  const events = useMemo(() => data.communication_events ?? [], [data.communication_events]);
  const opportunities = useMemo(() => data.opportunities ?? [], [data.opportunities]);
  const campaigns = useMemo(() => data.outreach_campaigns ?? [], [data.outreach_campaigns]);
  const campaignCompanies = useMemo(() => data.campaign_companies ?? [], [data.campaign_companies]);
  const assets = useMemo(() => (data.sales_kit_assets ?? []).filter((item) => item.active !== false), [data.sales_kit_assets]);

  const selectedCompany = companies.find((item) => item.id === companyId);
  const companyContacts = contacts.filter((item) => item.company_id === companyId && !item.archived_at);
  const selectedContact = companyContacts.find((item) => item.id === contactId) ?? companyContacts[0];

  const statusCounts = useMemo(() => {
    const byStatus = {
      inbox: events.filter((item) => !item.archived_at && text(item.direction).toUpperCase() === 'INBOUND').length,
      drafts: messages.filter((item) => !item.archived_at && text(item.status) === 'Draft').length,
      review: messages.filter((item) => !item.archived_at && ['Draft', 'Approved'].includes(text(item.status))).length,
      approved: messages.filter((item) => !item.archived_at && text(item.status) === 'Approved').length,
      followups: events.filter((item) => !item.archived_at && text(item.direction).toUpperCase() === 'OUTBOUND').length,
      nurture: messages.filter((item) => !item.archived_at && text(item.status) === 'Nurture').length,
      campaigns: campaigns.length,
      history: events.filter((item) => !item.archived_at).length,
    };
    return byStatus;
  }, [campaigns, events, messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter((item) => !item.archived_at).filter((item) => {
      const companyMatch = !companyFilter || text(item.company_id) === companyFilter || text(item.company_name).toLowerCase().includes(companyFilter.toLowerCase());
      const recipientMatch = !recipientFilter || text(item.recipient).toLowerCase().includes(recipientFilter.toLowerCase());
      const statusMatch = !statusFilter || text(item.status).toLowerCase() === statusFilter.toLowerCase();
      const languageMatch = !languageFilter || text(item.language || 'ARABIC').toUpperCase() === languageFilter.toUpperCase();
      const dateMatch = !dateFilter || text(item.created_at || item.updated_at).slice(0, 10) === dateFilter;
      const campaignMatch = !campaignFilter || text(item.campaign_id) === campaignFilter;
      const segmentMatch = !segmentFilter || text(companies.find((company) => company.id === item.company_id)?.sector || '').toLowerCase().includes(segmentFilter.toLowerCase()) || text(companies.find((company) => company.id === item.company_id)?.target_segment || '').toLowerCase().includes(segmentFilter.toLowerCase());
      const replyMatch = replyFilter === 'ALL' || (
        replyFilter === 'REPLIED' ? text(item.status).toUpperCase() === 'APPROVED' || text(item.status).toUpperCase() === 'REPLIED' :
        replyFilter === 'NO_REPLY' ? text(item.status).toUpperCase() !== 'APPROVED' && text(item.status).toUpperCase() !== 'REPLIED' :
        true
      );
      return companyMatch && recipientMatch && statusMatch && languageMatch && dateMatch && campaignMatch && segmentMatch && replyMatch;
    });
  }, [campaignFilter, companies, companyFilter, dateFilter, languageFilter, messages, recipientFilter, replyFilter, segmentFilter, statusFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => !item.archived_at).filter((item) => {
      const companyMatch = !companyFilter || text(item.company_id) === companyFilter;
      const recipientMatch = !recipientFilter || text(item.recipient).toLowerCase().includes(recipientFilter.toLowerCase());
      const relationshipMatch = !relationshipFilter || text(item.relationship_stage || '').toUpperCase() === relationshipFilter.toUpperCase();
      const opportunityMatch = !opportunityFilter || text(item.opportunity_id || '').toLowerCase() === opportunityFilter.toLowerCase();
      const replyMatch = replyFilter === 'ALL' || (replyFilter === 'REPLIED' ? text(item.direction).toUpperCase() === 'INBOUND' : replyFilter === 'NO_REPLY' ? text(item.direction).toUpperCase() !== 'INBOUND' : true);
      return companyMatch && recipientMatch && relationshipMatch && opportunityMatch && replyMatch;
    });
  }, [companyFilter, events, opportunityFilter, recipientFilter, relationshipFilter, replyFilter]);

  const recommendedAttachment = selectedCompany
    ? recommendAttachment(assets, selectedCompany, text(selectedContact?.position || selectedCompany.recommended_role || ''))
    : null;

  const draftQuality = selectedCompany
    ? evaluateMessageQuality({
        body,
        companyName: text(selectedCompany.company_name),
        businessAngle: text(selectedCompany.business_angle || selectedCompany.contracting_angle || serviceAngle || ''),
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
      language: language === 'ENGLISH' ? 'ENGLISH' : 'ARABIC',
      objective,
    });

    const payload = generateProfessionalMessage({
      strategy,
      companyName: text(company.company_name),
      recipientName: text(contact?.full_name || contact?.name),
      verifiedRecipient: Boolean(contact && text(contact.verification_status).toUpperCase() === 'VERIFIED'),
      evidence: contact
        ? [{ label: 'Contact source', value: text(contact.full_name || contact.name), source: text(contact.source_url || contact.source) }]
        : [],
    });

    const subjectOptions = [
      `${objective.replace(/_/g, ' ')} — ${text(company.company_name)}`,
      `${serviceAngle || 'Capability'} — ALGAEU`,
      `${text(company.company_name)} — ${objective === 'FOLLOW_UP' ? 'Follow-up' : 'Business Inquiry'}`,
    ].map((item) => item.replace(/\s+/g, ' ').trim());

    return { ...payload, subjectOptions };
  };

  const regenerateComposer = () => {
    if (!selectedCompany) {
      setNotice('اختر شركة أولاً.');
      return;
    }
    const generated = generateForCompany(selectedCompany, selectedContact);
    setSubject(generated.subjectOptions[0]);
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
      language,
      status: 'Draft',
      objective,
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

  const reviewRows = filteredMessages.filter((item) => ['Draft', 'Approved', 'Ready for Manual Send'].includes(text(item.status)));
  const historyRows = filteredEvents;

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
          language,
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
    <CRMPage title="Email / Communication Center" description="مركز التواصل المهني: رسائل مخصصة حسب الشركة والقطاع، معاينة وتعديل، ثم إرسال يدوي مع سجل كامل.">
      <TargetedEmailSender />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm">
        <b>الإرسال تحت تحكمك</b>
        <span>لن تُرسل أي رسالة قبل اختيار المستلمين وفتح المعاينة ثم الضغط على زر الإرسال.</span>
      </div>

      {notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['inbox', statusCounts.inbox],
          ['drafts', statusCounts.drafts],
          ['review', statusCounts.review],
          ['approved', statusCounts.approved],
          ['followups', statusCounts.followups],
          ['nurture', statusCounts.nurture],
          ['campaigns', statusCounts.campaigns],
          ['history', statusCounts.history],
        ].map(([id, value]) => (
          <button key={id} type="button" onClick={() => setTab((id as Tab) || 'inbox')} className="crm-kpi text-right p-3">
            <p className="text-xs text-[#75664d]">{id}</p>
            <strong className="mt-1 block text-2xl">{value}</strong>
          </button>
        ))}
      </div>

      <div className="crm-card flex flex-wrap gap-2 p-3">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'btn-primary' : 'btn-ghost'}>
            {item.label}
          </button>
        ))}
        <Link href="/campaigns" className="btn-secondary">فتح مركز الحملات</Link>
      </div>

      <div className="crm-card mt-3 p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل الشركات</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{text(company.company_name)}</option>
            ))}
          </select>
          <select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل القطاعات</option>
            {Array.from(new Set(companies.map((company) => text(company.segment || company.target_segment || company.sector)).filter(Boolean))).map((segment) => (
              <option key={segment} value={segment}>{segment}</option>
            ))}
          </select>
          <input value={recipientFilter} onChange={(event) => setRecipientFilter(event.target.value)} placeholder="المستلم" className="rounded-xl border p-2" />
          <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل الحملات</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{text(campaign.name)}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل الحالات</option>
            {Array.from(new Set(messages.map((item) => text(item.status)).filter(Boolean))).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل اللغات</option>
            {languageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-xl border p-2" />
          <select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل مراحل العلاقة</option>
            {relationshipStages.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={opportunityFilter} onChange={(event) => setOpportunityFilter(event.target.value)} className="rounded-xl border p-2">
            <option value="">كل الفرص</option>
            {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{text(opportunity.title)}</option>)}
          </select>
          <select value={replyFilter} onChange={(event) => setReplyFilter(event.target.value)} className="rounded-xl border p-2">
            {replyOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'كل الرسائل' : option}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="crm-empty animate-pulse">جارٍ تحميل مركز التواصل...</div> : null}

      {!loading && tab === 'composer' ? (
        <section className="crm-card space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-4">
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
            <select value={objective} onChange={(event) => setObjective(event.target.value as (typeof objectiveOptions)[number])} className="rounded-xl border p-2">
              {objectiveOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={language} onChange={(event) => setLanguage(event.target.value as 'ARABIC' | 'ENGLISH')} className="rounded-xl border p-2">
              {languageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <input value={serviceAngle} onChange={(event) => setServiceAngle(event.target.value)} placeholder="زاوية الخدمة / المصلحة التجارية" className="rounded-xl border p-2" />
            <input value={text(recommendedAttachment?.name || recommendedAttachment?.asset_type || '')} readOnly className="rounded-xl border bg-gray-50 p-2" />
          </div>

          <div className="rounded-xl border bg-[#fffaf0] p-3">
            <p className="mb-2 text-sm font-bold">3 subject options</p>
            <div className="flex flex-wrap gap-2">
              {selectedCompany ? generateForCompany(selectedCompany, selectedContact).subjectOptions.map((option) => (
                <button key={option} type="button" onClick={() => setSubject(option)} className={subject === option ? 'btn-primary' : 'btn-ghost'}>{option}</button>
              )) : <span className="text-sm text-[#75664d]">اختر شركة أولاً.</span>}
            </div>
          </div>

          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="موضوع الرسالة" className="w-full rounded-xl border p-2" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="نص الرسالة" className="min-h-52 w-full rounded-xl border p-3" />

          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p><b>Attachment:</b> {text(recommendedAttachment?.name || recommendedAttachment?.asset_type) || 'لا يوجد أصل مناسب'}</p>
            <p><b>Quality:</b> {draftQuality ? `${draftQuality.score}/100 (${draftQuality.status})` : '—'}</p>
            <p><b>Workflow:</b> Draft → Review → Approve → Manual send only</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={regenerateComposer} className="btn-secondary">توليد رسالة مخصصة</button>
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

      {!loading && tab === 'approved' ? (
        <section className="grid gap-3">
          {filteredMessages.filter((item) => text(item.status).toUpperCase() === 'APPROVED').map((row) => (
            <article key={row.id} className="crm-card p-4">
              <div className="flex justify-between"><b>{text(row.subject)}</b><span className="crm-chip status-success">Approved</span></div>
              <p className="mt-1 text-xs text-[#75664d]">{text(row.company_name)}</p>
              <p className="mt-2 text-sm">{text(row.body)}</p>
            </article>
          ))}
          {!filteredMessages.some((item) => text(item.status).toUpperCase() === 'APPROVED') ? <div className="crm-empty">لا توجد مسودات معتمدة.</div> : null}
        </section>
      ) : null}

      {!loading && tab === 'followups' ? (
        <section className="grid gap-3">
          {filteredEvents.map((event) => (
            <article key={event.id} className="crm-card p-4">
              <div className="flex justify-between"><b>{text(event.subject || event.outcome || 'Follow-up')}</b><span className="crm-chip status-warning">{text(event.direction).toUpperCase()}</span></div>
              <p className="mt-1 text-xs text-[#75664d]">{text(companies.find((company) => company.id === event.company_id)?.company_name)} · {text(event.channel)} · {text(event.occurred_at || event.created_at)}</p>
              <p className="mt-2 text-sm">{text(event.notes || event.outcome || '—')}</p>
            </article>
          ))}
          {!filteredEvents.length ? <div className="crm-empty">لا توجد متابعة أو ردات مخصصة في الفلتر الحالي.</div> : null}
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

      {!loading && tab === 'inbox' ? (
        <section className="grid gap-3">
          {filteredEvents.map((event) => (
            <article key={event.id} className="crm-card p-4">
              <div className="flex justify-between"><b>{text(event.subject || event.recipient || 'Response')}</b><span className="crm-chip status-warning">{text(event.direction).toUpperCase()}</span></div>
              <p className="mt-1 text-xs text-[#75664d]">{text(companies.find((company) => company.id === event.company_id)?.company_name)} · {text(event.channel)} · {text(event.occurred_at || event.created_at)}</p>
              <p className="mt-2 text-sm">{text(event.outcome || event.notes || '—')}</p>
            </article>
          ))}
          {!filteredEvents.length ? <div className="crm-empty">لا توجد ردود أو رسائل واردة في الفلتر الحالي.</div> : null}
        </section>
      ) : null}

    </CRMPage>
  );
}
