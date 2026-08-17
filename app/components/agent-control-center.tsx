"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CRMPage } from "./crm-shell";
import { simpleCrud, type SimpleRow } from "../lib/supabase/simple-crud";
import { getSupabaseClient } from "../lib/supabase/client";
import {
  AGENT_NAMES,
  agentRequiresCompany,
  type AgentName,
} from "../lib/agents/orchestrator";
import { companyOutreachState } from "../lib/domain/business";
import { AGENT_TEAMS, type AgentTeam } from "../lib/intelligence/v6";
import { FeedbackControls } from "./feedback-controls";

const safe = (value: unknown) => String(value ?? "").trim();
const INTERNAL_RESEARCH_AGENTS = new Set<AgentName>([
  "Verification",
  "Enrichment",
  "Decision Maker",
  "Vendor Registration",
  "Discovery adapter",
]);
const AGENT_PURPOSE: Record<AgentName, string> = {
  Supervisor: "يوزع الأعمال الداخلية الآمنة ويمنع التكرار",
  Verification: "يتحقق من البيانات المحفوظة ومصادرها",
  Enrichment: "يحدد حقول الشركة الناقصة",
  "Decision Maker": "يرتب البحث عن الشخص الصحيح دون اختلاق بيانات",
  Qualification: "يصنف الشركة ويحسب أهليتها",
  "Vendor Registration": "يجهز مسار تسجيل الموردين",
  "Outreach Draft": "يجهز مسودة عند توفر بيانات كافية",
  "Follow-up": "يخطط المتابعة من الأحداث الفعلية",
  Opportunity: "يحول النتيجة المؤهلة إلى فرصة",
  "Daily Planner": "يرتب إجراءات اليوم",
  "Discovery adapter": "يدير مدخلات الاكتشاف الداخلية",
};
const TEAM_LABELS: Record<AgentTeam, string> = {
  RESEARCH: "فريق البحث",
  STRATEGY: "فريق الاستراتيجية",
  OUTREACH: "فريق التواصل",
  COMMERCIAL: "الفريق التجاري",
  SUPERVISOR: "الإشراف",
};
const TEAM_RUNTIME: Record<AgentTeam, readonly AgentName[]> = {
  RESEARCH: [
    "Verification",
    "Enrichment",
    "Decision Maker",
    "Discovery adapter",
  ],
  STRATEGY: ["Qualification", "Daily Planner"],
  OUTREACH: ["Outreach Draft", "Follow-up"],
  COMMERCIAL: ["Vendor Registration", "Opportunity"],
  SUPERVISOR: ["Supervisor"],
};

