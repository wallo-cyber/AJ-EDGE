"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CRMPage } from "./crm-shell";
import { CompanyDiscoveryWorkspace } from "./company-discovery-workspace";
import { simpleCrud, type SimpleRow } from "../lib/supabase/simple-crud";

type Tab = "discovery" | "enrichment" | "verification" | "manual";
const safe = (value: unknown) => String(value ?? "").trim();
// Marks a company as freshly researched only after a research/enrichment step succeeds for it.
const markCompanyResearched = async (companyId: unknown) => {
  const id = safe(companyId);
  if (!id) return;
  try {
    await simpleCrud.update("companies", id, {
      last_researched_at: new Date().toISOString(),
    });
  } catch {
    /* non-critical tracking field, do not block the main success flow */
  }
};
const tabs: Array<[Tab, string]> = [
  ["discovery", "اكتشاف"],
  ["enrichment", "استكمال البيانات"],
  ["verification", "مراجعة الأدلة"],
  ["manual", "قائمة البحث اليدوي"],
];

export function ResearchWorkspace() {
  const params = useSearchParams();
  const tab = (
    tabs.some(([id]) => id === params.get("tab")) ? params.get("tab") : "manual"
  ) as Tab;
  const [jobs, setJobs] = useState<SimpleRow[]>([]),
    [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [committeeCandidates, setCommitteeCandidates] = useState<SimpleRow[]>(
      [],
    ),
    [signalCandidates, setSignalCandidates] = useState<SimpleRow[]>([]);
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [priority, setPriority] = useState("الكل"),
    [sort, setSort] = useState("priority");
  const [selected, setSelected] = useState<SimpleRow | null>(null),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [resolution, setResolution] = useState({
    evidenceUrl: "",
    evidenceType: "Official Website",
    fact: "",
    contactName: "",
    title: "",
    email: "",
    phone: "",
    decisionMaker: false,
    confidence: "50",
    notes: "",
  });
  const [refreshDays, setRefreshDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  // Logs the raw Supabase error for a single load() query before it is swallowed into a generic message.
  const withLoadLog = async <T,>(label: string, promise: Promise<T>): Promise<T> => {
    try {
      return await promise;
    } catch (reason) {
      console.error(`[research:load:${label}]`, reason);
      throw reason;
    }
  };
  const load = async () => {
    setLoading(true);
    try {
      const [jobPage, companyPage, committeeRows, signalRows] =
        await Promise.all([
          withLoadLog(
            "agent_jobs",
            simpleCrud.page("agent_jobs", 1, 1000, {
              column: "status",
              value: "manual_research_required",
              order: "priority",
              ascending: false,
            }),
          ),
          withLoadLog(
            "companies",
            simpleCrud.page("companies", 1, 500, {
              order: "lead_score",
              ascending: false,
            }),
          ),
          withLoadLog(
            "buying_committee_members",
            simpleCrud.listWhere(
              "buying_committee_members",
              "verification_status",
              "needs_research",
            ),
          ),
          withLoadLog(
            "external_signals",
            simpleCrud.listWhere(
              "external_signals",
              "verification_status",
              "needs_research",
            ),
          ),
        ]);
      setJobs(jobPage.rows);
      setCompanies(companyPage.rows);
      setCommitteeCandidates(committeeRows);
      setSignalCandidates(signalRows);
    } catch (reason) {
      console.error("[research:load]", reason);
      const code =
        reason && typeof reason === "object" && "code" in reason
          ? String((reason as { code?: unknown }).code ?? "")
          : "";
      setError(
        (reason instanceof Error ? reason.message : "تعذر تحميل قائمة البحث.") +
          (code ? ` [${code}]` : ""),
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const storedDays = Number(localStorage.getItem("research-refresh-days") || 30);
    const days = [7, 30, 90].includes(storedDays) ? storedDays : 30;
    setRefreshDays(days);
    const last = Number(localStorage.getItem("research-last-refresh") || 0);
    if (!last || Date.now() - last >= days * 86400000) setNotice(`حان موعد تجديد البحث والتحقق الدوري (${days} يومًا).`);
  }, []);
  const companyById = useMemo(
    () => new Map(companies.map((row) => [row.id, row])),
    [companies],
  );
  const filtered = useMemo(
    () =>
      jobs.filter((job) => {
        const company = companyById.get(String(job.company_id));
        if (company && safe(company.archived_at)) return false;
        const text =
          `${safe(company?.company_name)} ${safe(job.agent_name)} ${safe(job.last_error)}`.toLowerCase();
        const rank = safe(company?.priority) || "C";
        return (
          (!query || text.includes(query.toLowerCase())) &&
          (priority === "الكل" || rank === priority)
        );
      }),
    [companyById, jobs, priority, query],
  );
  const grouped = useMemo(() => {
    const byCompany = new Map<string, SimpleRow[]>();
    filtered.forEach((job) => {
      const key = safe(job.company_id) || `general-${job.id}`;
      byCompany.set(key, [...(byCompany.get(key) ?? []), job]);
    });
    return [...byCompany.entries()]
      .map(([companyId, tasks]) => ({
        companyId,
        tasks,
        job: tasks[0],
        company: companyById.get(companyId),
      }))
      .sort((a, b) =>
        sort === "company"
          ? safe(a.company?.company_name).localeCompare(
              safe(b.company?.company_name),
              "ar",
            )
          : (safe(a.company?.priority) || "C").localeCompare(
              safe(b.company?.priority) || "C",
            ) ||
            Number(b.company?.lead_score ?? 0) -
              Number(a.company?.lead_score ?? 0) ||
            Number(a.company?.data_completeness ?? 0) -
              Number(b.company?.data_completeness ?? 0) ||
            safe(a.job.created_at).localeCompare(safe(b.job.created_at)),
      );
  }, [companyById, filtered, sort]);
  const pageSize = 25,
    totalPages = Math.max(1, Math.ceil(grouped.length / pageSize)),
    visible = grouped.slice((page - 1) * pageSize, page * pageSize);
  const approveCommitteeCandidate = async (item: SimpleRow) => {
    const sourceUrl = safe(item.source_url);
    if (!sourceUrl) {
      setError("لا يمكن اعتماد شخص دون مصدر موثق.");
      return;
    }
    const company = companyById.get(safe(item.company_id));
    setError("");
    try {
      const contact = await simpleCrud.create("contacts", {
        company_id: item.company_id,
        company_name: safe(company?.company_name),
        full_name: safe(item.name),
        name: safe(item.name),
        position: safe(item.position),
        department: safe(item.department),
        email: safe(item.email) || null,
        phone: safe(item.phone) || null,
        mobile: safe(item.phone),
        linkedin: safe(item.linkedin) || null,
        linked_in: safe(item.linkedin),
        decision_role: safe(item.position),
        decision_maker: true,
        contact_classification: "Decision Maker",
        verification_status: "VERIFIED",
        source: safe(item.source),
        source_url: sourceUrl,
        confidence: Number(item.verification_confidence || 0),
        verified_at: new Date().toISOString(),
        notes: "Human-approved from evidence review queue.",
      });
      await simpleCrud.update("buying_committee_members", item.id, {
        verification_status: "verified",
        contact_id: contact.id,
      });
      await simpleCrud.create("audit_events", {
        company_id: item.company_id,
        entity_type: "buying_committee_members",
        entity_id: item.id,
        action: "HUMAN_VERIFY_DECISION_MAKER",
        details: { source_url: sourceUrl },
      });
      setNotice(`تم اعتماد ${safe(item.name)} وربطه بملف الشركة.`);
      await markCompanyResearched(item.company_id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر اعتماد الشخص.");
    }
  };
  const rejectCommitteeCandidate = async (item: SimpleRow) => {
    try {
      await simpleCrud.update("buying_committee_members", item.id, {
        verification_status: "rejected",
      });
      await simpleCrud.create("audit_events", {
        company_id: item.company_id,
        entity_type: "buying_committee_members",
        entity_id: item.id,
        action: "HUMAN_REJECT_DECISION_MAKER",
        details: { source_url: safe(item.source_url) },
      });
      setNotice("تم رفض المرشح ولن يُحسب ضمن Decision Access.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر رفض المرشح.");
    }
  };
  const signalQualityReady = (item: SimpleRow) =>
    Number(item.entity_match_confidence || 0) >= 70 &&
    Number(item.geography_match_confidence || 0) >= 70 &&
    Number(item.freshness_confidence || 0) >= 50 &&
    Number(item.source_quality_confidence || 0) >= 60 &&
    Number(item.event_match_confidence || 0) >= 70;
  const reviewSignal = async (item: SimpleRow, approved: boolean) => {
    if (approved && !signalQualityReady(item)) {
      setError(
        "لا يمكن اعتماد الإشارة: لم تحقق بوابة تطابق الكيان + الموقع + الحدث + حداثة المصدر + جودة المصدر.",
      );
      return;
    }
    try {
      await simpleCrud.update("external_signals", item.id, {
        verification_status: approved ? "verified" : "rejected",
        reviewed_at: new Date().toISOString(),
        review_note: approved
          ? "Human-approved after quality gate"
          : "Rejected by human review",
        suggested_move: approved
          ? "Verified by human. Review before any opportunity or outreach action."
          : "Rejected by human review.",
      });
      await simpleCrud.create("audit_events", {
        company_id: item.company_id,
        entity_type: "external_signals",
        entity_id: item.id,
        action: approved ? "HUMAN_VERIFY_SIGNAL" : "HUMAN_REJECT_SIGNAL",
        details: {
          source_url: safe(item.source_url),
          quality_gate: signalQualityReady(item),
        },
      });
      setNotice(
        approved
          ? "تم اعتماد الإشارة، ولن تُنشأ Opportunity تلقائياً."
          : "تم رفض الإشارة.",
      );
      if (approved) await markCompanyResearched(item.company_id);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر تحديث الإشارة.",
      );
    }
  };

  const saveResolution = async (mode: "progress" | "resolved" | "unable") => {
    if (!selected) return;
    if (mode === "resolved" && !resolution.evidenceUrl.trim()) {
      setError("لا يمكن إنهاء المهمة دون رابط دليل.");
      return;
    }
    if (mode === "unable" && !resolution.notes.trim()) {
      setError("أدخل سبباً واضحاً لتعذر التحقق.");
      return;
    }
    setError("");
    try {
      await simpleCrud.update("agent_jobs", selected.id, {
        research_evidence_url: resolution.evidenceUrl,
        research_evidence_type: resolution.evidenceType,
        research_extracted_fact: resolution.fact,
        research_confidence: Number(resolution.confidence),
        research_notes: resolution.notes,
        research_resolution:
          mode === "unable"
            ? "UNABLE_TO_VERIFY"
            : mode === "resolved"
              ? "RESOLVED"
              : "IN_PROGRESS",
        ...(mode === "progress"
          ? {}
          : { status: "completed", completed_at: new Date().toISOString() }),
      });
      if (
        mode === "resolved" &&
        resolution.contactName.trim() &&
        selected.company_id
      )
        await simpleCrud.create("contacts", {
          company_id: selected.company_id,
          company_name: safe(
            companyById.get(String(selected.company_id))?.company_name,
          ),
          full_name: resolution.contactName,
          name: resolution.contactName,
          position: resolution.title,
          email: resolution.email || null,
          mobile: resolution.phone,
          decision_maker: resolution.decisionMaker,
          contact_classification: resolution.decisionMaker
            ? "Decision Maker"
            : "General Contact",
          verification_status: resolution.decisionMaker
            ? "VERIFIED"
            : "PARTIALLY_VERIFIED",
          source_url: resolution.evidenceUrl,
          source: resolution.evidenceType,
          verified_at: resolution.decisionMaker
            ? new Date().toISOString()
            : null,
          confidence: Number(resolution.confidence),
          notes: resolution.notes,
        });
      setNotice(
        mode === "progress"
          ? "تم حفظ التقدم."
          : "تم إغلاق مهمة البحث مع حفظ الدليل.",
      );
      if (mode === "resolved") await markCompanyResearched(selected.company_id);
      setSelected(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر حفظ نتيجة البحث.",
      );
    }
  };

  // Archived companies never get renewed jobs so they cannot resurface in the research queue.
  const activeJobs = jobs.filter((job) => {
    const company = companyById.get(String(job.company_id));
    return !(company && safe(company.archived_at));
  });
  const staleJobs = activeJobs.filter((job) => {
    const timestamp = Date.parse(safe(job.updated_at || job.created_at));
    return !timestamp || Date.now() - timestamp >= refreshDays * 86400000;
  });
  const refreshResearch = async () => {
    const targets = staleJobs.length ? staleJobs : activeJobs;
    if (!targets.length) { setNotice("لا توجد مهام بحث لتجديدها حاليًا."); return; }
    const retireOld = window.confirm(`سيتم إنشاء ${targets.length} مهمة بحث محدثة. هل تريد إزالة المهام القديمة من القائمة بعد التجديد؟\n\nموافق = إزالة القديم\nإلغاء = الاحتفاظ بالقديم`);
    setRefreshing(true); setError("");
    try {
      for (const job of targets) {
        await simpleCrud.create("agent_jobs", { company_id:job.company_id || null, agent_name:safe(job.agent_name), status:"manual_research_required", priority:Number(job.priority || 50), payload:job.payload || {}, result:{}, attempts:0, max_attempts:Number(job.max_attempts || 3), scheduled_at:new Date().toISOString(), last_error:safe(job.last_error) });
        if (retireOld) await simpleCrud.update("agent_jobs", job.id, { status:"cancelled", completed_at:new Date().toISOString(), result:{ renewal:"REPLACED_BY_PERIODIC_REFRESH" } });
      }
      localStorage.setItem("research-last-refresh", String(Date.now()));
      localStorage.setItem("research-refresh-days", String(refreshDays));
      setNotice(`تم تجديد ${targets.length} مهمة بحث.${retireOld ? " وأزيلت النسخ القديمة من القائمة." : " وتم الاحتفاظ بالنسخ القديمة حسب اختيارك."}`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تجديد مهام البحث."); }
    finally { setRefreshing(false); }
  };

  return (
    <CRMPage
      title="البحث"
      description="بحث خارجي موجّه بالدليل للوصول إلى صناع القرار والإشارات التجارية، مع اعتماد بشري إلزامي للنتائج غير المؤكدة."
    >
      <section className="crm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[var(--nav-accent)]">التجديد الدوري</p><h2 className="text-lg font-bold">تحديث البحث والتحقق</h2><p className="mt-1 text-sm text-[#8f96a3]">يظهر تنبيه عند حلول الموعد، ولا تُزال النتائج القديمة إلا بعد سؤالك.</p></div><div className="flex flex-wrap items-center gap-2"><select value={refreshDays} onChange={(event)=>{const days=Number(event.target.value);setRefreshDays(days);localStorage.setItem("research-refresh-days",String(days))}} className="rounded-xl border p-2"><option value={7}>كل 7 أيام</option><option value={30}>كل 30 يومًا</option><option value={90}>كل 90 يومًا</option></select><span className="crm-chip status-warning">{staleJobs.length} قديمة</span><button disabled={refreshing} onClick={()=>void refreshResearch()} className="btn-primary">{refreshing?"جارٍ التجديد…":"تجديد البحث الآن"}</button></div></div>
      </section>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="crm-card p-3">
          <span className="crm-chip status-success">Brave Search · نشط</span>
          <p className="mt-2 text-xs text-[#75664d]">
            بحث موجّه حسب الدور، والمصدر محفوظ مع كل نتيجة.
          </p>
        </div>
        <div className="crm-card p-3">
          <span className="crm-chip status-warning">
            مرشحو الأشخاص · {committeeCandidates.length}
          </span>
          <p className="mt-2 text-xs text-[#75664d]">
            لا يُحسبون Decision Access قبل اعتمادك.
          </p>
        </div>
        <div className="crm-card p-3">
          <span className="crm-chip status-warning">
            إشارات للمراجعة · {signalCandidates.length}
          </span>
          <p className="mt-2 text-xs text-[#75664d]">
            لا تتحول إلى Opportunity تلقائياً.
          </p>
        </div>
        <div className="crm-card p-3">
          <span className="crm-chip status-neutral">
            بحث يدوي · {jobs.length}
          </span>
          <p className="mt-2 text-xs text-[#75664d]">
            للحالات التي لم يصل فيها البحث الخارجي لدليل كافٍ.
          </p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-[#f7efdf] p-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/research?tab=${id}`}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? "bg-[#2f2417] text-white" : "bg-white text-[#6f6044]"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {notice && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {tab === "discovery" && <CompanyDiscoveryWorkspace />}
      {tab === "enrichment" && (
        <section className="crm-card p-4">
          <h3 className="font-bold">الشركات التي تحتاج جهة اتصال</h3>
          <p className="mt-1 text-sm text-[#75664d]">
            مرتبة حسب Priority ثم Lead Score. لا يتم تشغيل بحث خارجي من هذه
            الشاشة.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {companies
              .filter((c) => !safe(c.archived_at))
              .filter((c) =>
                safe(c.next_action).toLowerCase().includes("decision maker"),
              )
              .slice(0, 50)
              .map((c) => (
                <Link
                  href={`/companies/${c.id}`}
                  key={c.id}
                  className="rounded-xl border bg-white p-3"
                >
                  <strong>{safe(c.company_name)}</strong>
                  <p className="text-xs text-[#75664d]">
                    Priority {safe(c.priority)} · {safe(c.next_action)}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      )}
      {tab === "verification" && (
        <section className="space-y-4">
          <div className="crm-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold">مرشحو Buying Committee</h3>
                <p className="mt-1 text-sm text-[#75664d]">
                  افتح المصدر أولاً. الاعتماد هو Human Gate الذي ينشئ Contact
                  موثقاً.
                </p>
              </div>
              <span className="crm-chip status-warning">
                {committeeCandidates.length} يحتاج مراجعة
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {committeeCandidates.map((item) => {
                const company = companyById.get(safe(item.company_id));
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong>{safe(item.name) || "مرشح غير مسمى"}</strong>
                        <p className="mt-1 text-sm text-[#75664d]">
                          {safe(item.position) || "دور غير مكتمل"} ·{" "}
                          {safe(item.committee_role)}
                        </p>
                        <p className="mt-1 text-xs">
                          {safe(company?.company_name) || "شركة غير معروفة"} ·
                          Confidence {Number(item.verification_confidence || 0)}
                          %
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {safe(item.source_url) && (
                          <a
                            href={safe(item.source_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                          >
                            فتح المصدر
                          </a>
                        )}
                        <button
                          onClick={() => void approveCommitteeCandidate(item)}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
                        >
                          اعتماد
                        </button>
                        <button
                          onClick={() => void rejectCommitteeCandidate(item)}
                          className="rounded-xl bg-red-700 px-3 py-2 text-sm font-bold text-white"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!committeeCandidates.length && (
                <div className="crm-empty">
                  لا يوجد مرشحون يحتاجون مراجعة حالياً.
                </div>
              )}
            </div>
          </div>
          <div className="crm-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold">External Signal Review</h3>
                <p className="mt-1 text-sm text-[#75664d]">
                  اعتماد الإشارة يؤكدها فقط؛ لا ينشئ Opportunity ولا يرسل أي
                  تواصل.
                </p>
              </div>
              <span className="crm-chip status-warning">
                {signalCandidates.length} إشارة
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {signalCandidates.map((item) => {
                const company = companyById.get(safe(item.company_id));
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <strong>
                            {safe(item.title) || safe(item.signal_type)}
                          </strong>
                          <span className="crm-chip status-neutral">
                            {safe(item.signal_type)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">
                          {safe(company?.company_name) || "شركة غير معروفة"}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-[#75664d]">
                          {safe(item.summary).slice(0, 500)}
                        </p>
                        <p className="mt-1 text-xs">
                          Confidence {Number(item.verification_confidence || 0)}
                          % · {safe(item.source_provider)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                          <span className="crm-chip status-neutral">
                            Entity {Number(item.entity_match_confidence || 0)}
                          </span>
                          <span className="crm-chip status-neutral">
                            Geo {Number(item.geography_match_confidence || 0)}
                          </span>
                          <span className="crm-chip status-neutral">
                            Event {Number(item.event_match_confidence || 0)}
                          </span>
                          <span className="crm-chip status-neutral">
                            Fresh {Number(item.freshness_confidence || 0)}
                          </span>
                          <span className="crm-chip status-neutral">
                            Source {Number(item.source_quality_confidence || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {safe(item.source_url) && (
                          <a
                            href={safe(item.source_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                          >
                            فتح المصدر
                          </a>
                        )}
                        <button
                          disabled={!signalQualityReady(item)}
                          onClick={() => void reviewSignal(item, true)}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          اعتماد الإشارة
                        </button>
                        <button
                          onClick={() => void reviewSignal(item, false)}
                          className="rounded-xl bg-red-700 px-3 py-2 text-sm font-bold text-white"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!signalCandidates.length && (
                <div className="crm-empty">
                  لا توجد إشارات تحتاج مراجعة حالياً.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "manual" && (
        <>
          <div className="crm-card grid gap-2 p-3 md:grid-cols-4">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالشركة أو المهمة"
              className="rounded-xl border p-2"
            />
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border p-2"
            >
              <option>الكل</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border p-2"
            >
              <option value="priority">الأولوية ثم النقص</option>
              <option value="company">اسم الشركة</option>
            </select>
            <div className="rounded-xl bg-amber-50 p-2 text-center text-sm font-bold text-amber-800">
              {grouped.length} شركة · {filtered.length} مهمة محفوظة
            </div>
          </div>
          {loading ? (
            <div className="crm-empty animate-pulse">
              جارٍ تحميل قائمة البحث…
            </div>
          ) : (
            <div className="grid gap-2">
              {visible.map((item) => (
                <article
                  key={item.companyId}
                  className="crm-card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>
                        {safe(item.company?.company_name) || "مهمة عامة"}
                      </strong>
                      <span className="crm-chip status-warning">
                        أولوية {safe(item.company?.priority) || "C"}
                      </span>
                      <span className="crm-chip status-neutral">
                        {item.tasks.length} مهام
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#75664d]">
                      {[
                        ...new Set(
                          item.tasks.map((job) => safe(job.agent_name)),
                        ),
                      ].join("، ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelected(item.job)}
                      className="btn-primary"
                    >
                      بحث يدوي
                    </button>
                    {item.company && (
                      <Link
                        href={`/companies/${item.company.id}`}
                        className="btn-ghost"
                      >
                        فتح الشركة
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((v) => v - 1)}
                className="btn-ghost disabled:opacity-40"
              >
                السابق
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((v) => v + 1)}
                className="btn-ghost disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        </>
      )}
      {selected && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-3">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5">
            <h3 className="font-bold">
              حل مهمة البحث —{" "}
              {safe(companyById.get(String(selected.company_id))?.company_name)}
            </h3>
            <p className="mt-1 text-xs text-[#75664d]">
              المطلوب: {safe(selected.last_error) || safe(selected.agent_name)}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                value={resolution.evidenceUrl}
                onChange={(e) =>
                  setResolution({ ...resolution, evidenceUrl: e.target.value })
                }
                placeholder="Evidence URL *"
                className="rounded-xl border p-2"
              />
              <select
                value={resolution.evidenceType}
                onChange={(e) =>
                  setResolution({ ...resolution, evidenceType: e.target.value })
                }
                className="rounded-xl border p-2"
              >
                <option>Official Website</option>
                <option>Vendor Portal</option>
                <option>LinkedIn</option>
                <option>Public Directory</option>
                <option>Other</option>
              </select>
              <textarea
                value={resolution.fact}
                onChange={(e) =>
                  setResolution({ ...resolution, fact: e.target.value })
                }
                placeholder="المعلومة المستخرجة"
                className="rounded-xl border p-2 md:col-span-2"
              />
              <input
                value={resolution.contactName}
                onChange={(e) =>
                  setResolution({ ...resolution, contactName: e.target.value })
                }
                placeholder="اسم الشخص"
                className="rounded-xl border p-2"
              />
              <input
                value={resolution.title}
                onChange={(e) =>
                  setResolution({ ...resolution, title: e.target.value })
                }
                placeholder="المنصب"
                className="rounded-xl border p-2"
              />
              <input
                value={resolution.email}
                onChange={(e) =>
                  setResolution({ ...resolution, email: e.target.value })
                }
                placeholder="البريد"
                className="rounded-xl border p-2"
              />
              <input
                value={resolution.phone}
                onChange={(e) =>
                  setResolution({ ...resolution, phone: e.target.value })
                }
                placeholder="الهاتف"
                className="rounded-xl border p-2"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={resolution.decisionMaker}
                  onChange={(e) =>
                    setResolution({
                      ...resolution,
                      decisionMaker: e.target.checked,
                    })
                  }
                />{" "}
                صانع قرار
              </label>
              <label className="text-sm">
                Confidence {resolution.confidence}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={resolution.confidence}
                  onChange={(e) =>
                    setResolution({ ...resolution, confidence: e.target.value })
                  }
                  className="w-full"
                />
              </label>
              <textarea
                value={resolution.notes}
                onChange={(e) =>
                  setResolution({ ...resolution, notes: e.target.value })
                }
                placeholder="ملاحظات أو سبب تعذر التحقق"
                className="rounded-xl border p-2 md:col-span-2"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void saveResolution("progress")}
                className="rounded-xl border px-4 py-2"
              >
                حفظ التقدم
              </button>
              <button
                onClick={() => void saveResolution("resolved")}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
              >
                إنهاء المهمة
              </button>
              <button
                onClick={() => void saveResolution("unable")}
                className="rounded-xl bg-amber-700 px-4 py-2 text-white"
              >
                Unable to Verify
              </button>
              <button
                onClick={() => setSelected(null)}
                className="mr-auto rounded-xl border px-4 py-2"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </CRMPage>
  );
}
