'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRMPage } from './crm-shell';
import { crmServices } from '../lib/crm/services';
import type { Company, FollowUp, Message, Opportunity, TimelineEntry } from '../lib/crm/types';
import { allowedCities, allowedCompanyTypes, CsvImportProvider, type DiscoveryCandidate, type DiscoveryProvider, type DiscoveryProviderType, type DiscoveryQuery, type ImportSummary } from '../lib/agents/discovery';

const agentDefinitions = [
  { key: 'search', title: 'وكيل البحث', description: 'يجمع المرشحين ويحدد أولويات الاستهداف.' },
  { key: 'analyzer', title: 'وكيل التحليل', description: 'يرتب البيانات ويضع الأسباب والاقتراحات.' },
  { key: 'decision', title: 'وكيل القرار', description: 'يقرر ما إذا كان المرشح مناسباً للاعتماد.' },
  { key: 'outreach', title: 'وكيل التواصل', description: 'يُعِد الرسائل والاتصال الأولي.' },
  { key: 'followup', title: 'وكيل المتابعة', description: 'يوزع المهام والتذكيرات بعد الاعتماد.' },
] as const;

type AgentStatus = 'Waiting' | 'Running' | 'Completed' | 'Failed';

type AgentExecution = {
  key: (typeof agentDefinitions)[number]['key'];
  title: string;
  status: AgentStatus;
  startedAt: string;
  completedAt: string;
  executionTime: string;
  resultSummary: string;
  log: string[];
};

const defaultForm: DiscoveryQuery = {
  companyType: allowedCompanyTypes[0],
  city: allowedCities[0],
  sector: '',
  resultsCount: 5,
};

const workflowSteps = ['search', 'analyzer', 'decision', 'outreach', 'followup'] as const;

function createDefaultExecution(agent: (typeof agentDefinitions)[number]): AgentExecution {
  return {
    key: agent.key,
    title: agent.title,
    status: 'Waiting',
    startedAt: '—',
    completedAt: '—',
    executionTime: '—',
    resultSummary: 'في انتظار التشغيل',
    log: [],
  };
}