export function AgentControlCenter() {
  const [settings, setSettings] = useState<SimpleRow[]>([]);
  const [jobs, setJobs] = useState<SimpleRow[]>([]);
  const [runs, setRuns] = useState<SimpleRow[]>([]);
  const [logs, setLogs] = useState<SimpleRow[]>([]);
  const [errors, setErrors] = useState<SimpleRow[]>([]);
  const [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [contacts, setContacts] = useState<SimpleRow[]>([]);
  const [intelligence, setIntelligence] = useState<SimpleRow[]>([]);
  const [messages, setMessages] = useState<SimpleRow[]>([]);
  const [events, setEvents] = useState<SimpleRow[]>([]);
  const [selected, setSelected] = useState("");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const detailsRef = useRef<HTMLElement>(null);
  const load = useCallback(
    () =>
      Promise.all([
        simpleCrud.page("agent_settings", 1, 50),
        simpleCrud.page("agent_jobs", 1, 2500, { order: "created_at" }),
        simpleCrud.page("agent_runs", 1, 100, { order: "started_at" }),
        simpleCrud.page("agent_logs", 1, 100, {
          column: "agent_name",
          value: selected,
          order: "created_at",
        }),
        simpleCrud.page("agent_errors", 1, 250, { order: "created_at" }),
        simpleCrud.page("companies", 1, 500, { order: "lead_score" }),
        simpleCrud.page("contacts", 1, 500, { order: "created_at" }),
        simpleCrud.page("company_intelligence", 1, 500, {
          order: "created_at",
        }),
        simpleCrud.page("messages", 1, 1000, { order: "created_at" }),
        simpleCrud.page("communication_events", 1, 1000, {
          order: "occurred_at",
        }),
      ])
        .then(([a, b, c, d, e, f, g, h, i, j]) => {
          setSettings(a.rows);
          setJobs(b.rows);
          setRuns(c.rows);
          setLogs(d.rows);
          setErrors(e.rows);
          setCompanies(f.rows);
          setContacts(g.rows);
          setIntelligence(h.rows);
          setMessages(i.rows);
          setEvents(j.rows);
        })
        .finally(() => setLoading(false)),
    [selected],
  );
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    void getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled || !data.user) return;
        void load();
        timer = window.setInterval(() => void load(), 30000);
      });
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [load]);
  const global = settings.find((item) => item.agent_name === "_global");
  const today = new Date().toISOString().slice(0, 10);
  const readyForOutreach = companies.filter((company) =>
    ["DRAFT_READY", "APPROVED"].includes(
      companyOutreachState(company, contacts, messages, events),
    ),
  ).length;
  const operationalMetrics = [
    ["في الانتظار", jobs.filter((job) => job.status === "queued").length],
    ["يعمل الآن", jobs.filter((job) => job.status === "running").length],
    ["مكتمل", jobs.filter((job) => job.status === "completed").length],
    ["فشل", jobs.filter((job) => job.status === "failed").length],
    [
      "شركات مستكملة",
      new Set(intelligence.map((row) => safe(row.company_id)).filter(Boolean))
        .size,
    ],
    [
      "صناع قرار موثقون",
      contacts.filter(
        (contact) =>
          contact.decision_maker === true &&
          contact.verification_status === "VERIFIED" &&
          Boolean(contact.source_url || contact.source),
      ).length,
    ],
    [
      "بوابات موردين",
      companies.filter((company) => safe(company.vendor_registration_url))
        .length,
    ],
    ["جاهز للتواصل", readyForOutreach],
    [
      "بحث يدوي مطلوب",
      jobs.filter((job) => job.status === "manual_research_required").length,
    ],
  ];
  const rows = useMemo(
    () =>
      AGENT_NAMES.map((name) => {
        const setting = settings.find((item) => item.agent_name === name);
        const ownJobs = jobs.filter((job) => job.agent_name === name);
        return {
          name,
          setting,
          queued: ownJobs.filter((job) => job.status === "queued").length,
          running: ownJobs.filter((job) => job.status === "running").length,
          completed: ownJobs.filter(
            (job) =>
              job.status === "completed" &&
              safe(job.completed_at).startsWith(today),
          ).length,
          failed: ownJobs.filter((job) => job.status === "failed").length,
          last: safe(setting?.last_run_at),
          next: safe(setting?.next_run_at),
        };
      }),
    [jobs, settings, today],
  );
  const updateSetting = async (
    row: SimpleRow | undefined,
    values: Record<string, unknown>,
  ) => {
    if (!row) return;
    await simpleCrud.update("agent_settings", row.id, values);
    await load();
  };
  const runNow = async (name: AgentName) => {
    const companyAgents = agentRequiresCompany(name);
    const company = companyAgents
      ? companies.find((item) => item.id === targetCompanyId)
      : undefined;
    if (companyAgents && !company) {
      setNotice("اختر شركة محددة قبل تشغيل هذا الوكيل.");
      return;
    }
    const duplicate = jobs.some(
      (job) =>
        job.agent_name === name &&
        job.company_id === (company?.id ?? null) &&
        ["queued", "running"].includes(safe(job.status)),
    );
    if (duplicate) {
      setNotice("المهمة موجودة بالفعل في قائمة المعالجة.");
      return;
    }
    await simpleCrud.create("agent_jobs", {
      agent_name: name,
      company_id: company?.id ?? null,
      priority: company?.priority === "A" ? 100 : 80,
      payload: {
        source: "control_center",
        mode: "internal",
        company_name: company?.company_name ?? null,
      },
    });
    setNotice(`تمت إضافة ${name} للمعالجة الداخلية.`);
    await load();
  };
  const pauseAll = async (emergency = false) => {
    await Promise.all(
      settings.map((setting) =>
        simpleCrud.update("agent_settings", setting.id, {
          paused: true,
          ...(emergency ? { enabled: false } : {}),
        }),
      ),
    );
    setNotice(
      emergency
        ? "تم إيقاف الوكلاء مع الاحتفاظ بجميع المهام المحفوظة."
        : "تم إيقاف جميع الوكلاء مؤقتاً.",
    );
    await load();
  };
  const resumeAll = async () => {
    await Promise.all(
      settings.map((setting) =>
        simpleCrud.update("agent_settings", setting.id, {
          paused: false,
          enabled: true,
        }),
      ),
    );
    setNotice(
      "تم تشغيل الوكلاء. البحث الخارجي يعمل عبر Brave مع بوابة تحقق بشرية.",
    );
    await load();
  };
  const retryFailed = async (name?: string) => {
    const failed = jobs.filter(
      (job) =>
        job.status === "failed" &&
        Number(job.attempts ?? 0) < Number(job.max_attempts ?? 3) &&
        (!name || job.agent_name === name),
    );
    await Promise.all(
      failed.map((job) =>
        simpleCrud.update("agent_jobs", job.id, {
          status: "queued",
          scheduled_at: new Date().toISOString(),
        }),
      ),
    );
    setNotice(`تمت إعادة ${failed.length} مهمة إلى Queue.`);
    await load();
  };
  const openDetails = (name: AgentName) => {
    setSelected(name);
    window.requestAnimationFrame(() =>
      detailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
  };

  return (
    <CRMPage
      title="مركز الوكلاء"
      description="مراقبة وتشغيل الوكلاء الخلفيين عبر Supabase Queues وCron — العمل مستمر حتى عند إغلاق المتصفح."
    >
      <div className="crm-card flex flex-wrap items-center gap-2 p-4">
        <span
          className={`crm-chip ${global?.enabled && !global?.paused ? "status-success" : "status-danger"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${global?.enabled && !global?.paused ? "bg-emerald-500" : "bg-red-500"}`}
          />{" "}
          الوكلاء الداخليون{" "}
          {global?.enabled && !global?.paused ? "نشطون" : "متوقفون"}
        </span>
        <span className="ml-auto text-xs text-[#75664d]">
          تشغيل آمن من الخادم
        </span>
        <button onClick={() => void resumeAll()} className="btn-primary">
          تشغيل الداخليين
        </button>
        <button onClick={() => void pauseAll()} className="btn-ghost">
          إيقاف مؤقت
        </button>
        <button onClick={() => void retryFailed()} className="btn-ghost">
          إعادة المتعثرة
        </button>
        <button onClick={() => void pauseAll(true)} className="btn-danger">
          إيقاف طارئ
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="crm-kpi">
          <p className="text-xs text-[#75664d]">النظام</p>
          <strong className="mt-2 block">نوفافيرك متصل</strong>
        </div>
        <div className="crm-kpi">
          <p className="text-xs text-[#75664d]">الوكلاء الداخليون</p>
          <strong className="mt-2 block text-emerald-700">جاهزون للعمل</strong>
        </div>
        <div className="crm-kpi">
          <p className="text-xs text-[#75664d]">البحث الخارجي</p>
          <strong className="mt-2 block text-amber-700">بانتظار مزود</strong>
        </div>
        <div className="crm-kpi">
          <p className="text-xs text-[#75664d]">التواصل الخارجي</p>
          <strong className="mt-2 block text-stone-700">معطّل</strong>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {operationalMetrics.map(([label, count]) => (
          <div key={String(label)} className="crm-kpi">
            <p className="text-xs font-semibold text-[#75664d]">{label}</p>
            <strong className="mt-2 block text-3xl">{count}</strong>
          </div>
        ))}
      </div>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {(Object.keys(TEAM_RUNTIME) as AgentTeam[]).map((team) => {
          const names = TEAM_RUNTIME[team],
            teamJobs = jobs.filter((job) =>
              names.includes(job.agent_name as AgentName),
            ),
            running = teamJobs.filter((job) => job.status === "running").length,
            waiting = teamJobs.filter((job) => job.status === "queued").length,
            manual = teamJobs.filter(
              (job) => job.status === "manual_research_required",
            ).length,
            failed = teamJobs.filter((job) => job.status === "failed").length;
          const state = running
            ? "ACTIVE"
            : waiting
              ? "WAITING"
              : failed
                ? "BLOCKED"
                : manual
                  ? "PAUSED"
                  : "IDLE";
          return (
            <article key={team} className="crm-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{TEAM_LABELS[team]}</h3>
                <span
                  className={`crm-chip ${state === "ACTIVE" ? "status-success" : state === "BLOCKED" ? "status-danger" : "status-neutral"}`}
                >
                  {state}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#75664d]">
                {AGENT_TEAMS[team].join(" · ")}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                <div className="rounded-lg bg-blue-50 p-2">
                  <b className="block">{running}</b>يعمل
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <b className="block">{waiting + manual}</b>ينتظر
                </div>
                <div className="rounded-lg bg-red-50 p-2">
                  <b className="block">{failed}</b>تعطل
                </div>
              </dl>
              {manual > 0 && (
                <p className="mt-2 text-xs text-amber-800">
                  {manual} مهمة تنتظر بحثاً يدوياً؛ لا تُعد فشلاً للنظام.
                </p>
              )}
            </article>
          );
        })}
      </section>
      {notice && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      <div className="crm-card p-4">
        <label className="text-sm font-semibold">
          الشركة المستهدفة للتشغيل اليدوي
          <select
            value={targetCompanyId}
            onChange={(event) => setTargetCompanyId(event.target.value)}
            className="mt-2 block w-full max-w-lg rounded-xl border p-2"
          >
            <option value="">اختر شركة قبل تشغيل وكيل مرتبط بشركة</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {safe(company.company_name)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="crm-empty animate-pulse">
          جارٍ تحميل حالة الوكلاء...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const enabled = Boolean(row.setting?.enabled),
              paused = Boolean(row.setting?.paused),
              active = enabled && !paused;
            const status =
              !enabled || paused
                ? "متوقف"
                : row.running > 0
                  ? "يعمل الآن"
                  : row.queued > 0
                    ? "بانتظار التنفيذ"
                    : row.failed > 0
                      ? "يحتاج تدخلاً"
                      : "جاهز وينتظر عملاً";
            return (
              <article
                key={row.name}
                className={`crm-card p-4 ${selected === row.name ? "ring-2 ring-[#b78d38]/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{row.name}</h3>
                    <p className="mt-1 text-xs text-[#75664d]">
                      {AGENT_PURPOSE[row.name]}
                    </p>
                    <span
                      className={`crm-chip mt-2 ${active ? "status-success" : row.failed > 0 ? "status-danger" : "status-warning"}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-[#f7efdf] px-3 py-2 text-center">
                    <strong className="block text-xl">{row.queued}</strong>
                    <span className="text-[10px] text-[#75664d]">
                      في الانتظار
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-blue-50 p-2">
                    <strong className="block text-lg text-blue-800">
                      {row.running}
                    </strong>
                    يعمل
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2">
                    <strong className="block text-lg text-emerald-800">
                      {row.completed}
                    </strong>
                    أنجز اليوم
                  </div>
                  <div className="rounded-xl bg-red-50 p-2">
                    <strong className="block text-lg text-red-700">
                      {row.failed}
                    </strong>
                    فشل
                  </div>
                </div>
                <dl className="mt-4 space-y-2 border-t border-[#eee3cd] pt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#75664d]">آخر تشغيل</dt>
                    <dd>
                      {row.last
                        ? new Date(row.last).toLocaleString("ar-SA")
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#75664d]">التشغيل القادم</dt>
                    <dd>
                      {row.next
                        ? new Date(row.next).toLocaleString("ar-SA")
                        : safe(row.setting?.schedule) || "عند وصول عمل"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#75664d]">مزود خارجي</dt>
                    <dd>
                      {INTERNAL_RESEARCH_AGENTS.has(row.name)
                        ? "غير متاح — يتحول لبحث يدوي"
                        : "غير مطلوب"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void runNow(row.name)}
                    className="btn-primary"
                  >
                    تشغيل داخلي
                  </button>
                  <button
                    onClick={() =>
                      void updateSetting(row.setting, {
                        paused: !row.setting?.paused,
                      })
                    }
                    className="btn-ghost"
                  >
                    {row.setting?.paused ? "استئناف" : "إيقاف مؤقت"}
                  </button>
                  <button
                    onClick={() => openDetails(row.name)}
                    className="btn-ghost"
                    aria-controls="agent-advanced-details"
                    aria-expanded={selected === row.name}
                  >
                    التفاصيل المتقدمة
                  </button>
                  {row.setting?.id ? (
                    <FeedbackControls
                      targetType="AGENT_RESULT"
                      targetId={String(row.setting.id)}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <section
        ref={detailsRef}
        id="agent-advanced-details"
        className="crm-card scroll-mt-6 p-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold">تفاصيل وسجل الوكيل — {selected}</h3>
          <span className="crm-chip bg-[#f4ead7] text-[#6c5225]">
            السجل المباشر
          </span>
        </div>
        <div className="mt-3 max-h-80 overflow-y-auto text-xs">
          {logs
            .filter((log) => log.agent_name === selected)
            .slice(0, 100)
            .map((log) => (
              <div key={log.id} className="border-b border-[#eee3cd] py-3">
                <span className="text-[#9a7b2f]">
                  {safe(log.created_at)} · {safe(log.level)}
                </span>
                <p className="mt-1">{safe(log.message)}</p>
              </div>
            ))}
          {!logs.some((log) => log.agent_name === selected) && (
            <div className="crm-empty">لا توجد سجلات بعد.</div>
          )}
        </div>
        {errors.some(
          (error) => error.agent_name === selected && !error.resolved,
        ) && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            أخطاء غير محلولة:{" "}
            {
              errors.filter(
                (error) => error.agent_name === selected && !error.resolved,
              ).length
            }
          </p>
        )}
      </section>
      <p className="text-xs text-[#6f6044]">
        Runs المسجلة: {runs.length} · تحديث تلقائي كل 30 ثانية.
      </p>
    </CRMPage>
  );
}
