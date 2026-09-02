"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CRMPage } from "./crm-shell";
import { simpleCrud, type SimpleRow } from "../lib/supabase/simple-crud";
import { signalPriority } from "../lib/acquisition-os/core";

// تجريد دفاعي لوسوم HTML: صفوف قديمة في قاعدة البيانات خُزّنت بوسوم <strong> من Brave.
const s = (v: unknown) => String(v ?? "").replace(/<[^>]*>/g, "").trim();

export function ProjectRadar() {
  const [signals, setSignals] = useState<SimpleRow[]>([]),
    [projects, setProjects] = useState<SimpleRow[]>([]),
    [companies, setCompanies] = useState<SimpleRow[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    // Defaults to REVIEW so rejected signals never show up without an explicit choice.
    [filter, setFilter] = useState<"ALL" | "VERIFIED" | "REVIEW" | "REJECTED">("REVIEW");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        simpleCrud.page("external_signals", 1, 1500, { order: "detected_at" }),
        simpleCrud.page("projects", 1, 1000, { order: "updated_at" }),
        simpleCrud.page("companies", 1, 1500, { order: "lead_score" }),
      ]);
      setSignals(a.rows);
      setProjects(b.rows);
      setCompanies(c.rows);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل Project Radar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const companyById = useMemo(
    () => new Map(companies.map((c) => [s(c.id), c])),
    [companies],
  );
  const linked = useMemo(
    () => new Set(projects.map((p) => s(p.source_signal_id)).filter(Boolean)),
    [projects],
  );
  const rows = useMemo(
    () =>
      signals
        .map((signal) => ({
          signal,
          score: signalPriority(signal),
          linked: linked.has(s(signal.id)),
        }))
        .filter((x) => {
          const status = s(x.signal.verification_status);
          if (filter === "ALL") return true;
          if (filter === "VERIFIED") return status === "verified";
          if (filter === "REJECTED") return status === "rejected";
          return status !== "verified" && status !== "rejected";
        })
        .sort(
          (a, b) => Number(a.linked) - Number(b.linked) || b.score - a.score,
        ),
    [signals, linked, filter],
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter]);

  const visibleIds = rows.map((r) => s(r.signal.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }
  async function bulkDelete() {
    if (!selectedIds.size) return;
    if (
      !confirm(
        `حذف ${selectedIds.size} إشارة نهائيًا من الرادار؟ لا يمكن التراجع.`,
      )
    )
      return;
    setBulkDeleting(true);
    setError("");
    try {
      await Promise.all(
        [...selectedIds].map((id) => simpleCrud.remove("external_signals", id)),
      );
      setNotice(`تم حذف ${selectedIds.size} إشارة.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حذف بعض الإشارات المحددة.");
    } finally {
      setBulkDeleting(false);
    }
  }
  async function removeOne(id: string) {
    if (!confirm("حذف هذه الإشارة نهائيًا من الرادار؟")) return;
    setError("");
    try {
      await simpleCrud.remove("external_signals", id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحذف.");
    }
  }

  const create = async (signal: SimpleRow) => {
    if (s(signal.verification_status) !== "verified") {
      setError("لا يمكن تحويل Signal غير معتمد إلى Project Candidate.");
      return;
    }
    if (linked.has(s(signal.id))) {
      setError("هذه الإشارة مرتبطة بمشروع بالفعل.");
      return;
    }
    try {
      const c = companyById.get(s(signal.company_id));
      const p = await simpleCrud.create("projects", {
        project_name:
          s(signal.title) || `Project Candidate — ${s(c?.company_name)}`,
        owner_company_id: s(signal.company_id) || null,
        source_signal_id: signal.id,
        project_type: s(signal.signal_type) || "UNCLASSIFIED",
        sector: s(c?.sector),
        city: s(c?.city),
        stage: "CANDIDATE",
        route_to_revenue: "UNDEFINED",
        verification_status: "needs_research",
        verification_confidence: 0,
        source_url: s(signal.source_url),
        why_now: s(signal.summary) || s(signal.title),
        last_signal_at:
          s(signal.detected_at) || s(signal.event_date) ||
          new Date().toISOString(),
        next_action:
          "تحقق من المشروع ثم ارسم Owner / Consultant / Main Contractor",
      });
      if (signal.company_id)
        await simpleCrud.create("project_entities", {
          project_id: p.id,
          company_id: signal.company_id,
          entity_name: s(c?.company_name),
          entity_role: "OWNER",
          status: "IDENTIFIED",
          source_url: s(signal.source_url),
          verification_status: "needs_research",
          verification_confidence: 0,
        });
      setNotice(
        "تم إنشاء Project Candidate. المشروع بقي needs_research حتى يتم التحقق البشري.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء المشروع.");
    }
  };
  return (
    <CRMPage
      title="Project Radar"
      description="كل Signal يتحول إلى قرار: تجاهل، تحقق، أو Project Candidate — لا مزيد من أخبار بلا مسار تجاري."
    >
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
      <section className="crm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--nav-accent)]">SIGNAL → PROJECT</p>
            <h3 className="text-xl font-bold">رادار الفرص الخارجية</h3>
          </div>
          <div className="flex gap-2">
            {(
              [
                ["ALL", "الكل"],
                ["VERIFIED", "موثقة"],
                ["REVIEW", "تحتاج مراجعة"],
                ["REJECTED", "المرفوضة"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={filter === id ? "btn-primary" : "btn-ghost"}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="crm-card flex flex-wrap items-center justify-between gap-3 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4" />
            تحديد الكل ({rows.length})
          </label>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{selectedIds.size} محدد</span>
              <button className="btn-ghost" onClick={() => setSelectedIds(new Set())}>
                إلغاء التحديد
              </button>
              <button
                className="rounded-lg border border-rose-400/50 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:border-rose-400"
                disabled={bulkDeleting}
                onClick={() => void bulkDelete()}
              >
                {bulkDeleting ? "جارٍ الحذف..." : "حذف المحدد"}
              </button>
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="crm-empty">جارٍ تحليل الإشارات…</div>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ signal, score, linked: isLinked }) => {
            const c = companyById.get(s(signal.company_id));
            const id = s(signal.id);
            return (
              <article key={id} className="crm-card p-4">
                <div className="grid gap-4 lg:grid-cols-[auto_1.4fr_.7fr_.8fr_auto] lg:items-center">
                  <div className="flex items-start pt-1 lg:pt-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={() => toggleSelected(id)}
                      aria-label={`تحديد ${s(signal.title) || "إشارة"}`}
                      className="h-4 w-4"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`crm-chip ${s(signal.verification_status) === "verified" ? "status-success" : s(signal.verification_status) === "rejected" ? "status-danger" : "status-warning"}`}
                      >
                        {s(signal.verification_status)}
                      </span>
                      {isLinked && (
                        <span className="crm-chip status-neutral">
                          مرتبط بمشروع
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-lg font-bold">
                      {s(signal.title) || s(signal.signal_type) || "Signal"}
                    </h3>
                    <p className="mt-1 text-xs text-[#8f96a3]">
                      {s(c?.company_name) || "شركة غير مرتبطة"} ·{" "}
                      {s(c?.sector) || "قطاع غير محدد"} ·{" "}
                      {s(c?.city) || "مدينة غير محددة"}
                    </p>
                    <p className="mt-2 text-sm">
                      {s(signal.summary) || "لا يوجد ملخص محفوظ."}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#8f96a3]">Radar Score</span>
                    <b className="block text-3xl">{score}</b>
                  </div>
                  <div className="text-xs">
                    <p>
                      Event Match{" "}
                      <b>{Number(signal.event_match_confidence || 0)}</b>
                    </p>
                    <p>
                      Entity Match{" "}
                      <b>{Number(signal.entity_match_confidence || 0)}</b>
                    </p>
                    <p>
                      Source Quality{" "}
                      <b>{Number(signal.source_quality_confidence || 0)}</b>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    {s(signal.source_url) && (
                      <a
                        href={s(signal.source_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost"
                      >
                        المصدر
                      </a>
                    )}
                    {isLinked ? (
                      <Link
                        href={`/projects/${projects.find((p) => s(p.source_signal_id) === s(signal.id))?.id}`}
                        className="btn-secondary"
                      >
                        فتح المشروع
                      </Link>
                    ) : (
                      <button
                        disabled={s(signal.verification_status) !== "verified"}
                        onClick={() => void create(signal)}
                        className="btn-primary disabled:opacity-40"
                      >
                        تحويل لمشروع
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-rose-400/50 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:border-rose-400"
                      onClick={() => void removeOne(id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!rows.length && (
            <div className="crm-empty">لا توجد Signals مطابقة لهذا الفلتر.</div>
          )}
        </div>
      )}
    </CRMPage>
  );
}
