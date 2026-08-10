'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Company } from '../lib/company-store';
import {
  createEmptyBusinessOpportunity,
  createEmptyCompanyIntelligenceData,
  createEmptyDecisionMaker,
  createEmptyDocumentRecord,
  createEmptyNewsItem,
  createEmptyProject,
  createEmptyTimelineEntry,
  readCompanyIntelligence,
  writeCompanyIntelligence,
  type BusinessOpportunity,
  type CompanyIntelligenceData,
  type CompanyPriority,
  type CompanyProject,
  type Competitor,
  type DecisionMaker,
  type DocumentRecord,
  type NewsItem,
  type TimelineEntry,
} from '../lib/company-intelligence-store';

type CompanyIntelligenceWorkspaceProps = {
  company: Company;
};

function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[#ead9b3] bg-[#fdf8ee] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#2f2417]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-[#6f6044]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function FieldInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-[#2f2417]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417]" />
    </label>
  );
}

function FieldTextarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-[#2f2417]">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="min-h-24 w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417]" />
    </label>
  );
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-[#2f2417]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-[#ead9b3] bg-white px-3 py-2.5 text-sm text-[#2f2417]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-[#ead9b3] bg-white p-3 text-sm text-[#6f6044]">{message}</div>;
}

export function CompanyIntelligenceWorkspace({ company }: CompanyIntelligenceWorkspaceProps) {
  const [data, setData] = useState<CompanyIntelligenceData>(createEmptyCompanyIntelligenceData());
  const [hydrated, setHydrated] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectDraft, setProjectDraft] = useState<CompanyProject>(createEmptyProject());
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionDraft, setDecisionDraft] = useState<DecisionMaker>(createEmptyDecisionMaker());
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [opportunityDraft, setOpportunityDraft] = useState<BusinessOpportunity>(createEmptyBusinessOpportunity());
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [showCompetitorForm, setShowCompetitorForm] = useState(false);
  const [competitorDraft, setCompetitorDraft] = useState<Competitor>({ id: '', company: '', reason: '', notes: '' });
  const [editingCompetitorId, setEditingCompetitorId] = useState<string | null>(null);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsDraft, setNewsDraft] = useState<NewsItem>(createEmptyNewsItem());
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentDraft, setDocumentDraft] = useState<DocumentRecord>(createEmptyDocumentRecord());
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState<TimelineEntry>(createEmptyTimelineEntry());
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(false);
    void readCompanyIntelligence(company.id).then((value) => { setData(value); setHydrated(true); });
  }, [company.id]);

  useEffect(() => {
    if (hydrated) void writeCompanyIntelligence(company.id, company.companyName, data);
  }, [company.companyName, company.id, data, hydrated]);

  const sortedTimeline = useMemo(() => {
    return [...data.timeline].sort((left, right) => (left.date > right.date ? -1 : 1));
  }, [data.timeline]);

  function updateOverview(field: keyof CompanyIntelligenceData['overview'], value: string) {
    setData((current) => ({ ...current, overview: { ...current.overview, [field]: value } }));
  }

  function updateActivity(field: keyof CompanyIntelligenceData['activity'], value: string) {
    setData((current) => ({ ...current, activity: { ...current.activity, [field]: value } }));
  }

  function updateAi(field: keyof CompanyIntelligenceData['aiAnalysis'], value: string) {
    setData((current) => ({ ...current, aiAnalysis: { ...current.aiAnalysis, [field]: value } }));
  }

  function saveProject() {
    const item: CompanyProject = { ...projectDraft, id: editingProjectId ?? crypto.randomUUID() };
    const nextProjects = editingProjectId ? data.projects.map((entry) => (entry.id === editingProjectId ? item : entry)) : [item, ...data.projects];
    setData((current) => ({ ...current, projects: nextProjects }));
    resetProjectForm();
  }

  function resetProjectForm() {
    setProjectDraft(createEmptyProject());
    setEditingProjectId(null);
    setShowProjectForm(false);
  }

  function saveDecisionMaker() {
    const item: DecisionMaker = { ...decisionDraft, id: editingDecisionId ?? crypto.randomUUID() };
    const nextDecisionMakers = editingDecisionId ? data.decisionMakers.map((entry) => (entry.id === editingDecisionId ? item : entry)) : [item, ...data.decisionMakers];
    setData((current) => ({ ...current, decisionMakers: nextDecisionMakers }));
    resetDecisionForm();
  }

  function resetDecisionForm() {
    setDecisionDraft(createEmptyDecisionMaker());
    setEditingDecisionId(null);
    setShowDecisionForm(false);
  }

  function saveOpportunity() {
    const item: BusinessOpportunity = { ...opportunityDraft, id: editingOpportunityId ?? crypto.randomUUID() };
    const nextOpportunities = editingOpportunityId ? data.businessOpportunities.map((entry) => (entry.id === editingOpportunityId ? item : entry)) : [item, ...data.businessOpportunities];
    setData((current) => ({ ...current, businessOpportunities: nextOpportunities }));
    resetOpportunityForm();
  }

  function resetOpportunityForm() {
    setOpportunityDraft(createEmptyBusinessOpportunity());
    setEditingOpportunityId(null);
    setShowOpportunityForm(false);
  }

  function saveCompetitor() {
    const item: Competitor = { ...competitorDraft, id: editingCompetitorId ?? crypto.randomUUID() };
    const nextCompetitors = editingCompetitorId ? data.competitors.map((entry) => (entry.id === editingCompetitorId ? item : entry)) : [item, ...data.competitors];
    setData((current) => ({ ...current, competitors: nextCompetitors }));
    resetCompetitorForm();
  }

  function resetCompetitorForm() {
    setCompetitorDraft({ id: '', company: '', reason: '', notes: '' });
    setEditingCompetitorId(null);
    setShowCompetitorForm(false);
  }

  function saveNewsItem() {
    const item: NewsItem = { ...newsDraft, id: editingNewsId ?? crypto.randomUUID() };
    const nextNews = editingNewsId ? data.news.map((entry) => (entry.id === editingNewsId ? item : entry)) : [item, ...data.news];
    setData((current) => ({ ...current, news: nextNews }));
    resetNewsForm();
  }

  function resetNewsForm() {
    setNewsDraft(createEmptyNewsItem());
    setEditingNewsId(null);
    setShowNewsForm(false);
  }

  function saveDocument() {
    const item: DocumentRecord = { ...documentDraft, id: editingDocumentId ?? crypto.randomUUID() };
    const nextDocuments = editingDocumentId ? data.documents.map((entry) => (entry.id === editingDocumentId ? item : entry)) : [item, ...data.documents];
    setData((current) => ({ ...current, documents: nextDocuments }));
    resetDocumentForm();
  }

  function resetDocumentForm() {
    setDocumentDraft(createEmptyDocumentRecord());
    setEditingDocumentId(null);
    setShowDocumentForm(false);
  }

  function saveTimelineEntry() {
    const item: TimelineEntry = { ...timelineDraft, id: editingTimelineId ?? crypto.randomUUID() };
    const nextTimeline = editingTimelineId ? data.timeline.map((entry) => (entry.id === editingTimelineId ? item : entry)) : [item, ...data.timeline];
    setData((current) => ({ ...current, timeline: nextTimeline }));
    resetTimelineForm();
  }

  function resetTimelineForm() {
    setTimelineDraft(createEmptyTimelineEntry());
    setEditingTimelineId(null);
    setShowTimelineForm(false);
  }

  return (
    <div className="space-y-4">
      <SectionCard title="نظرة عامة" description="ملخص سريع حول أولوية الشركة وإمكانية الفوز">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FieldSelect label="Company Priority" value={data.overview.companyPriority} onChange={(value) => updateOverview('companyPriority', value as CompanyPriority)} options={['A', 'B', 'C']} />
          <FieldInput label="Business Potential" value={data.overview.businessPotential} onChange={(value) => updateOverview('businessPotential', value)} type="number" />
          <FieldInput label="Relationship Score" value={data.overview.relationshipScore} onChange={(value) => updateOverview('relationshipScore', value)} type="number" />
          <FieldInput label="Opportunity Score" value={data.overview.opportunityScore} onChange={(value) => updateOverview('opportunityScore', value)} type="number" />
          <FieldInput label="Overall Recommendation" value={data.overview.overallRecommendation} onChange={(value) => updateOverview('overallRecommendation', value)} />
        </div>
      </SectionCard>

      <SectionCard title="نشاط الشركة" description="بيانات التشغيل والهيكل التنظيمي للشركة">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldInput label="Main Activity" value={data.activity.mainActivity} onChange={(value) => updateActivity('mainActivity', value)} />
          <FieldInput label="Secondary Activities" value={data.activity.secondaryActivities} onChange={(value) => updateActivity('secondaryActivities', value)} />
          <FieldInput label="Industrial Sector" value={data.activity.industrialSector} onChange={(value) => updateActivity('industrialSector', value)} />
          <FieldInput label="Company Size" value={data.activity.companySize} onChange={(value) => updateActivity('companySize', value)} />
          <FieldInput label="Estimated Employees" value={data.activity.estimatedEmployees} onChange={(value) => updateActivity('estimatedEmployees', value)} type="number" />
          <FieldInput label="Headquarters" value={data.activity.headquarters} onChange={(value) => updateActivity('headquarters', value)} />
          <FieldInput label="Branches" value={data.activity.branches} onChange={(value) => updateActivity('branches', value)} />
          <FieldInput label="Current Status" value={data.activity.currentStatus} onChange={(value) => updateActivity('currentStatus', value)} />
        </div>
      </SectionCard>

      <SectionCard title="المشاريع" description="قائمة المشاريع الحالية أو القادمة" action={<button onClick={() => { setShowProjectForm(true); setProjectDraft(createEmptyProject()); setEditingProjectId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة مشروع</button>}>
        {showProjectForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="Project Name" value={projectDraft.projectName} onChange={(value) => setProjectDraft((current) => ({ ...current, projectName: value }))} />
              <FieldInput label="City" value={projectDraft.city} onChange={(value) => setProjectDraft((current) => ({ ...current, city: value }))} />
              <FieldInput label="Status" value={projectDraft.status} onChange={(value) => setProjectDraft((current) => ({ ...current, status: value }))} />
              <FieldInput label="Estimated Value" value={projectDraft.estimatedValue} onChange={(value) => setProjectDraft((current) => ({ ...current, estimatedValue: value }))} />
              <FieldInput label="Start Date" value={projectDraft.startDate} onChange={(value) => setProjectDraft((current) => ({ ...current, startDate: value }))} type="date" />
              <FieldInput label="Expected Finish" value={projectDraft.expectedFinish} onChange={(value) => setProjectDraft((current) => ({ ...current, expectedFinish: value }))} type="date" />
              <div className="md:col-span-2"><FieldTextarea label="Notes" value={projectDraft.notes} onChange={(value) => setProjectDraft((current) => ({ ...current, notes: value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveProject} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetProjectForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {data.projects.length === 0 ? <EmptyState message="لا توجد مشاريع بعد." /> : <div className="space-y-2">{data.projects.map((project) => <div key={project.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{project.projectName || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setProjectDraft(project); setEditingProjectId(project.id); setShowProjectForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, projects: current.projects.filter((entry) => entry.id !== project.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f6044]">
            <span>{project.city || '—'}</span>
            <span>{project.status || '—'}</span>
            <span>{project.estimatedValue || '—'}</span>
            <span>{project.startDate || '—'}</span>
            <span>{project.expectedFinish || '—'}</span>
          </div>
          {project.notes ? <p className="mt-2 text-xs text-[#6f6044]">{project.notes}</p> : null}
        </div>)}</div>}
      </SectionCard>

      <SectionCard title="صناع القرار" description="الأشخاص المؤثرون في القرار" action={<button onClick={() => { setShowDecisionForm(true); setDecisionDraft(createEmptyDecisionMaker()); setEditingDecisionId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة صانع قرار</button>}>
        {showDecisionForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="Name" value={decisionDraft.name} onChange={(value) => setDecisionDraft((current) => ({ ...current, name: value }))} />
              <FieldInput label="Position" value={decisionDraft.position} onChange={(value) => setDecisionDraft((current) => ({ ...current, position: value }))} />
              <FieldInput label="Department" value={decisionDraft.department} onChange={(value) => setDecisionDraft((current) => ({ ...current, department: value }))} />
              <FieldInput label="Decision Level" value={decisionDraft.decisionLevel} onChange={(value) => setDecisionDraft((current) => ({ ...current, decisionLevel: value }))} />
              <FieldInput label="Mobile" value={decisionDraft.mobile} onChange={(value) => setDecisionDraft((current) => ({ ...current, mobile: value }))} />
              <FieldInput label="Email" value={decisionDraft.email} onChange={(value) => setDecisionDraft((current) => ({ ...current, email: value }))} />
              <FieldInput label="LinkedIn" value={decisionDraft.linkedIn} onChange={(value) => setDecisionDraft((current) => ({ ...current, linkedIn: value }))} />
              <FieldInput label="Relationship Strength" value={decisionDraft.relationshipStrength} onChange={(value) => setDecisionDraft((current) => ({ ...current, relationshipStrength: value }))} />
              <FieldInput label="Last Contact" value={decisionDraft.lastContact} onChange={(value) => setDecisionDraft((current) => ({ ...current, lastContact: value }))} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveDecisionMaker} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetDecisionForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {data.decisionMakers.length === 0 ? <EmptyState message="لا توجد أسماء صناع قرار بعد." /> : <div className="space-y-2">{data.decisionMakers.map((maker) => <div key={maker.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{maker.name || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setDecisionDraft(maker); setEditingDecisionId(maker.id); setShowDecisionForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, decisionMakers: current.decisionMakers.filter((entry) => entry.id !== maker.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f6044]">
            <span>{maker.position || '—'}</span>
            <span>{maker.department || '—'}</span>
            <span>{maker.decisionLevel || '—'}</span>
            <span>{maker.mobile || '—'}</span>
            <span>{maker.email || '—'}</span>
          </div>
        </div>)}</div>}
      </SectionCard>

      <SectionCard title="الفرص التجارية" description="الفرص المتوقعة مع قيمها واحتمالاتها" action={<button onClick={() => { setShowOpportunityForm(true); setOpportunityDraft(createEmptyBusinessOpportunity()); setEditingOpportunityId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة فرصة</button>}>
        {showOpportunityForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="Service" value={opportunityDraft.service} onChange={(value) => setOpportunityDraft((current) => ({ ...current, service: value }))} />
              <FieldInput label="Probability %" value={opportunityDraft.probability} onChange={(value) => setOpportunityDraft((current) => ({ ...current, probability: value }))} />
              <FieldInput label="Estimated Value" value={opportunityDraft.estimatedValue} onChange={(value) => setOpportunityDraft((current) => ({ ...current, estimatedValue: value }))} />
              <FieldInput label="Stage" value={opportunityDraft.stage} onChange={(value) => setOpportunityDraft((current) => ({ ...current, stage: value }))} />
              <FieldInput label="Priority" value={opportunityDraft.priority} onChange={(value) => setOpportunityDraft((current) => ({ ...current, priority: value }))} />
              <FieldInput label="Owner" value={opportunityDraft.owner} onChange={(value) => setOpportunityDraft((current) => ({ ...current, owner: value }))} />
              <div className="md:col-span-2"><FieldTextarea label="Notes" value={opportunityDraft.notes} onChange={(value) => setOpportunityDraft((current) => ({ ...current, notes: value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveOpportunity} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetOpportunityForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {data.businessOpportunities.length === 0 ? <EmptyState message="لا توجد فرص تجارية بعد." /> : <div className="space-y-2">{data.businessOpportunities.map((opportunity) => <div key={opportunity.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{opportunity.service || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setOpportunityDraft(opportunity); setEditingOpportunityId(opportunity.id); setShowOpportunityForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, businessOpportunities: current.businessOpportunities.filter((entry) => entry.id !== opportunity.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f6044]">
            <span>{opportunity.probability || '—'}</span>
            <span>{opportunity.estimatedValue || '—'}</span>
            <span>{opportunity.stage || '—'}</span>
            <span>{opportunity.priority || '—'}</span>
            <span>{opportunity.owner || '—'}</span>
          </div>
          {opportunity.notes ? <p className="mt-2 text-xs text-[#6f6044]">{opportunity.notes}</p> : null}
        </div>)}</div>}
      </SectionCard>

      <SectionCard title="المنافسون" description="سجّل المنافسين أو المقاولين المنافسين" action={<button onClick={() => { setShowCompetitorForm(true); setCompetitorDraft({ id: '', company: '', reason: '', notes: '' }); setEditingCompetitorId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة منافس</button>}>
        {showCompetitorForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="Company" value={competitorDraft.company} onChange={(value) => setCompetitorDraft((current) => ({ ...current, company: value }))} />
              <FieldInput label="Reason" value={competitorDraft.reason} onChange={(value) => setCompetitorDraft((current) => ({ ...current, reason: value }))} />
              <div className="md:col-span-2"><FieldTextarea label="Notes" value={competitorDraft.notes} onChange={(value) => setCompetitorDraft((current) => ({ ...current, notes: value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveCompetitor} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetCompetitorForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {data.competitors.length === 0 ? <EmptyState message="لا توجد معلومات منافسين بعد." /> : <div className="space-y-2">{data.competitors.map((competitor) => <div key={competitor.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{competitor.company || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setCompetitorDraft(competitor); setEditingCompetitorId(competitor.id); setShowCompetitorForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, competitors: current.competitors.filter((entry) => entry.id !== competitor.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 text-xs text-[#6f6044]">{competitor.reason || '—'}</div>
          {competitor.notes ? <p className="mt-2 text-xs text-[#6f6044]">{competitor.notes}</p> : null}
        </div>)}</div>}
      </SectionCard>

      <SectionCard title="تحليل الذكاء الاصطناعي" description="ملخص إداري قابل للتعديل حتى يتم ربطه بالذكاء الاصطناعي لاحقاً">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldInput label="Best service to offer" value={data.aiAnalysis.bestService} onChange={(value) => updateAi('bestService', value)} />
          <FieldInput label="Best person to contact" value={data.aiAnalysis.bestPerson} onChange={(value) => updateAi('bestPerson', value)} />
          <FieldInput label="Recommended next action" value={data.aiAnalysis.recommendedNextAction} onChange={(value) => updateAi('recommendedNextAction', value)} />
          <FieldInput label="Estimated winning probability" value={data.aiAnalysis.winningProbability} onChange={(value) => updateAi('winningProbability', value)} />
          <div className="md:col-span-2"><FieldTextarea label="Risks" value={data.aiAnalysis.risks} onChange={(value) => updateAi('risks', value)} /></div>
          <div className="md:col-span-2"><FieldTextarea label="Opportunities" value={data.aiAnalysis.opportunities} onChange={(value) => updateAi('opportunities', value)} /></div>
        </div>
      </SectionCard>

      <SectionCard title="الأخبار" description="خط زمني للأحداث والأنباء ذات الصلة بالشركة" action={<button onClick={() => { setShowNewsForm(true); setNewsDraft(createEmptyNewsItem()); setEditingNewsId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة خبر</button>}>
        {showNewsForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="Date" value={newsDraft.date} onChange={(value) => setNewsDraft((current) => ({ ...current, date: value }))} type="date" />
              <FieldInput label="Title" value={newsDraft.title} onChange={(value) => setNewsDraft((current) => ({ ...current, title: value }))} />
              <FieldInput label="Source" value={newsDraft.source} onChange={(value) => setNewsDraft((current) => ({ ...current, source: value }))} />
              <div className="md:col-span-2"><FieldTextarea label="Notes" value={newsDraft.notes} onChange={(value) => setNewsDraft((current) => ({ ...current, notes: value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveNewsItem} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetNewsForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {data.news.length === 0 ? <EmptyState message="لا توجد أخبار بعد." /> : <div className="space-y-2">{data.news.map((item) => <div key={item.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{item.title || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setNewsDraft(item); setEditingNewsId(item.id); setShowNewsForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, news: current.news.filter((entry) => entry.id !== item.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f6044]">
            <span>{item.date || '—'}</span>
            <span>{item.source || '—'}</span>
          </div>
          {item.notes ? <p className="mt-2 text-xs text-[#6f6044]">{item.notes}</p> : null}
        </div>)}</div>}
      </SectionCard>

      <SectionCard title="المستندات" description="سجلات المستندات المرفقة" action={<button onClick={() => { setShowDocumentForm(true); setDocumentDraft(createEmptyDocumentRecord()); setEditingDocumentId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة مستند</button>}>
        {showDocumentForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="File Name" value={documentDraft.fileName} onChange={(value) => setDocumentDraft((current) => ({ ...current, fileName: value }))} />
              <FieldInput label="Category" value={documentDraft.category} onChange={(value) => setDocumentDraft((current) => ({ ...current, category: value }))} />
              <FieldInput label="Upload Date" value={documentDraft.uploadDate} onChange={(value) => setDocumentDraft((current) => ({ ...current, uploadDate: value }))} type="date" />
              <div className="md:col-span-2"><FieldTextarea label="Notes" value={documentDraft.notes} onChange={(value) => setDocumentDraft((current) => ({ ...current, notes: value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveDocument} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetDocumentForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {data.documents.length === 0 ? <EmptyState message="لا توجد مستندات بعد." /> : <div className="space-y-2">{data.documents.map((document) => <div key={document.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{document.fileName || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setDocumentDraft(document); setEditingDocumentId(document.id); setShowDocumentForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, documents: current.documents.filter((entry) => entry.id !== document.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f6044]">
            <span>{document.category || '—'}</span>
            <span>{document.uploadDate || '—'}</span>
          </div>
          {document.notes ? <p className="mt-2 text-xs text-[#6f6044]">{document.notes}</p> : null}
        </div>)}</div>}
      </SectionCard>

      <SectionCard title="Timeline" description="سجل زمني للاتصالات والأنشطة الرئيسية">
        <div className="flex justify-end">
          <button onClick={() => { setShowTimelineForm(true); setTimelineDraft(createEmptyTimelineEntry()); setEditingTimelineId(null); }} className="rounded-full border border-[#d8c08d] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f2417]">إضافة حدث</button>
        </div>
        {showTimelineForm ? (
          <div className="rounded-[20px] border border-[#ead9b3] bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput label="Date" value={timelineDraft.date} onChange={(value) => setTimelineDraft((current) => ({ ...current, date: value }))} type="date" />
              <FieldSelect label="Type" value={timelineDraft.type} onChange={(value) => setTimelineDraft((current) => ({ ...current, type: value as TimelineEntry['type'] }))} options={['اجتماع', 'مكالمة', 'بريد', 'واتساب', 'عرض سعر', 'متابعة']} />
              <FieldInput label="Title" value={timelineDraft.title} onChange={(value) => setTimelineDraft((current) => ({ ...current, title: value }))} />
              <div className="md:col-span-2"><FieldTextarea label="Notes" value={timelineDraft.notes} onChange={(value) => setTimelineDraft((current) => ({ ...current, notes: value }))} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={saveTimelineEntry} className="rounded-full bg-[#2f2417] px-4 py-2 text-sm font-semibold text-[#fef8ec]">حفظ</button>
              <button onClick={resetTimelineForm} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-4 py-2 text-sm font-semibold text-[#6f6044]">إلغاء</button>
            </div>
          </div>
        ) : null}
        {sortedTimeline.length === 0 ? <EmptyState message="لا توجد أحداث في التايم لاين بعد." /> : <div className="space-y-2">{sortedTimeline.map((entry) => <div key={entry.id} className="rounded-2xl border border-[#ead9b3] bg-white p-3 text-sm text-[#2f2417]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{entry.title || '—'}</div>
            <div className="flex gap-2">
              <button onClick={() => { setTimelineDraft(entry); setEditingTimelineId(entry.id); setShowTimelineForm(true); }} className="rounded-full border border-[#d8c08d] bg-[#fdf8ee] px-2.5 py-1 text-xs font-semibold text-[#6f6044]">تعديل</button>
              <button onClick={() => setData((current) => ({ ...current, timeline: current.timeline.filter((item) => item.id !== entry.id) }))} className="rounded-full border border-[#d8c08d] bg-[#fff0e0] px-2.5 py-1 text-xs font-semibold text-[#9a4b2d]">حذف</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f6044]">
            <span>{entry.date || '—'}</span>
            <span>{entry.type || '—'}</span>
          </div>
          {entry.notes ? <p className="mt-2 text-xs text-[#6f6044]">{entry.notes}</p> : null}
        </div>)}</div>}
      </SectionCard>
    </div>
  );
}
