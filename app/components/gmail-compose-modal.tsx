"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SimpleRow } from "../lib/supabase/simple-crud";

const s = (value: unknown) => String(value ?? "").trim();

type ToolButtonProps = {
  label: string;
  icon: string;
  onClick: () => void;
  className?: string;
};

function ToolButton({ label, icon, onClick, className = "" }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-10 min-w-10 place-items-center rounded-lg border border-[#454b5c] bg-[#282c35] px-3 text-sm font-bold text-[#eef0f5] transition hover:border-[#7d67ff] hover:bg-[#373c48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8c7cff] ${className}`}
    >
      {icon}
    </button>
  );
}

export function GmailComposeModal({
  companies,
  contacts,
  assets,
  initialDraft,
  onClose,
  onSave,
}: {
  companies: SimpleRow[];
  contacts: SimpleRow[];
  assets: SimpleRow[];
  initialDraft?: SimpleRow | null;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const [companyId, setCompanyId] = useState(s(initialDraft?.company_id));
  const [recipient, setRecipient] = useState(s(initialDraft?.recipient));
  const [subject, setSubject] = useState(s(initialDraft?.subject));
  const [attachmentId, setAttachmentId] = useState(
    s(initialDraft?.recommended_attachment_id),
  );
  const [busy, setBusy] = useState(false);

  const company = companies.find((row) => row.id === companyId);
  const companyContacts = useMemo(
    () => contacts.filter((row) => row.company_id === companyId),
    [companyId, contacts],
  );
  const attachment = assets.find((row) => String(row.id) === attachmentId);

  useEffect(() => {
    if (editor.current && initialDraft)
      editor.current.innerText = s(initialDraft.body);
  }, [initialDraft]);

  const command = (name: string, value?: string) => {
    editor.current?.focus();
    document.execCommand(name, false, value);
  };

  const chooseCompany = (id: string) => {
    setCompanyId(id);
    const selected = companies.find((row) => row.id === id);
    const contact = contacts.find(
      (row) => row.company_id === id && s(row.email),
    );
    setRecipient(
      s(contact?.email || selected?.general_email || selected?.email),
    );
    setSubject(selected ? `فرص تعاون مع ${s(selected.company_name)}` : "");
  };

  const save = async () => {
    const body = editor.current?.innerText.trim() || "";
    if (!companyId || !subject.trim() || !body) return;
    setBusy(true);
    try {
      await onSave({
        company_id: companyId,
        company_name: s(company?.company_name),
        contact_id:
          companyContacts.find((row) => s(row.email) === recipient)?.id || null,
        recipient,
        channel: "Email",
        subject,
        body,
        status: "Draft",
        draft_classification: "PREPARATION",
        language: "ARABIC",
        recommended_attachment_id: attachmentId || null,
        id: initialDraft?.id,
      });
    } finally {
      setBusy(false);
    }
  };

  const addLink = () => {
    const url = window.prompt("أدخل رابطًا يبدأ بـ https://");
    if (url) command("createLink", url);
  };

  return (
    <div className="fixed inset-0 z-[110] flex bg-black/70 p-2 md:p-5">
      <section className="mx-auto flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#454b5c] bg-[#20232b] shadow-2xl">
        <header className="flex items-center justify-between bg-[#30343e] px-5 py-3">
          <div>
            <h2 className="text-lg font-bold">
              {initialDraft ? "تحرير المسودة" : "رسالة جديدة"}
            </h2>
            <p className="text-xs text-[#aab0bf]">محرر بريد موسّع</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </header>

        <div className="grid gap-2 border-b border-[#454b5c] p-3 md:grid-cols-2">
          <label className="text-xs text-[#aab0bf]">
            الشركة
            <select
              value={companyId}
              onChange={(event) => chooseCompany(event.target.value)}
              className="mt-1 w-full rounded-xl border p-2.5 text-sm"
            >
              <option value="">اختر الشركة</option>
              {companies.map((row) => (
                <option key={row.id} value={row.id}>
                  {s(row.company_name)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#aab0bf]">
            إلى
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              dir="ltr"
              placeholder="email@company.com"
              className="mt-1 w-full rounded-xl border p-2.5 text-sm"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 border-b border-[#454b5c] px-4 py-3 text-sm">
          <span className="shrink-0 text-[#aab0bf]">الموضوع</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-b border-[#454b5c] px-4 py-3 text-sm">
          <span className="shrink-0 text-[#aab0bf]">المرفق</span>
          <select
            value={attachmentId}
            onChange={(event) => setAttachmentId(event.target.value)}
            className="min-w-[240px] flex-1 rounded-xl border p-2.5 text-sm"
          >
            <option value="">بدون مرفق</option>
            {assets
              .filter((row) => row.active !== false)
              .map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {s(row.name || row.asset_type)}
                </option>
              ))}
          </select>
          {attachment && s(attachment.asset_url) ? (
            <a
              href={s(attachment.asset_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              فتح المرفق ↗
            </a>
          ) : attachment ? (
            <span className="text-xs text-amber-400">
              هذا المرفق لا يحتوي رابطًا صالحًا بعد.
            </span>
          ) : null}
          <a
            href="/sales-kit"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#a99cff] underline"
          >
            إدارة المرفقات
          </a>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 border-b border-[#454b5c] bg-[#252932] px-3 py-2"
          role="toolbar"
          aria-label="أدوات تنسيق الرسالة"
        >
          <select
            title="نوع الخط"
            aria-label="نوع الخط"
            defaultValue="Arial"
            onChange={(event) => command("fontName", event.target.value)}
            className="h-10 rounded-lg border border-[#454b5c] bg-[#282c35] px-2 text-sm"
          >
            <option value="Arial">Arial</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
          </select>
          <select
            title="حجم الخط"
            aria-label="حجم الخط"
            defaultValue="3"
            onChange={(event) => command("fontSize", event.target.value)}
            className="h-10 rounded-lg border border-[#454b5c] bg-[#282c35] px-2 text-sm"
          >
            <option value="1">صغير جدًا</option>
            <option value="2">صغير</option>
            <option value="3">عادي</option>
            <option value="4">كبير</option>
            <option value="5">كبير جدًا</option>
            <option value="6">عنوان</option>
          </select>

          <span className="h-7 w-px bg-[#454b5c]" />
          <ToolButton
            label="غامق"
            icon="B"
            className="font-black"
            onClick={() => command("bold")}
          />
          <ToolButton
            label="مائل"
            icon="I"
            className="italic"
            onClick={() => command("italic")}
          />
          <ToolButton
            label="تحته خط"
            icon="U"
            className="underline"
            onClick={() => command("underline")}
          />
          <ToolButton
            label="يتوسطه خط"
            icon="S"
            className="line-through"
            onClick={() => command("strikeThrough")}
          />

          <label
            title="لون الخط"
            aria-label="لون الخط"
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#454b5c] bg-[#282c35] px-3 text-sm font-bold hover:border-[#7d67ff]"
          >
            <span>A</span>
            <input
              type="color"
              defaultValue="#ffffff"
              onChange={(event) => command("foreColor", event.target.value)}
              className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <label
            title="لون تمييز النص"
            aria-label="لون تمييز النص"
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#454b5c] bg-[#282c35] px-3 text-sm font-bold hover:border-[#7d67ff]"
          >
            <span>تمييز</span>
            <input
              type="color"
              defaultValue="#fff29a"
              onChange={(event) => command("hiliteColor", event.target.value)}
              className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>

          <span className="h-7 w-px bg-[#454b5c]" />
          <ToolButton
            label="محاذاة إلى اليمين"
            icon="⇥"
            onClick={() => command("justifyRight")}
          />
          <ToolButton
            label="توسيط"
            icon="≡"
            onClick={() => command("justifyCenter")}
          />
          <ToolButton
            label="محاذاة إلى اليسار"
            icon="⇤"
            onClick={() => command("justifyLeft")}
          />
          <ToolButton
            label="ضبط النص"
            icon="☰"
            onClick={() => command("justifyFull")}
          />
          <ToolButton
            label="قائمة نقطية"
            icon="• قائمة"
            onClick={() => command("insertUnorderedList")}
          />
          <ToolButton
            label="قائمة رقمية"
            icon="1. قائمة"
            onClick={() => command("insertOrderedList")}
          />
          <ToolButton
            label="تقليل المسافة البادئة"
            icon="−⇥"
            onClick={() => command("outdent")}
          />
          <ToolButton
            label="زيادة المسافة البادئة"
            icon="+⇥"
            onClick={() => command("indent")}
          />
          <ToolButton label="إضافة رابط" icon="🔗" onClick={addLink} />
          <ToolButton
            label="إزالة التنسيق"
            icon="Tx"
            onClick={() => command("removeFormat")}
          />
          <ToolButton label="تراجع" icon="↶" onClick={() => command("undo")} />
          <ToolButton label="إعادة" icon="↷" onClick={() => command("redo")} />
        </div>

        <div
          ref={editor}
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          data-placeholder="اكتب رسالتك هنا…"
          className="min-h-[52vh] flex-1 overflow-auto bg-[#191c22] p-6 text-base leading-8 text-[#f3f4f7] outline-none empty:before:text-[#777f91] empty:before:content-[attr(data-placeholder)] md:p-8"
        />

        <footer className="flex flex-wrap items-center gap-2 border-t border-[#454b5c] bg-[#252932] p-3">
          <button
            disabled={busy || !companyId || !subject.trim()}
            onClick={() => void save()}
            className="btn-primary"
          >
            {busy
              ? "جارٍ الحفظ…"
              : initialDraft
                ? "حفظ التعديلات"
                : "حفظ المسودة"}
          </button>
          <button
            type="button"
            onClick={() => editor.current && (editor.current.innerHTML = "")}
            className="btn-ghost"
          >
            🗑 مسح المحتوى
          </button>
          <span className="me-auto text-xs text-[#8f96a3]">
            لن تُرسل الرسالة عند حفظها.
          </span>
        </footer>
      </section>
    </div>
  );
}
