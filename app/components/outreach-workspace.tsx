"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CRMPage } from "./crm-shell";
import { isVerifiedDecisionMaker } from "../lib/domain/business";
import { simpleCrud, type SimpleRow } from "../lib/supabase/simple-crud";
import { OutreachStrategyWorkspace } from "./outreach-strategy-workspace";
import {
  classifyReply,
  conversationStrategy,
  evaluateMessageQuality,
} from "../lib/intelligence/v6";
import { FeedbackControls } from "./feedback-controls";
import { readableText } from "../lib/presentation";
import { GmailComposeModal } from "./gmail-compose-modal";
import {
  formatAttachmentSize,
  openOutreachAttachment,
  parseOutreachAttachments,
} from "../lib/supabase/outreach-attachments";

type Tab = "strategy" | "drafts" | "review" | "ready" | "history";
const tabs: Array<[Tab, string]> = [
  ["strategy", "الاستراتيجية"],
  ["drafts", "المسودات"],
  ["review", "المراجعة"],
  ["ready", "الجاهز"],
  ["history", "السجل"],
];
const safe = (v: unknown) => String(v ?? "").trim();
const display = (v: unknown) => readableText(v).trim();
const directionLabel = (v: unknown) => (v === "INBOUND" ? "وارد" : "صادر");