export function AgentsWorkflow() {
  const [form, setForm] = useState<DiscoveryQuery>(defaultForm);
  const [provider] = useState<DiscoveryProviderType>('csv');
  const [providers] = useState<DiscoveryProvider[]>(() => [new CsvImportProvider()]);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>(() => agentDefinitions.map(createDefaultExecution));
  const [csvText, setCsvText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary>({ totalRows: 0, valid: 0, rejected: 0, duplicates: 0, approved: 0 });

  useEffect(() => {
    setLogs((previous) => previous.length > 0 ? previous : ['تم تهيئة لوحة الوكلاء بنجاح.', 'النتائج تبقى في حالة مراجعة ولا تُحفظ تلقائياً.']);
  }, []);

  const activeProvider = useMemo(() => providers.find((item) => item.type === provider) ?? providers[0], [provider, providers]);

  const addLog = (entry: string) => {
    setLogs((previous) => [entry, ...previous].slice(0, 50));
  };

  const updateExecution = (key: (typeof agentDefinitions)[number]['key'], updates: Partial<AgentExecution>) => {
    setExecutions((previous) => previous.map((item) => (item.key === key ? { ...item, ...updates } : item)));
  };

  const handleDiscover = async () => {
    if (!form.companyType || !form.city || !form.sector) {
      addLog('تعذر تشغيل Workflow: الرجاء تعبئة نوع الشركة والمدينة والقطاع.');
      return;
    }

    setIsRunning(true);
    addLog(`بدأت عملية اكتشاف عميل جديد عبر ${activeProvider.name}.`);

    const nextExecutions = agentDefinitions.map(createDefaultExecution);
    setExecutions(nextExecutions);

    try {
      for (const step of workflowSteps) {
        const agentDefinition = agentDefinitions.find((item) => item.key === step);
        if (!agentDefinition) {
          continue;
        }

        const started = Date.now();
        updateExecution(step, {
          status: 'Running',
          startedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          completedAt: '—',
          executionTime: '—',
          resultSummary: 'جاري تشغيل الوكيل...',
          log: [`${agentDefinition.title}: تم بدء التنفيذ.`],
        });
        addLog(`${agentDefinition.title}: بدأ التشغيل.`);

        await new Promise((resolve) => setTimeout(resolve, 400));

        const duration = Date.now() - started;
        updateExecution(step, {
          status: 'Completed',
          completedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          executionTime: `${duration}ms`,
          resultSummary: `تمت معالجة ${form.resultsCount} نتيجة بنجاح.`,
          log: [`${agentDefinition.title}: اكتمل بنجاح في ${duration}ms.`],
        });
        addLog(`${agentDefinition.title}: اكتمل بنجاح.`);
      }

      const discovered = await activeProvider.discover(form);
      if (provider === 'csv') {
        const csvProvider = activeProvider as CsvImportProvider;
        csvProvider.setCsv(csvText);
        const results = await csvProvider.discover(form);
        setCandidates(results);
        setImportSummary(csvProvider.getSummary());
      } else {
        setCandidates(discovered);
        setImportSummary({ totalRows: discovered.length, valid: discovered.length, rejected: 0, duplicates: 0, approved: 0 });
      }

      addLog('تمت مراجعة النتائج بنجاح، وهي ما زالت في وضع المراجعة ولا تُحفظ تلقائياً.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع.';
      addLog(`فشل تشغيل Workflow: ${message}`);
      setExecutions((previous) => previous.map((item) => ({ ...item, status: item.status === 'Running' ? 'Failed' : item.status, resultSummary: item.status === 'Running' ? 'فشل التنفيذ' : item.resultSummary })));
    } finally {
      setIsRunning(false);
    }
  };

  const approveCandidate = (candidate: DiscoveryCandidate) => {
    const companyId = crypto.randomUUID();
    const now = new Date().toISOString();
    const company: Company = {
      id: companyId,
      companyName: candidate.companyName || 'شركة جديدة',
      companyType: candidate.companyType,
      sector: candidate.sector,
      city: candidate.city,
      website: candidate.website,
      generalEmail: candidate.email,
      generalPhone: candidate.phone,
      contactPerson: '',
      position: candidate.recommendedContactPosition,
      mobile: candidate.phone,
      linkedIn: '',
      serviceOpportunity: candidate.suggestedService,
      status: 'prospect',
      lastContact: now,
      nextFollowUp: now,
      notes: candidate.agentNotes,
      communicationHistory: [],
      followUps: [],
      opportunities: [],
      createdAt: now,
      updatedAt: now,
    };

    const existing = crmServices.companies.list().some((item) => item.companyName === company.companyName || item.generalEmail === company.generalEmail);
    if (existing) {
      addLog(`تم تجاهل ${candidate.companyName || 'شركة جديدة'} بسبب تكرار الشركة.`);
      return;
    }

    crmServices.companies.create(company as never);

    const opportunity: Opportunity = {
      id: crypto.randomUUID(),
      companyId,
      companyName: company.companyName,
      title: `فرصة أولية - ${candidate.suggestedService}`,
      service: candidate.suggestedService,
      probability: candidate.priority === 'عالية' ? 'High' : candidate.priority === 'متوسطة' ? 'Medium' : 'Low',
      estimatedValue: '0',
      stage: 'Prospecting',
      priority: candidate.priority,
      owner: 'AJ-EDGE',
      notes: candidate.reasonForTargeting,
      createdAt: now,
      updatedAt: now,
    };

    crmServices.opportunities.create(opportunity as never);

    const followUp: FollowUp = {
      id: crypto.randomUUID(),
      companyId,
      companyName: company.companyName,
      contactPerson: company.contactPerson || candidate.recommendedContactPosition,
      followUpType: 'متابعة أولية',
      date: now,
      time: '09:00',
      priority: candidate.priority,
      status: 'pending',
      subject: 'متابعة أولية بعد الاعتماد',
      notes: candidate.agentNotes,
      result: 'pending',
      nextAction: 'إرسال عرض أولي',
      nextFollowUpDate: now,
      createdAt: now,
      updatedAt: now,
    };

    crmServices.followUps.create(followUp as never);

    const timelineEntry: TimelineEntry = {
      id: crypto.randomUUID(),
      companyId,
      companyName: company.companyName,
      date: now,
      type: 'متابعة',
      title: 'اعتماد شركة من الوكلاء',
      notes: `تم اعتماد ${company.companyName} من خلال ${candidate.source}`,
      createdAt: now,
      updatedAt: now,
    };

    crmServices.timeline.create(timelineEntry as never);

    setCandidates((previous) => previous.map((item) => item.id === candidate.id ? { ...item, reviewStatus: 'approved' } : item));
    setImportSummary((previous) => ({ ...previous, approved: previous.approved + 1 }));
    addLog(`تم اعتماد ${company.companyName} وإضافتها إلى CRM.`);
  };

  const ignoreCandidate = (candidate: DiscoveryCandidate) => {
    setCandidates((previous) => previous.map((item) => item.id === candidate.id ? { ...item, reviewStatus: 'ignored' } : item));
    addLog(`تم تجاهل ${candidate.companyName || 'النتيجة'} من قائمة المراجعة.`);
  };

  const openWebsite = (candidate: DiscoveryCandidate) => {
    if (!candidate.website) {
      addLog(`لا يوجد موقع ويب ل${candidate.companyName || 'الشركة المدرجة'}.`);
      return;
    }

    const normalizedUrl = candidate.website.startsWith('http') ? candidate.website : `https://${candidate.website}`;
    if (typeof window !== 'undefined') {
      window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const createMessageForCandidate = (candidate: DiscoveryCandidate) => {
    const now = new Date().toISOString();
    const message: Message = {
      id: crypto.randomUUID(),
      companyId: crypto.randomUUID(),
      companyName: candidate.companyName || 'شركة جديدة',
      direction: 'outgoing',
      channel: 'whatsapp',
      subject: `رسالة أولية - ${candidate.suggestedService}`,
      body: `مرحباً، أود تقديم ${candidate.suggestedService} ل${candidate.companyName || 'الشركة'}.`,
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    };

    crmServices.messages.create(message as never);
    addLog(`تم إنشاء رسالة أولية ل${candidate.companyName || 'الشركة'}.`);
  };

  const addFollowUpForCandidate = (candidate: DiscoveryCandidate) => {
    const now = new Date().toISOString();
    const followUp: FollowUp = {
      id: crypto.randomUUID(),
      companyId: crypto.randomUUID(),
      companyName: candidate.companyName || 'شركة جديدة',
      contactPerson: candidate.recommendedContactPosition,
      followUpType: 'متابعة من الوكلاء',
      date: now,
      time: '10:00',
      priority: candidate.priority,
      status: 'pending',
      subject: `متابعة أولية - ${candidate.suggestedService}`,
      notes: candidate.agentNotes,
      result: 'pending',
      nextAction: 'متابعة بعد التواصل الأولي',
      nextFollowUpDate: now,
      createdAt: now,
      updatedAt: now,
    };

    crmServices.followUps.create(followUp as never);
    addLog(`تم إضافة متابعة أولية ل${candidate.companyName || 'الشركة'}.`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setSelectedFileName(file.name);
    addLog(`تم تحميل ملف CSV: ${file.name}`);
  };

  const downloadTemplate = () => {
    const template = 'companyName,type,sector,city,website,email,phone,source,reason,suggestedService,recommendedContactPosition\nشركة مثال,مصنع,البتروكيماويات,الدمام,https://example.com,info@example.com,0500000000,CSV,مناسب لقطاع البتروكيماويات,خطة تطوير مبيعات,مدير المشتريات\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aj-edge-company-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <CRMPage title="الوكلاء" description="منصة AI Agents لاكتشاف الشركات الجديدة ومتابعتها من مرحلة البحث حتى المتابعة." action={<div className="rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-sm text-[#6f6044]">اكتشاف عميل جديد</div>}>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
            <h3 className="text-lg font-semibold text-[#2f2417]">نموذج الاكتشاف</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm text-[#6f6044]">
                نوع الشركة
                <select value={form.companyType} onChange={(event) => setForm((previous) => ({ ...previous, companyType: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
                  {allowedCompanyTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm text-[#6f6044]">
                المدينة
                <select value={form.city} onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm">
                  {allowedCities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm text-[#6f6044]">
                القطاع
                <input value={form.sector} onChange={(event) => setForm((previous) => ({ ...previous, sector: event.target.value }))} placeholder="مثال: الطاقة أو العقارات" className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
              </label>
              <label className="text-sm text-[#6f6044]">
                عدد النتائج
                <input type="number" min="1" max="10" value={form.resultsCount} onChange={(event) => setForm((previous) => ({ ...previous, resultsCount: Number(event.target.value) || 1 }))} className="mt-1 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
              <label className="text-sm text-[#6f6044]">
                رفع ملف CSV
                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="mt-1 block w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
                {selectedFileName ? <span className="mt-2 block text-xs text-[#9a7b2f]">الملف المختار: {selectedFileName}</span> : null}
              </label>
              <label className="text-sm text-[#6f6044]">
                بيانات CSV
                <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder="companyName,type,sector,city,website,email,phone,source,reason,suggestedService,recommendedContactPosition" className="mt-1 min-h-24 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm" />
              </label>
              <div className="flex flex-col gap-2">
                <button onClick={handleDiscover} disabled={isRunning} className="rounded-2xl bg-[#2f2417] px-4 py-3 text-sm font-semibold text-[#fef8ec] disabled:opacity-60">{isRunning ? 'جاري التشغيل...' : 'استيراد ومراجعة'}</button>
                <button onClick={downloadTemplate} className="rounded-2xl border border-[#ead9b3] bg-[#f8efe0] px-4 py-3 text-sm font-semibold text-[#2f2417]">تحميل قالب CSV</button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {agentDefinitions.map((agent) => (
              <div key={agent.key} className="rounded-[20px] border border-[#ead9b3] bg-[#fdf8ee] p-3">
                <p className="text-sm font-semibold text-[#2f2417]">{agent.title}</p>
                <p className="mt-2 text-sm text-[#6f6044]">{agent.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2f2417]">ملخص الاستيراد</h3>
              <span className="rounded-full bg-[#f8efe0] px-3 py-1 text-xs text-[#9a7b2f]">CSV</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-[#ead9b3] bg-white p-3"><p className="text-xs text-[#9a7b2f]">إجمالي الصفوف</p><p className="mt-1 text-lg font-semibold text-[#2f2417]">{importSummary.totalRows}</p></div>
              <div className="rounded-2xl border border-[#ead9b3] bg-white p-3"><p className="text-xs text-[#9a7b2f]">صالح</p><p className="mt-1 text-lg font-semibold text-[#2f2417]">{importSummary.valid}</p></div>
              <div className="rounded-2xl border border-[#ead9b3] bg-white p-3"><p className="text-xs text-[#9a7b2f]">مرفوض</p><p className="mt-1 text-lg font-semibold text-[#2f2417]">{importSummary.rejected}</p></div>
              <div className="rounded-2xl border border-[#ead9b3] bg-white p-3"><p className="text-xs text-[#9a7b2f]">مكررات</p><p className="mt-1 text-lg font-semibold text-[#2f2417]">{importSummary.duplicates}</p></div>
              <div className="rounded-2xl border border-[#ead9b3] bg-white p-3"><p className="text-xs text-[#9a7b2f]">معتمد</p><p className="mt-1 text-lg font-semibold text-[#2f2417]">{importSummary.approved}</p></div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#ead9b3] bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2f2417]">لوحة تنفيذ الوكلاء</h3>
              <span className="rounded-full bg-[#f8efe0] px-3 py-1 text-xs text-[#9a7b2f]">{isRunning ? 'تشغيل' : 'جاهز'}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {executions.map((execution) => (
                <div key={execution.key} className="rounded-[20px] border border-[#ead9b3] bg-[#fdf8ee] p-3">
                  <p className="text-sm font-semibold text-[#2f2417]">{execution.title}</p>
                  <p className="mt-2 text-xs text-[#9a7b2f]">الحالة: {execution.status}</p>
                  <p className="mt-1 text-xs text-[#6f6044]">الوقت: {execution.executionTime}</p>
                  <p className="mt-1 text-xs text-[#6f6044]">{execution.resultSummary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-[24px] border border-[#ead9b3] bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[#2f2417]">{candidate.companyName || 'شركة جديدة'}</h4>
                    <p className="mt-1 text-sm text-[#6f6044]">{candidate.companyType} • {candidate.sector} • {candidate.city}</p>
                  </div>
                  <div className="rounded-full bg-[#f8efe0] px-3 py-1 text-xs text-[#9a7b2f]">{candidate.priority}</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div><p className="text-xs text-[#9a7b2f]">الموقع</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.website || '—'}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">البريد</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.email || '—'}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">الهاتف</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.phone || '—'}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">المصدر</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.source}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">سبب الاستهداف</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.reasonForTargeting}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">الخدمة المقترحة</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.suggestedService}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">منصب جهة الاتصال</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.recommendedContactPosition}</p></div>
                  <div><p className="text-xs text-[#9a7b2f]">ملاحظات الوكيل</p><p className="mt-1 text-sm text-[#2f2417]">{candidate.agentNotes}</p></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => approveCandidate(candidate)} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">اعتماد وإضافة</button>
                  <button onClick={() => ignoreCandidate(candidate)} className="rounded-full border border-[#ead9b3] bg-[#fff8eb] px-4 py-2 text-sm font-semibold text-[#6f6044]">تجاهل</button>
                  <button onClick={() => openWebsite(candidate)} className="rounded-full border border-[#ead9b3] bg-[#f8efe0] px-4 py-2 text-sm font-semibold text-[#2f2417]">فتح الموقع</button>
                  <button onClick={() => createMessageForCandidate(candidate)} className="rounded-full border border-[#ead9b3] bg-[#f8efe0] px-4 py-2 text-sm font-semibold text-[#2f2417]">إنشاء رسالة</button>
                  <button onClick={() => addFollowUpForCandidate(candidate)} className="rounded-full border border-[#ead9b3] bg-[#f8efe0] px-4 py-2 text-sm font-semibold text-[#2f2417]">إضافة متابعة</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-4">
            <h3 className="text-lg font-semibold text-[#2f2417]">سجل الوكلاء</h3>
            <div className="mt-3 space-y-2">
              {logs.map((entry, index) => (
                <div key={`${entry}-${index}`} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#6f6044]">{entry}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CRMPage>
  );
}
