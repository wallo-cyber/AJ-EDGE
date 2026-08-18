"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CRMPage } from "../../../components/crm-shell";
import { ProjectVendorsPanel } from "../../../components/project-vendors-panel";
import { simpleCrud, type SimpleRow } from "../../../lib/supabase/simple-crud";
import {
  ROUTE_LABELS,
  STAGE_LABELS,
  projectCommercialScore,
  projectCoverage,
  bestAccessPath,
  projectNextMove,
  type ProjectStage,
  type RevenueRoute,
  type ProjectEntity,
  type ProjectPackage,
  type AccessPath,
  type ProjectFact,
} from "../../../lib/project-capture/core";
import {
  PLAYBOOKS,
  bidScore,
  bidRecommendation,
  lifecyclePhase,
  type PursuitRoute,
} from "../../../lib/acquisition-v3/core";

const safe = (v: unknown) => String(v ?? "").trim();
const roles = [
  "OWNER",
  "CONSULTANT",
  "MAIN_CONTRACTOR",
  "EPC",
  "SUPPLIER",
  "FACILITY_OPERATOR",
  "VENDOR_PORTAL",
  "OTHER",
];
const packageStatuses = [
  "IDENTIFIED",
  "EXPECTED",
  "OPEN",
  "RFQ",
  "BID",
  "SUBMITTED",
  "AWARDED",
  "LOST",
  "NOT_RELEVANT",
];
const accessTypes = [
  "DIRECT",
  "REFERRAL",
  "CONSULTANT",
  "SUPPLIER",
  "MAIN_CONTRACTOR",
  "VENDOR_PORTAL",
  "OTHER",
];
export default function ProjectCapturePage() {
  const params = useParams<{ id: string }>(),
    id = String(params.id);
  const [project, setProject] = useState<SimpleRow | null>(null),
    [companies, setCompanies] = useState<SimpleRow[]>([]),
    [entities, setEntities] = useState<SimpleRow[]>([]),
    [packages, setPackages] = useState<SimpleRow[]>([]),
    [paths, setPaths] = useState<SimpleRow[]>([]),
    [plan, setPlan] = useState<SimpleRow | null>(null);
  const [updates, setUpdates] = useState<SimpleRow[]>([]),
    [steps, setSteps] = useState<SimpleRow[]>([]),
    [bidItems, setBidItems] = useState<SimpleRow[]>([]),
    [bidDecision, setBidDecision] = useState<SimpleRow | null>(null),
    [relationships, setRelationships] = useState<SimpleRow[]>([]),
    [approvals, setApprovals] = useState<SimpleRow[]>([]);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true);
  const [approvalReason, setApprovalReason] = useState("");
  const [entityForm, setEntityForm] = useState({
    company_id: "",
    entity_name: "",
    entity_role: "CONSULTANT",
    source_url: "",
    verification_status: "needs_research",
    verification_confidence: 0,
  });
  const [packageForm, setPackageForm] = useState({
    package_name: "",
    package_type: "OTHER",
    status: "IDENTIFIED",
    scope_fit: 0,
    qualification_status: "UNKNOWN",
    estimated_value: "",
  });
  const [pathForm, setPathForm] = useState({
    target_company_id: "",
    via_company_id: "",
    path_type: "DIRECT",
    target_role: "",
    strength: 0,
    status: "IDENTIFIED",
    evidence_url: "",
    next_action: "",
  });
  const [planForm, setPlanForm] = useState({
    objective: "",
    win_strategy: "",
    why_us: "",
    commercial_risks: "",
    delivery_risks: "",
    competition_notes: "",
    bid_decision: "UNDECIDED",
    bid_decision_reason: "",
    move1: "",
    move2: "",
    move3: "",
  });
  const [updateForm, setUpdateForm] = useState({
    update_type: "OTHER",
    title: "",
    summary: "",
    source_url: "",
    verification_status: "needs_research",
    verification_confidence: 0,
    materiality: 50,
  });
  const [bidForm, setBidForm] = useState({
    project_fit: 0,
    scope_fit: 0,
    timing: 0,
    access: 0,
    qualification: 0,
    relationship: 0,
    competition: 0,
    commercial_attractiveness: 0,
    delivery_capability: 0,
    human_decision: "UNDECIDED",
    decision_reason: "",
  });
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, c, e, pk, ap, cp, pu, ps, bi, bd, re, ae] = await Promise.all([
        simpleCrud.page("projects", 1, 1, {
          column: "id",
          value: id,
          order: "created_at",
        }),
        simpleCrud.page("companies", 1, 1000, {
          order: "company_name",
          ascending: true,
        }),
        simpleCrud.page("project_entities", 1, 500, {
          column: "project_id",
          value: id,
        }),
        simpleCrud.page("project_packages", 1, 500, {
          column: "project_id",
          value: id,
        }),
        simpleCrud.page("project_access_paths", 1, 500, {
          column: "project_id",
          value: id,
        }),
        simpleCrud.page("capture_plans", 1, 1, {
          column: "project_id",
          value: id,
        }),
        simpleCrud.page("project_updates", 1, 500, {
          column: "project_id",
          value: id,
          order: "occurred_at",
        }),
        simpleCrud.page("pursuit_steps", 1, 200, {
          column: "project_id",
          value: id,
          order: "step_order",
          ascending: true,
        }),
        simpleCrud.page("bid_board_items", 1, 200, {
          column: "project_id",
          value: id,
          order: "due_at",
          ascending: true,
        }),
        simpleCrud.page("bid_decisions", 1, 1, {
          column: "project_id",
          value: id,
          order: "updated_at",
        }),
        simpleCrud.page("relationship_edges", 1, 500, {
          column: "project_id",
          value: id,
          order: "strength",
        }),
        simpleCrud.page("audit_events", 1, 200, {
          column: "entity_id",
          value: id,
          order: "created_at",
        }),
      ]);
      const row = p.rows[0] ?? null;
      setProject(row);
      setCompanies(c.rows);
      setEntities(e.rows);
      setPackages(pk.rows);
      setPaths(ap.rows);
      setPlan(cp.rows[0] ?? null);
      setUpdates(pu.rows);
      setSteps(ps.rows);
      setBidItems(bi.rows);
      setBidDecision(bd.rows[0] ?? null);
      setRelationships(re.rows);
      setApprovals(ae.rows.filter((row) => safe(row.action).includes("PROJECT") || safe(row.action).includes("DECISION")));
      if (cp.rows[0]) {
        const x = cp.rows[0],
          moves = Array.isArray(x.next_three_moves) ? x.next_three_moves : [];
        setPlanForm({
          objective: safe(x.objective),
          win_strategy: safe(x.win_strategy),
          why_us: safe(x.why_us),
          commercial_risks: safe(x.commercial_risks),
          delivery_risks: safe(x.delivery_risks),
          competition_notes: safe(x.competition_notes),
          bid_decision: safe(x.bid_decision) || "UNDECIDED",
          bid_decision_reason: safe(x.bid_decision_reason),
          move1: safe(moves[0]),
          move2: safe(moves[1]),
          move3: safe(moves[2]),
        });
      }
      if (bd.rows[0]) {
        const x = bd.rows[0];
        setBidForm({
          project_fit: Number(x.project_fit || 0),
          scope_fit: Number(x.scope_fit || 0),
          timing: Number(x.timing || 0),
          access: Number(x.access || 0),
          qualification: Number(x.qualification || 0),
          relationship: Number(x.relationship || 0),
          competition: Number(x.competition || 0),
          commercial_attractiveness: Number(x.commercial_attractiveness || 0),
          delivery_capability: Number(x.delivery_capability || 0),
          human_decision: safe(x.human_decision) || "UNDECIDED",
          decision_reason: safe(x.decision_reason),
        });
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذر تحميل Pursuit Workspace.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);
  const companyById = useMemo(
    () => new Map(companies.map((c) => [safe(c.id), c])),
    [companies],
  );
  if (loading)
    return (
      <CRMPage title="Project Capture" description="جارٍ تحميل المشروع…">
        <div className="crm-empty">جارٍ التحميل…</div>
      </CRMPage>
    );
  if (!project)
    return (
      <CRMPage
        title="Project Capture"
        description="المشروع غير موجود أو لا تملك صلاحية الوصول إليه."
      >
        <div className="crm-empty">لم يتم العثور على المشروع.</div>
      </CRMPage>
    );
  const typedProject = project as unknown as ProjectFact;
  const typedEntities = entities as unknown as ProjectEntity[];
  const typedPackages = packages as unknown as ProjectPackage[];
  const typedPaths = paths as unknown as AccessPath[];
  const score = projectCommercialScore(
      typedProject,
      typedEntities,
      typedPackages,
      typedPaths,
    ),
    coverage = projectCoverage(typedEntities),
    best = bestAccessPath(typedPaths),
    move = projectNextMove(
      typedProject,
      typedEntities,
      typedPackages,
      typedPaths,
    );
  const owner = companyById.get(safe(project.owner_company_id));
  const life = lifecyclePhase(project, updates, bidItems);
  const bidTotal = bidScore(bidForm),
    bidReco = bidRecommendation(bidTotal);
  const verifyProject = async () => {
    if (!approvalReason.trim()) { setError("اكتب سبب قرار الاعتماد حتى يظهر في سجل القرارات."); return; }
    try {
      await simpleCrud.update("projects", id, { verification_status:"verified", stage:safe(project.stage)==="CANDIDATE"?"VERIFIED":safe(project.stage), verified_at:new Date().toISOString() });
      await simpleCrud.create("audit_events", { entity_type:"projects", entity_id:id, action:"HUMAN_PROJECT_APPROVAL", details:{ reason:approvalReason, capture_score:score, confidence:Number(project.verification_confidence||0), source_url:safe(project.source_url), decision:"APPROVED" } });
      setApprovalReason(""); setNotice("تم اعتماد المشروع بقرار بشري وتسجيل القرار."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر اعتماد المشروع."); }
  };
  const saveProject = async (values: Record<string, unknown>) => {
    try {
      setProject(await simpleCrud.update("projects", id, values));
      setNotice("تم تحديث المشروع.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحديث المشروع.");
    }
  };
  const changeOwner = async (companyId: string) => {
    try {
      await simpleCrud.update("projects", id, { owner_company_id: companyId || null });
      if (companyId) {
        const company = companyById.get(companyId);
        const ownerEntity = entities.find((item) => safe(item.entity_role) === "OWNER");
        const values = { project_id:id, company_id:companyId, entity_name:safe(company?.company_name), entity_role:"OWNER", status:"IDENTIFIED", verification_status:"needs_research", verification_confidence:0 };
        if (ownerEntity) await simpleCrud.update("project_entities", safe(ownerEntity.id), values); else await simpleCrud.create("project_entities", values);
      }
      setNotice("تم تحديث مالك المشروع وربطه بخريطة الأطراف."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث مالك المشروع."); }
  };
  const addEntity = async () => {
    if (!entityForm.company_id && !entityForm.entity_name.trim()) {
      setError("حدد شركة أو أدخل اسم الجهة.");
      return;
    }
    try {
      const company = companyById.get(entityForm.company_id);
      await simpleCrud.create("project_entities", {
        project_id: id,
        ...entityForm,
        company_id: entityForm.company_id || null,
        entity_name: entityForm.entity_name || safe(company?.company_name),
        status: "IDENTIFIED",
      });
      setEntityForm({
        company_id: "",
        entity_name: "",
        entity_role: "CONSULTANT",
        source_url: "",
        verification_status: "needs_research",
        verification_confidence: 0,
      });
      setNotice("تمت إضافة طرف إلى Project Graph.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إضافة الطرف.");
    }
  };
  const addPackage = async () => {
    if (!packageForm.package_name.trim()) {
      setError("اسم حزمة الأعمال مطلوب.");
      return;
    }
    try {
      await simpleCrud.create("project_packages", {
        project_id: id,
        ...packageForm,
        estimated_value: packageForm.estimated_value
          ? Number(packageForm.estimated_value)
          : null,
      });
      setPackageForm({
        package_name: "",
        package_type: "OTHER",
        status: "IDENTIFIED",
        scope_fit: 0,
        qualification_status: "UNKNOWN",
        estimated_value: "",
      });
      setNotice("تمت إضافة حزمة العمل.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إضافة الحزمة.");
    }
  };
  const addPath = async () => {
    try {
      await simpleCrud.create("project_access_paths", {
        project_id: id,
        ...pathForm,
        target_company_id: pathForm.target_company_id || null,
        via_company_id: pathForm.via_company_id || null,
      });
      setPathForm({
        target_company_id: "",
        via_company_id: "",
        path_type: "DIRECT",
        target_role: "",
        strength: 0,
        status: "IDENTIFIED",
        evidence_url: "",
        next_action: "",
      });
      setNotice("تمت إضافة مسار وصول.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إضافة مسار الوصول.");
    }
  };
  const savePlan = async () => {
    const values = {
      project_id: id,
      objective: planForm.objective,
      win_strategy: planForm.win_strategy,
      why_us: planForm.why_us,
      commercial_risks: planForm.commercial_risks,
      delivery_risks: planForm.delivery_risks,
      competition_notes: planForm.competition_notes,
      bid_decision: planForm.bid_decision,
      bid_decision_reason: planForm.bid_decision_reason,
      next_three_moves: [planForm.move1, planForm.move2, planForm.move3].filter(
        Boolean,
      ),
      last_reviewed_at: new Date().toISOString(),
    };
    try {
      if (plan) await simpleCrud.update("capture_plans", plan.id, values);
      else await simpleCrud.create("capture_plans", values);
      setNotice("تم حفظ Capture Plan.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ Capture Plan.");
    }
  };
  const addUpdate = async () => {
    if (!updateForm.title.trim()) {
      setError("عنوان تحديث المشروع مطلوب.");
      return;
    }
    try {
      await simpleCrud.create("project_updates", {
        project_id: id,
        ...updateForm,
        occurred_at: new Date().toISOString(),
      });
      setUpdateForm({
        update_type: "OTHER",
        title: "",
        summary: "",
        source_url: "",
        verification_status: "needs_research",
        verification_confidence: 0,
        materiality: 50,
      });
      setNotice("تمت إضافة Project Update.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ التحديث.");
    }
  };
  const initializePlaybook = async () => {
    const route = (safe(project.route_to_revenue) ||
      "UNDEFINED") as PursuitRoute;
    const template = PLAYBOOKS[route] || PLAYBOOKS.UNDEFINED;
    try {
      for (const st of template) {
        if (!steps.some((x) => safe(x.step_key) === st.key))
          await simpleCrud.create("pursuit_steps", {
            project_id: id,
            step_key: st.key,
            step_order: st.order,
            title: st.title,
            objective: st.objective,
            target_role: st.targetRole,
            status: "TODO",
            requires_human_approval: st.human,
          });
      }
      setNotice("تم تجهيز Pursuit Playbook للمسار الحالي.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تجهيز Playbook.");
    }
  };
  const setStepStatus = async (step: SimpleRow, status: string) => {
    try {
      await simpleCrud.update("pursuit_steps", safe(step.id), {
        status,
        completed_at: status === "DONE" ? new Date().toISOString() : null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحديث الخطوة.");
    }
  };
  const saveBidDecision = async () => {
    const total = bidScore(bidForm),
      recommendation = bidRecommendation(total);
    const values = {
      project_id: id,
      ...bidForm,
      total_score: total,
      recommendation,
      decided_at:
        bidForm.human_decision === "UNDECIDED"
          ? null
          : new Date().toISOString(),
    };
    try {
      if (bidDecision)
        await simpleCrud.update("bid_decisions", safe(bidDecision.id), values);
      else await simpleCrud.create("bid_decisions", values);
      setNotice(
        "تم حفظ Bid/No-Bid Score. القرار البشري بقي منفصلًا عن توصية النظام.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ Bid/No-Bid.");
    }
  };

  return (
    <CRMPage
      title={safe(project.project_name)}
      description="Project Capture Plan: نفهم المشروع والأطراف والحزم ومسار الوصول قبل أن نطارد RFQ."
      action={
        <Link href="/projects" className="btn-ghost">
          العودة للمشاريع
        </Link>
      }
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
      <section className="crm-card border-2 border-[#14554a] p-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_.7fr_.8fr]">
          <div>
            <p className="text-xs font-bold text-[#14554a]">
              PROJECT OBJECTIVE
            </p>
            <h3 className="mt-1 text-xl font-bold">
              {safe(plan?.objective) ||
                safe(project.next_action) ||
                "حدد الهدف التجاري لهذا المشروع"}
            </h3>
            <p className="mt-2 text-sm text-[#75664d]">
              <b>WHY NOW:</b> {safe(project.why_now) || "لا يوجد سبب موثق بعد."}
            </p>
          </div>
          <div>
            <span className="text-xs text-[#75664d]">Capture Score</span>
            <b className="block text-4xl">{score}</b>
          </div>
          <div>
            <span className="text-xs text-[#75664d]">NEXT MOVE</span>
            <b className="block">{move.label}</b>
          </div>
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="crm-kpi">
          <span>المالك</span>
          <b className="mt-2 block">
            {safe(owner?.company_name) || "غير محدد"}
          </b>
        </div>
        <div className="crm-kpi">
          <span>Project Map</span>
          <b className="mt-2 block text-3xl">
            {coverage.known}/{coverage.total}
          </b>
          <small>Owner / Consultant / Main Contractor</small>
        </div>
        <div className="crm-kpi">
          <span>أفضل مسار وصول</span>
          <b className="mt-2 block">
            {best ? safe(best.path_type) : "غير موجود"}
          </b>
          <small>
            {best
              ? `Strength ${Number(best.strength || 0)}`
              : "ابنِ Access Path"}
          </small>
        </div>
        <div className="crm-kpi">
          <span>Route-to-Revenue</span>
          <b className="mt-2 block">
            {ROUTE_LABELS[safe(project.route_to_revenue) as RevenueRoute] ||
              "غير محدد"}
          </b>
        </div>
      </div>
      <section className="crm-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--nav-accent)]">ACCESS MAP</p>
            <h3 className="text-xl font-bold">كيف ندخل هذا المشروع؟</h3>
            <p className="mt-1 text-xs text-[#75664d]">
              الجهة ليست الهدف بحد ذاتها؛ نستخدمها كمسار للوصول إلى الحزمة
              والقرار.
            </p>
          </div>
          <span className="crm-chip status-neutral">
            {paths.length} Access Paths
          </span>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
          {(
            ["OWNER", "CONSULTANT", "MAIN_CONTRACTOR", "SUPPLIER"] as const
          ).map((role, index) => {
            const entity = entities.find((x) => safe(x.entity_role) === role);
            const label: Record<string, string> = {
              OWNER: "المالك",
              CONSULTANT: "الاستشاري",
              MAIN_CONTRACTOR: "المقاول الرئيسي",
              SUPPLIER: "المورد/المصنع",
            };
            return (
              <div key={role} className="contents">
                <div
                  className={`rounded-2xl border p-3 ${entity ? "border-[var(--nav-accent)]" : "border-dashed"}`}
                >
                  <span className="text-xs text-[#75664d]">{label[role]}</span>
                  <b className="mt-1 block">
                    {entity
                      ? safe(entity.entity_name) ||
                        safe(
                          companyById.get(safe(entity.company_id))
                            ?.company_name,
                        )
                      : "غير معروف"}
                  </b>
                  <p className="mt-1 text-xs text-[#75664d]">
                    {entity ? safe(entity.verification_status) : "يحتاج بحث"}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden text-center text-xl text-[var(--nav-accent)] lg:block">
                    ←
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl border border-[#ff9d5c]/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs text-[#ff9d5c]">BEST ACCESS ROUTE</span>
              <b className="mr-2">
                {best ? safe(best.path_type) : "لم يحدد بعد"}
              </b>
            </div>
            <div>
              <span className="text-xs text-[#75664d]">TARGET</span>
              <b className="mr-2">
                {best ? safe(best.target_role) || "غير محدد" : "ابنِ مسار وصول"}
              </b>
            </div>
            <div>
              <span className="text-xs text-[#75664d]">STRENGTH</span>
              <b className="mr-2">
                {best ? Number(best.strength || 0) : 0}/100
              </b>
            </div>
          </div>
        </div>
      </section>
      <section className="crm-card p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="text-xs">
            المالك
            <select value={safe(project.owner_company_id)} onChange={(e)=>void changeOwner(e.target.value)} className="mt-1 w-full rounded-xl border p-2">
              <option value="">غير محدد</option>
              {companies.map((company)=><option key={company.id} value={safe(company.id)}>{safe(company.company_name)}</option>)}
            </select>
          </label>
          <label className="text-xs">
            المرحلة
            <select
              value={safe(project.stage)}
              onChange={(e) => void saveProject({ stage: e.target.value })}
              className="mt-1 w-full rounded-xl border p-2"
            >
              {Object.entries(STAGE_LABELS).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Route-to-Revenue
            <select
              value={safe(project.route_to_revenue)}
              onChange={(e) =>
                void saveProject({ route_to_revenue: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-2"
            >
              {Object.entries(ROUTE_LABELS).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            حالة التحقق
            <select
              value={safe(project.verification_status)}
              onChange={(e) =>
                void saveProject({ verification_status: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-2"
            >
              <option value="needs_research">needs_research</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="text-xs">
            Confidence
            <input
              type="number"
              min="0"
              max="100"
              value={Number(project.verification_confidence || 0)}
              onChange={(e) =>
                void saveProject({
                  verification_confidence: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border p-2"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {safe(project.source_url) && (
            <a
              href={safe(project.source_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              فتح مصدر المشروع
            </a>
          )}
          {safe(project.verification_status) !== "verified" && (
            <><input value={approvalReason} onChange={(e)=>setApprovalReason(e.target.value)} placeholder="سبب قرار الاعتماد" className="min-w-64 flex-1 rounded-xl border p-2"/><button onClick={() => void verifyProject()} className="btn-primary">اعتماد المشروع بقراري</button></>
          )}
        </div>
        <p className="mt-2 text-xs text-[#8f96a3]">Capture Score وConfidence معلومات مساعدة للقرار، ولا تمنع اعتمادك البشري.</p>
      </section>
      <section className="crm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-[#ff9d5c]">سجل القرارات</p><h3 className="text-lg font-bold">الموافقات والقرارات المعتمدة</h3></div><span className="crm-chip status-neutral">{approvals.length + (bidDecision && safe(bidDecision.human_decision)!=="UNDECIDED" ? 1 : 0)} قرار</span></div>
        <div className="mt-3 grid gap-2">
          {approvals.map((item)=>{const details=(item.details && typeof item.details==="object" ? item.details : {}) as Record<string,unknown>;return <article key={item.id} className="rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><b>{safe(item.action)==="HUMAN_PROJECT_APPROVAL"?"اعتماد المشروع":"قرار مشروع"}</b><span className="crm-chip status-success">معتمد</span></div><p className="mt-2 text-sm">{safe(details.reason)||"دون سبب مسجل"}</p><p className="mt-1 text-xs text-[#8f96a3]">Capture Score {safe(details.capture_score)||"—"} · Confidence {safe(details.confidence)||"—"} · {safe(item.created_at)}</p></article>})}
          {bidDecision && safe(bidDecision.human_decision)!=="UNDECIDED" && <article className="rounded-xl border p-3"><div className="flex justify-between gap-2"><b>قرار Bid / No-Bid</b><span className="crm-chip status-warning">{safe(bidDecision.human_decision)}</span></div><p className="mt-2 text-sm">{safe(bidDecision.decision_reason)||"دون سبب مسجل"}</p></article>}
          {!approvals.length && (!bidDecision || safe(bidDecision.human_decision)==="UNDECIDED") && <div className="crm-empty">لا توجد قرارات معتمدة لهذا المشروع بعد.</div>}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="crm-card p-4">
          <div className="flex justify-between gap-2">
            <div>
              <h3 className="font-bold">Project Graph — الأطراف</h3>
              <p className="text-xs text-[#75664d]">
                Owner / Consultant / Main Contractor / EPC / Supplier
              </p>
            </div>
            <span className="crm-chip status-neutral">{entities.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {entities.map((x) => (
              <div className="rounded-xl border p-3" key={x.id}>
                <div className="flex justify-between gap-2">
                  <div>
                    <b>
                      {safe(x.entity_name) ||
                        safe(
                          companyById.get(safe(x.company_id))?.company_name,
                        ) ||
                        "جهة غير مسماة"}
                    </b>
                    <p className="text-xs text-[#75664d]">
                      {safe(x.entity_role)} · {safe(x.verification_status)}
                    </p>
                  </div>
                  <span className="crm-chip status-neutral">
                    {safe(x.status)}
                  </span>
                </div>
                {safe(x.source_url) && (
                  <a
                    className="mt-2 inline-block text-xs underline"
                    href={safe(x.source_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    المصدر
                  </a>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <select
              value={entityForm.company_id}
              onChange={(e) =>
                setEntityForm({ ...entityForm, company_id: e.target.value })
              }
              className="rounded-xl border p-2"
            >
              <option value="">شركة موجودة (اختياري)</option>
              {companies.map((c) => (
                <option value={safe(c.id)} key={c.id}>
                  {safe(c.company_name)}
                </option>
              ))}
            </select>
            <input
              value={entityForm.entity_name}
              onChange={(e) =>
                setEntityForm({ ...entityForm, entity_name: e.target.value })
              }
              placeholder="أو اسم الجهة"
              className="rounded-xl border p-2"
            />
            <select
              value={entityForm.entity_role}
              onChange={(e) =>
                setEntityForm({ ...entityForm, entity_role: e.target.value })
              }
              className="rounded-xl border p-2"
            >
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <input
              value={entityForm.source_url}
              onChange={(e) =>
                setEntityForm({ ...entityForm, source_url: e.target.value })
              }
              placeholder="Evidence URL"
              className="rounded-xl border p-2"
            />
          </div>
          <button
            onClick={() => void addEntity()}
            className="btn-secondary mt-3"
          >
            إضافة طرف
          </button>
        </section>
        <section className="crm-card p-4">
          <div className="flex justify-between gap-2">
            <div>
              <h3 className="font-bold">Work Packages</h3>
              <p className="text-xs text-[#75664d]">
                ما الحزمة التي نريدها فعلًا؟
              </p>
            </div>
            <span className="crm-chip status-neutral">{packages.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {packages.map((x) => (
              <div className="rounded-xl border p-3" key={x.id}>
                <div className="flex justify-between gap-2">
                  <div>
                    <b>{safe(x.package_name)}</b>
                    <p className="text-xs text-[#75664d]">
                      {safe(x.package_type)} · Scope Fit{" "}
                      {Number(x.scope_fit || 0)}%
                    </p>
                  </div>
                  <span className="crm-chip status-warning">
                    {safe(x.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  Qualification: <b>{safe(x.qualification_status)}</b>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <input
              value={packageForm.package_name}
              onChange={(e) =>
                setPackageForm({ ...packageForm, package_name: e.target.value })
              }
              placeholder="اسم الحزمة: Civil Works / Fit-out..."
              className="rounded-xl border p-2"
            />
            <input
              value={packageForm.package_type}
              onChange={(e) =>
                setPackageForm({ ...packageForm, package_type: e.target.value })
              }
              placeholder="Package Type"
              className="rounded-xl border p-2"
            />
            <select
              value={packageForm.status}
              onChange={(e) =>
                setPackageForm({ ...packageForm, status: e.target.value })
              }
              className="rounded-xl border p-2"
            >
              {packageStatuses.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <label className="text-xs">
              Scope Fit {packageForm.scope_fit}%
              <input
                type="range"
                min="0"
                max="100"
                value={packageForm.scope_fit}
                onChange={(e) =>
                  setPackageForm({
                    ...packageForm,
                    scope_fit: Number(e.target.value),
                  })
                }
                className="w-full"
              />
            </label>
          </div>
          <button
            onClick={() => void addPackage()}
            className="btn-secondary mt-3"
          >
            إضافة حزمة
          </button>
        </section>
      </div>
      <ProjectVendorsPanel projectId={id} />
      <section className="crm-card p-4">
        <div className="flex justify-between gap-2">
          <div>
            <h3 className="font-bold">Access Paths</h3>
            <p className="text-xs text-[#75664d]">
              ليس فقط “من الشخص؟” بل: من يستطيع أن يدخلنا إلى المشروع؟
            </p>
          </div>
          <span className="crm-chip status-neutral">{paths.length}</span>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {paths.map((x) => (
            <div className="rounded-xl border p-3" key={x.id}>
              <div className="flex justify-between gap-2">
                <b>
                  {safe(x.path_type)} → {safe(x.target_role) || "Target"}
                </b>
                <span className="crm-chip status-neutral">
                  Strength {Number(x.strength || 0)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#75664d]">
                {safe(x.next_action) || "لا يوجد إجراء تالٍ"}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <select
            value={pathForm.path_type}
            onChange={(e) =>
              setPathForm({ ...pathForm, path_type: e.target.value })
            }
            className="rounded-xl border p-2"
          >
            {accessTypes.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <input
            value={pathForm.target_role}
            onChange={(e) =>
              setPathForm({ ...pathForm, target_role: e.target.value })
            }
            placeholder="Target Role: Projects Director..."
            className="rounded-xl border p-2"
          />
          <label className="text-xs">
            Strength {pathForm.strength}
            <input
              type="range"
              min="0"
              max="100"
              value={pathForm.strength}
              onChange={(e) =>
                setPathForm({ ...pathForm, strength: Number(e.target.value) })
              }
              className="w-full"
            />
          </label>
          <input
            value={pathForm.next_action}
            onChange={(e) =>
              setPathForm({ ...pathForm, next_action: e.target.value })
            }
            placeholder="Next Action"
            className="rounded-xl border p-2"
          />
        </div>
        <button onClick={() => void addPath()} className="btn-secondary mt-3">
          إضافة مسار وصول
        </button>
      </section>
      <section className="crm-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--nav-accent)]">
              PROJECT LIFECYCLE INTELLIGENCE
            </p>
            <h3 className="text-xl font-bold">من أول إشارة إلى الترسية</h3>
          </div>
          <span className="crm-chip status-neutral">{life}</span>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {[
            "EARLY_PLANNING",
            "DESIGN",
            "PRECONSTRUCTION",
            "BIDDING",
            "AWARDED",
          ].map((x, i) => {
            const phases = [
                "EARLY_PLANNING",
                "DESIGN",
                "PRECONSTRUCTION",
                "BIDDING",
                "AWARDED",
              ],
              active = phases.indexOf(life) >= i;
            return (
              <div
                key={x}
                className={`rounded-2xl border p-3 ${active ? "border-[var(--nav-accent)]" : "border-dashed"}`}
              >
                <span className="text-xs">{i + 1}</span>
                <b className="mt-1 block text-xs">{x}</b>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {updates.map((u) => (
            <div key={u.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <b>{safe(u.title)}</b>
                  <p className="text-xs text-[#75664d]">
                    {safe(u.update_type)} · {safe(u.verification_status)} ·
                    Materiality {Number(u.materiality || 0)}
                  </p>
                </div>
                {safe(u.source_url) && (
                  <a
                    href={safe(u.source_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    المصدر
                  </a>
                )}
              </div>
              {safe(u.summary) && (
                <p className="mt-2 text-sm">{safe(u.summary)}</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <select
            value={updateForm.update_type}
            onChange={(e) =>
              setUpdateForm({ ...updateForm, update_type: e.target.value })
            }
            className="rounded-xl border p-2"
          >
            <option>EARLY_SIGNAL</option>
            <option>PERMIT</option>
            <option>DESIGN</option>
            <option>CONSULTANT_APPOINTED</option>
            <option>GC_APPOINTED</option>
            <option>TENDER</option>
            <option>RFQ</option>
            <option>AWARD</option>
            <option>CONSTRUCTION_START</option>
            <option>VENDOR_REGISTRATION</option>
            <option>OTHER</option>
          </select>
          <input
            value={updateForm.title}
            onChange={(e) =>
              setUpdateForm({ ...updateForm, title: e.target.value })
            }
            placeholder="عنوان التحديث"
            className="rounded-xl border p-2"
          />
          <input
            value={updateForm.source_url}
            onChange={(e) =>
              setUpdateForm({ ...updateForm, source_url: e.target.value })
            }
            placeholder="Evidence URL"
            className="rounded-xl border p-2"
          />
          <textarea
            value={updateForm.summary}
            onChange={(e) =>
              setUpdateForm({ ...updateForm, summary: e.target.value })
            }
            placeholder="ملخص"
            className="rounded-xl border p-2 md:col-span-2"
          />
          <label className="text-xs">
            Materiality {updateForm.materiality}
            <input
              type="range"
              min="0"
              max="100"
              value={updateForm.materiality}
              onChange={(e) =>
                setUpdateForm({
                  ...updateForm,
                  materiality: Number(e.target.value),
                })
              }
              className="w-full"
            />
          </label>
        </div>
        <button onClick={() => void addUpdate()} className="btn-secondary mt-3">
          إضافة تحديث موثق
        </button>
      </section>
      <section className="crm-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#ff9d5c]">PURSUIT PLAYBOOK</p>
            <h3 className="text-xl font-bold">خطوات الفوز حسب مسار الدخول</h3>
            <p className="text-xs text-[#75664d]">
              {ROUTE_LABELS[safe(project.route_to_revenue) as RevenueRoute] ||
                "UNDEFINED"}
            </p>
          </div>
          <button
            onClick={() => void initializePlaybook()}
            className="btn-primary"
          >
            {steps.length ? "تحديث Playbook" : "إنشاء Playbook"}
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {steps.map((st) => (
            <div className="rounded-2xl border p-3" key={st.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl border font-bold">
                    {Number(st.step_order || 0)}
                  </span>
                  <div>
                    <b>{safe(st.title)}</b>
                    <p className="text-xs text-[#75664d]">
                      {safe(st.objective)}
                    </p>
                    <p className="mt-1 text-xs">
                      Target: <b>{safe(st.target_role) || "—"}</b>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={safe(st.status)}
                    onChange={(e) => void setStepStatus(st, e.target.value)}
                    className="rounded-xl border p-2 text-xs"
                  >
                    <option>TODO</option>
                    <option>READY</option>
                    <option>IN_PROGRESS</option>
                    <option>WAITING</option>
                    <option>DONE</option>
                    <option>SKIPPED</option>
                    <option>BLOCKED</option>
                  </select>
                  {Boolean(st.requires_human_approval) && (
                    <span className="crm-chip status-warning">Human Gate</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!steps.length && (
            <div className="crm-empty">
              أنشئ Playbook للمسار الحالي؛ لن يرسل النظام أي تواصل تلقائيًا.
            </div>
          )}
        </div>
      </section>
      <section className="crm-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--nav-accent)]">
              BID / NO-BID ENGINE
            </p>
            <h3 className="text-xl font-bold">هل تستحق الفرصة وقتنا فعلًا؟</h3>
          </div>
          <div className="text-left">
            <span className="text-xs text-[#75664d]">
              System Recommendation
            </span>
            <b className="block text-3xl">{bidReco}</b>
            <span>{bidTotal}/100</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(
            [
              ["project_fit", "Project Fit"],
              ["scope_fit", "Scope Fit"],
              ["timing", "Timing"],
              ["access", "Access"],
              ["qualification", "Qualification"],
              ["relationship", "Relationship"],
              ["competition", "Competition Position"],
              ["commercial_attractiveness", "Commercial"],
              ["delivery_capability", "Delivery Capability"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="rounded-xl border p-3 text-xs">
              {label}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bidForm[key]}
                  onChange={(e) =>
                    setBidForm({ ...bidForm, [key]: Number(e.target.value) })
                  }
                  className="flex-1"
                />
                <b>{bidForm[key]}</b>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            القرار البشري
            <select
              value={bidForm.human_decision}
              onChange={(e) =>
                setBidForm({ ...bidForm, human_decision: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-2"
            >
              <option>UNDECIDED</option>
              <option>PURSUE</option>
              <option>CONDITIONAL</option>
              <option>NO_BID</option>
            </select>
          </label>
          <label className="text-sm">
            سبب القرار
            <input
              value={bidForm.decision_reason}
              onChange={(e) =>
                setBidForm({ ...bidForm, decision_reason: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-2"
            />
          </label>
        </div>
        <button
          onClick={() => void saveBidDecision()}
          className="btn-primary mt-4"
        >
          حفظ Bid / No-Bid
        </button>
      </section>
      <section className="crm-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--nav-accent)]">
              PROJECT RELATIONSHIPS
            </p>
            <h3 className="text-xl font-bold">
              العلاقات المرتبطة بهذه المطاردة
            </h3>
          </div>
          <Link href="/relationships" className="btn-ghost">
            Relationship Intelligence
          </Link>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {relationships.map((r) => (
            <div className="rounded-xl border p-3" key={r.id}>
              <div className="flex justify-between gap-2">
                <b>{safe(r.relationship_type)}</b>
                <span className="crm-chip status-neutral">
                  {Number(r.strength || 0)}/100
                </span>
              </div>
              <p className="mt-1 text-xs text-[#75664d]">
                {safe(r.verification_status)} ·{" "}
                {safe(r.notes) || "بدون ملاحظات"}
              </p>
            </div>
          ))}
          {!relationships.length && (
            <div className="crm-empty lg:col-span-2">
              لا توجد علاقات موثقة مرتبطة بالمشروع بعد.
            </div>
          )}
        </div>
      </section>
      <section className="crm-card p-5">
        <div>
          <p className="text-xs font-bold text-[#7a5e1c]">CAPTURE PLAN</p>
          <h3 className="text-xl font-bold">خطة الفوز بالمشروع</h3>
          <p className="text-xs text-[#75664d]">
            Bid/No-Bid يبقى قرارًا بشريًا صريحًا.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            الهدف التجاري
            <textarea
              value={planForm.objective}
              onChange={(e) =>
                setPlanForm({ ...planForm, objective: e.target.value })
              }
              className="mt-1 min-h-20 w-full rounded-xl border p-2"
            />
          </label>
          <label className="text-sm">
            Win Strategy
            <textarea
              value={planForm.win_strategy}
              onChange={(e) =>
                setPlanForm({ ...planForm, win_strategy: e.target.value })
              }
              className="mt-1 min-h-24 w-full rounded-xl border p-2"
            />
          </label>
          <label className="text-sm">
            Why Us
            <textarea
              value={planForm.why_us}
              onChange={(e) =>
                setPlanForm({ ...planForm, why_us: e.target.value })
              }
              className="mt-1 min-h-24 w-full rounded-xl border p-2"
            />
          </label>
          <label className="text-sm">
            Commercial Risks
            <textarea
              value={planForm.commercial_risks}
              onChange={(e) =>
                setPlanForm({ ...planForm, commercial_risks: e.target.value })
              }
              className="mt-1 min-h-20 w-full rounded-xl border p-2"
            />
          </label>
          <label className="text-sm">
            Competition
            <textarea
              value={planForm.competition_notes}
              onChange={(e) =>
                setPlanForm({ ...planForm, competition_notes: e.target.value })
              }
              className="mt-1 min-h-20 w-full rounded-xl border p-2"
            />
          </label>
          <div className="md:col-span-2 grid gap-2 md:grid-cols-3">
            <input
              value={planForm.move1}
              onChange={(e) =>
                setPlanForm({ ...planForm, move1: e.target.value })
              }
              placeholder="Move 1"
              className="rounded-xl border p-2"
            />
            <input
              value={planForm.move2}
              onChange={(e) =>
                setPlanForm({ ...planForm, move2: e.target.value })
              }
              placeholder="Move 2"
              className="rounded-xl border p-2"
            />
            <input
              value={planForm.move3}
              onChange={(e) =>
                setPlanForm({ ...planForm, move3: e.target.value })
              }
              placeholder="Move 3"
              className="rounded-xl border p-2"
            />
          </div>
          <label className="text-sm">
            Bid / No-Bid
            <select
              value={planForm.bid_decision}
              onChange={(e) =>
                setPlanForm({ ...planForm, bid_decision: e.target.value })
              }
              className="mt-1 w-full rounded-xl border p-2"
            >
              <option>UNDECIDED</option>
              <option>PURSUE</option>
              <option>CONDITIONAL</option>
              <option>NO_BID</option>
            </select>
          </label>
          <label className="text-sm">
            سبب القرار
            <input
              value={planForm.bid_decision_reason}
              onChange={(e) =>
                setPlanForm({
                  ...planForm,
                  bid_decision_reason: e.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border p-2"
            />
          </label>
        </div>
        <button onClick={() => void savePlan()} className="btn-primary mt-4">
          حفظ Capture Plan
        </button>
      </section>
    </CRMPage>
  );
}