export function OutreachWorkspace() {
  const params = useSearchParams(),
    tab = (
      tabs.some(([id]) => id === params.get("tab"))
        ? params.get("tab")
        : "strategy"
    ) as Tab;
  const [messages, setMessages] = useState<SimpleRow[]>([]),
    [companies, setCompanies] = useState<SimpleRow[]>([]),
    [contacts, setContacts] = useState<SimpleRow[]>([]),
    [events, setEvents] = useState<SimpleRow[]>([]),
    [assets, setAssets] = useState<SimpleRow[]>([]);
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [priority, setPriority] = useState("الكل"),
    [selected, setSelected] = useState<{
      company: SimpleRow;
      draft?: SimpleRow;
    } | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [event, setEvent] = useState({
    contact_id: "",
    channel: "Email",
    direction: "OUTBOUND",
    recipient: "",
    occurred_at: new Date().toISOString().slice(0, 16),
    status: "COMPLETED",
    outcome: "",
    notes: "",
    evidence_reference: "",
    next_action: "",
    next_action_date: "",
  });
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<SimpleRow | null>(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [m, c, p, e, a] = await Promise.all([
        simpleCrud.list("messages"),
        simpleCrud.list("companies"),
        simpleCrud.list("contacts"),
        simpleCrud.list("communication_events"),
        simpleCrud.list("sales_kit_assets"),
      ]);
      setMessages(m);
      setCompanies(c);
      setContacts(p);
      setEvents(e);
      setAssets(a);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر تحميل مساحة التواصل.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => setPage(1), [priority, query, tab]);
  const enriched = useMemo(
    () =>
      messages
        .filter((d) => !d.archived_at)
        .flatMap((draft) => {
          const company = companies.find((c) => c.id === draft.company_id);
          if (!company) return [];
          const contact = contacts.find((c) => c.id === draft.contact_id),
            verified = Boolean(contact && isVerifiedDecisionMaker(contact));
          const stage =
            safe(draft.status) === "Approved" && verified
              ? "ready"
              : safe(draft.status) === "Draft" && verified
                ? "review"
                : "drafts";
          return [{ draft, company, contact, verified, stage }];
        }),
    [companies, contacts, messages],
  );
  const filtered = useMemo(
    () =>
      enriched
        .filter((item) => item.stage === tab)
        .filter((item) => {
          const text =
            `${safe(item.company.company_name)} ${safe(item.draft.subject)} ${safe(item.contact?.full_name || item.contact?.name)}`.toLowerCase();
          return (
            (!query || text.includes(query.toLowerCase())) &&
            (priority === "الكل" || safe(item.company.priority) === priority)
          );
        }),
    [enriched, priority, query, tab],
  );
  const history = useMemo(
    () =>
      events.filter((row) => {
        const company = companies.find((c) => c.id === row.company_id);
        return (
          !query ||
          `${safe(company?.company_name)} ${safe(row.recipient)} ${safe(row.outcome)}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [companies, events, query],
  );
  const source = tab === "history" ? history : filtered,
    totalPages = Math.max(1, Math.ceil(source.length / 25)),
    visible = source.slice((page - 1) * 25, page * 25);
  const counts = {
    strategy: companies.length,
    drafts: enriched.filter((x) => x.stage === "drafts").length,
    review: enriched.filter((x) => x.stage === "review").length,
    ready: enriched.filter((x) => x.stage === "ready").length,
    history: events.length,
  };
  const approve = async (item: (typeof enriched)[number]) => {
    if (!item.verified) {
      setError("لا يمكن اعتماد المسودة دون صانع قرار موثق ومصدر دليل.");
      return;
    }
    const body = display(item.draft.body);
    const channelValue = safe(item.draft.channel).toUpperCase();
    const channel =
      channelValue === "WHATSAPP"
        ? "WHATSAPP"
        : channelValue === "LINKEDIN"
          ? "LINKEDIN"
          : channelValue === "CALL"
            ? "CALL_SCRIPT"
            : "EMAIL";
    const strategy = conversationStrategy({
      company: item.company,
      contacts,
      events,
      drafts: messages,
      channel,
    });
    const rawLevel = Number(item.draft.personalization_level ?? 0);
    const level = Math.max(0, Math.min(3, rawLevel)) as 0 | 1 | 2 | 3;
    const evidenceSafe =
      !/(علمنا بمشروع|مشروعكم الحالي|your current project|we know your project|لدينا خبرة معكم)/i.test(
        body,
      );
    const quality = evaluateMessageQuality({
      body,
      companyName: safe(item.company.company_name),
      businessAngle: strategy.businessAngle,
      channel,
      personalizationLevel: level,
      relationshipAware: !["UNKNOWN", "TARGET"].includes(
        strategy.relationshipStage,
      ),
      evidenceSafe,
      existingDrafts: messages
        .filter((row) => row.id !== item.draft.id)
        .map((row) => safe(row.body)),
    });
    if (quality.score < 65) {
      setError(`جودة المسودة ${quality.score}/100؛ يجب تخصيصها قبل الاعتماد.`);
      return;
    }
    await simpleCrud.update("messages", item.draft.id, {
      status: "Approved",
      draft_classification: "PERSONALIZED",
      approved_at: new Date().toISOString(),
      quality_score: quality.score,
      quality_status: quality.status,
      quality_issues: quality.warnings,
      quality_breakdown: quality.dimensions,
      duplicate_similarity: quality.duplicateSimilarity,
      duplicate_warning:
        quality.warnings.find((warning) =>
          warning.includes("GENERIC_PATTERN"),
        ) || "",
    });
    setNotice("تم اعتماد المسودة للمراجعة البشرية. لم يتم إرسالها.");
    await load();
  };
  const openEvent = (item: (typeof enriched)[number]) => {
    if (item.stage !== "ready") {
      setError("سجّل التواصل فقط من مسودة معتمدة مرتبطة بصانع قرار موثق.");
      return;
    }
    setEvent({
      ...event,
      contact_id: safe(item.contact?.id),
      recipient: safe(item.contact?.full_name || item.contact?.name),
      outcome: "",
      notes: "",
      evidence_reference: "",
      next_action: "",
      next_action_date: "",
    });
    setSelected({ company: item.company, draft: item.draft });
  };
  const openInbound = (row: SimpleRow) => {
    const company = companies.find((item) => item.id === row.company_id);
    if (!company) return;
    const draft =
      messages.find((item) => item.id === row.message_id) ||
      messages.find(
        (item) =>
          item.company_id === company.id && item.contact_id === row.contact_id,
      );
    setEvent({
      ...event,
      direction: "INBOUND",
      contact_id: safe(row.contact_id),
      recipient: safe(row.recipient),
      outcome: "",
      notes: "",
      evidence_reference: "",
      next_action: "",
      next_action_date: "",
    });
    setSelected({ company, draft });
  };
  const recordEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !event.recipient.trim()) return;
    try {
      const reply =
        event.direction === "INBOUND"
          ? classifyReply(`${event.outcome} ${event.notes}`)
          : null;
      const nextAction = event.next_action || reply?.nextAction || "";
      const created = await simpleCrud.create("communication_events", {
        company_id: selected.company.id,
        contact_id: event.contact_id,
        message_id: selected.draft?.id ?? null,
        subject: display(selected.draft?.subject),
        channel: event.channel,
        direction: event.direction,
        recipient: event.recipient,
        occurred_at: new Date(event.occurred_at).toISOString(),
        status: event.status,
        outcome: event.outcome,
        notes: event.notes,
        evidence_reference: event.evidence_reference,
        next_action: nextAction,
        next_action_date: event.next_action_date || null,
        reply_intent: reply?.intent || "",
        reply_sentiment: reply?.sentiment || "",
        commercial_signal: reply?.commercialSignal || "",
        reply_confidence: reply?.confidence ?? null,
      });
      if (event.direction === "OUTBOUND" && selected.draft)
        await simpleCrud.update("messages", selected.draft.id, {
          status: "Contacted",
          sent_at: new Date(event.occurred_at).toISOString(),
        });
      if (nextAction && event.next_action_date)
        await simpleCrud.create("follow_ups", {
          company_id: selected.company.id,
          company_name: safe(selected.company.company_name),
          contact_id: event.contact_id,
          contact_person: event.recipient,
          follow_up_type: event.channel,
          date: event.next_action_date,
          time: "09:00",
          priority: selected.company.priority === "A" ? "High" : "Medium",
          status: "Pending",
          subject: nextAction,
          next_action: nextAction,
        });
      setEvents((rows) => [created, ...rows]);
      setSelected(null);
      setNotice(
        reply
          ? `تم حفظ الرد وتصنيفه ${reply.intent} مع الإجراء ${reply.nextAction}. لم تُنشأ فرصة تلقائياً.`
          : "تم حفظ حدث التواصل والمتابعة في Supabase. لا يوجد إرسال خارجي من النظام.",
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر تسجيل التواصل.",
      );
    }
  };
  const saveComposedDraft = async (values: Record<string, unknown>) => {
    try {
      const draftId = safe(values.id);
      const { id: _id, ...payload } = values;
      if (draftId) await simpleCrud.update("messages", draftId, payload);
      else await simpleCrud.create("messages", payload);
      setComposeOpen(false);
      setComposeDraft(null);
      setNotice(draftId ? "تم تحديث المسودة." : "تم حفظ المسودة الجديدة.");
      await load();
    } catch (reason) {
      const saveError =
        reason instanceof Error ? reason : new Error("تعذر حفظ المسودة.");
      setError(saveError.message);
      throw saveError;
    }
  };
  const deleteDraft = async (id: string) => {
    if (!window.confirm("حذف هذه المسودة نهائيًا؟")) return;
    try {
      await simpleCrud.remove("messages", id);
      setNotice("تم حذف المسودة.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حذف المسودة.");
    }
  };
  return (
    <CRMPage
      title="التواصل"
      description="المسودة تحضير داخلي، والاعتماد مراجعة بشرية، أما تم التواصل وورد رد فيعتمدان فقط على حدث تواصل فعلي."
      action={
        <button
          onClick={() => {
            setComposeDraft(null);
            setComposeOpen(true);
          }}
          className="btn-primary"
        >
          كتابة مسودة
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <b>الإرسال الخارجي معطّل</b>
        <span>
          يمكنك إعداد واعتماد المسودات وتسجيل التواصل الذي تم خارج النظام فقط.
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-[#f7efdf] p-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/outreach?tab=${id}`}
            className={
              tab === id ? "btn-primary shrink-0" : "btn-ghost shrink-0"
            }
          >
            {label}
            <span className="crm-chip bg-white/20">{counts[id]}</span>
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
      {tab === "strategy" && (
        <OutreachStrategyWorkspace
          companies={companies}
          contacts={contacts}
          messages={messages}
          onSaved={load}
        />
      )}
      <div className="crm-card grid gap-2 p-3 sm:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالشركة أو الشخص أو النتيجة"
          className="rounded-xl border p-2"
        />
        {tab !== "history" && (
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-xl border p-2"
          >
            <option>الكل</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
        )}
        <div className="rounded-xl bg-[#f7efdf] p-2 text-center text-sm">
          {source.length} سجل
        </div>
      </div>
      {loading ? (
        <div className="crm-empty animate-pulse">جارٍ تحميل التواصل…</div>
      ) : tab === "history" ? (
        <div className="grid gap-2">
          {(visible as SimpleRow[]).map((row) => (
            <article key={row.id} className="crm-card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <Link
                  href={`/companies/${row.company_id}`}
                  className="font-bold"
                >
                  {safe(
                    companies.find((c) => c.id === row.company_id)
                      ?.company_name,
                  ) || "شركة غير معروفة"}
                </Link>
                <div className="flex gap-2">
                  <span
                    className={`crm-chip ${row.direction === "INBOUND" ? "status-warning" : "status-success"}`}
                  >
                    {directionLabel(row.direction)}
                  </span>
                  {row.reply_intent && (
                    <span className="crm-chip status-neutral">
                      {safe(row.reply_intent)} · {safe(row.reply_confidence)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm">
                {safe(row.recipient)} · {safe(row.channel)} ·{" "}
                {safe(row.outcome) || "دون نتيجة مسجلة"}
              </p>
              <p className="mt-1 text-xs text-[#75664d]">
                <span className="data-ltr">{safe(row.occurred_at)}</span> ·
                التالي: {safe(row.next_action) || "غير محدد"}
              </p>
              {row.direction === "OUTBOUND" && (
                <button
                  onClick={() => openInbound(row)}
                  className="btn-secondary mt-3"
                >
                  تسجيل رد وارد
                </button>
              )}
            </article>
          ))}
          {!visible.length && (
            <div className="crm-empty">لا توجد أحداث تواصل فعلية بعد.</div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {(visible as typeof enriched).map((item) => (
            <article key={item.draft.id} className="crm-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/companies/${item.company.id}`}
                    className="font-bold"
                  >
                    {safe(item.company.company_name)}
                  </Link>
                  <p className="mt-1 text-xs text-[#75664d]">
                    {item.verified
                      ? safe(item.contact?.full_name || item.contact?.name)
                      : "مسودة عامة غير مرتبطة بصانع قرار موثق"}{" "}
                    · أولوية {safe(item.company.priority)}
                  </p>
                </div>
                <button
                  type="button"
                  title="فتح المسودة وتحريرها"
                  aria-label="فتح المسودة وتحريرها"
                  onClick={() => {
                    setComposeDraft(item.draft);
                    setComposeOpen(true);
                  }}
                  className={`crm-chip ${item.stage === "ready" ? "status-success" : item.stage === "review" ? "status-warning" : "status-neutral"}`}
                >
                  {item.stage === "ready"
                    ? "معتمدة"
                    : item.stage === "review"
                      ? "جاهزة للمراجعة"
                      : "تحضير"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="crm-chip status-neutral">
                  Quality {safe(item.draft.quality_score) || "—"}/100
                </span>
                <span className="crm-chip status-neutral">
                  Personalization L
                  {safe(item.draft.personalization_level) || "0"}
                </span>
                {item.draft.duplicate_warning && (
                  <span className="crm-chip status-danger">
                    GENERIC_PATTERN
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold">
                {display(item.draft.subject) || "دون عنوان"}
              </p>
              {(() => {
                const attachment = assets.find(
                  (asset) =>
                    String(asset.id) ===
                    String(item.draft.recommended_attachment_id || ""),
                );
                if (!attachment) return null;
                const url = safe(attachment.asset_url);
                return (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#454b5c] p-3 text-sm">
                    <span aria-hidden="true">📎</span>
                    <b>
                      {display(attachment.name || attachment.asset_type) ||
                        "مرفق"}
                    </b>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost"
                      >
                        فتح المرفق ↗
                      </a>
                    ) : (
                      <span className="text-xs text-amber-500">
                        رابط المرفق غير مضاف في حزمة المبيعات.
                      </span>
                    )}
                  </div>
                );
              })()}
              {parseOutreachAttachments(item.draft.attachments).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parseOutreachAttachments(item.draft.attachments).map(
                    (attachment) => (
                      <button
                        key={attachment.path}
                        type="button"
                        onClick={() =>
                          void openOutreachAttachment(attachment.path)
                        }
                        className="flex items-center gap-2 rounded-xl border border-[#454b5c] px-3 py-2 text-sm hover:border-[#7d67ff]"
                        title={`فتح ${attachment.name}`}
                      >
                        <span aria-hidden="true">📎</span>
                        <b className="max-w-72 truncate">{attachment.name}</b>
                        <span className="text-xs text-[#9da4b4]">
                          {formatAttachmentSize(attachment.size)}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
              <textarea
                defaultValue={display(item.draft.body)}
                onBlur={(e) =>
                  void simpleCrud.update("messages", item.draft.id, {
                    body: e.target.value,
                  })
                }
                dir={
                  safe(item.draft.language).toUpperCase() === "ENGLISH"
                    ? "ltr"
                    : "rtl"
                }
                className="mt-2 min-h-[320px] w-full rounded-xl border p-5 text-[16px] leading-9"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    void navigator.clipboard.writeText(display(item.draft.body))
                  }
                  className="btn-ghost"
                >
                  نسخ
                </button>
                <button
                  onClick={() =>
                    void simpleCrud
                      .update("messages", item.draft.id, {
                        body: display(item.draft.body),
                        subject: display(item.draft.subject),
                      })
                      .then(load)
                  }
                  className="btn-ghost"
                >
                  إصلاح ترميز المسودة
                </button>
                {item.stage === "review" && (
                  <button
                    onClick={() => void approve(item)}
                    className="btn-secondary"
                  >
                    اعتماد للمراجعة البشرية
                  </button>
                )}
                {item.stage === "ready" && (
                  <button
                    onClick={() => openEvent(item)}
                    className="btn-primary"
                  >
                    تسجيل تواصل فعلي
                  </button>
                )}
                {item.stage === "drafts" && (
                  <Link
                    href={`/research?tab=manual&company_id=${item.company.id}`}
                    className="btn-secondary"
                  >
                    استكمال صانع القرار
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void deleteDraft(String(item.draft.id))}
                  className="btn-ghost text-red-500"
                >
                  حذف المسودة
                </button>
                <FeedbackControls
                  targetType="DRAFT"
                  targetId={String(item.draft.id)}
                  companyId={String(item.company.id)}
                  messageId={String(item.draft.id)}
                />
              </div>
            </article>
          ))}
          {!visible.length && (
            <div className="crm-empty">لا توجد سجلات في هذه المرحلة.</div>
          )}
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
      {selected && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-3">
          <form
            onSubmit={recordEvent}
            className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5"
          >
            <h3 className="font-bold">
              تسجيل تواصل فعلي — {safe(selected.company.company_name)}
            </h3>
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              هذا النموذج يسجل حدثاً تم فعلياً خارج نوفافيرك؛ لن يرسل النظام أي
              رسالة.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                value={event.direction}
                onChange={(e) =>
                  setEvent({ ...event, direction: e.target.value })
                }
                className="rounded-xl border p-2"
              >
                <option value="OUTBOUND">تواصل صادر</option>
                <option value="INBOUND">رد وارد</option>
              </select>
              <select
                value={event.channel}
                onChange={(e) =>
                  setEvent({ ...event, channel: e.target.value })
                }
                className="rounded-xl border p-2"
              >
                <option>Email</option>
                <option>Phone</option>
                <option>WhatsApp</option>
                <option>LinkedIn</option>
                <option>Meeting</option>
                <option>Visit</option>
              </select>
              <input
                required
                value={event.recipient}
                readOnly
                className="rounded-xl border bg-stone-50 p-2"
              />
              <input
                required
                type="datetime-local"
                value={event.occurred_at}
                onChange={(e) =>
                  setEvent({ ...event, occurred_at: e.target.value })
                }
                className="rounded-xl border p-2"
              />
              <input
                required
                value={event.outcome}
                onChange={(e) =>
                  setEvent({ ...event, outcome: e.target.value })
                }
                placeholder="النتيجة *"
                className="rounded-xl border p-2"
              />
              <input
                value={event.evidence_reference}
                onChange={(e) =>
                  setEvent({ ...event, evidence_reference: e.target.value })
                }
                placeholder="مرجع أو دليل"
                className="rounded-xl border p-2"
              />
              <textarea
                value={event.notes}
                onChange={(e) => setEvent({ ...event, notes: e.target.value })}
                placeholder="ملاحظات"
                className="rounded-xl border p-2 md:col-span-2"
              />
              <input
                value={event.next_action}
                onChange={(e) =>
                  setEvent({ ...event, next_action: e.target.value })
                }
                placeholder="الإجراء التالي"
                className="rounded-xl border p-2"
              />
              <input
                type="date"
                value={event.next_action_date}
                onChange={(e) =>
                  setEvent({ ...event, next_action_date: e.target.value })
                }
                className="rounded-xl border p-2"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-primary">حفظ الحدث</button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-ghost"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
      {composeOpen && (
        <GmailComposeModal
          companies={companies}
          contacts={contacts}
          assets={assets}
          initialDraft={composeDraft}
          onClose={() => {
            setComposeOpen(false);
            setComposeDraft(null);
          }}
          onSave={saveComposedDraft}
        />
      )}
    </CRMPage>
  );
}
