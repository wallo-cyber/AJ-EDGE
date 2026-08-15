"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SimpleRow } from "../lib/supabase/simple-crud";
import {
  deleteOutreachAttachments,
  formatAttachmentSize,
  openOutreachAttachment,
  parseOutreachAttachments,
  uploadOutreachAttachments,
  validateOutreachAttachment,
  type OutreachAttachment,
} from "../lib/supabase/outreach-attachments";

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
  const fileInput = useRef<HTMLInputElement>(null);
  const [companyId, setCompanyId] = useState(s(initialDraft?.company_id));
  const [recipient, setRecipient] = useState(s(initialDraft?.recipient));
  const [subject, setSubject] = useState(s(initialDraft?.subject));
  const [attachmentId, setAttachmentId] = useState(
    s(initialDraft?.recommended_attachment_id),
  );
  const [storedAttachments, setStoredAttachments] = useState<
    OutreachAttachment[]
  >(() => parseOutreachAttachments(initialDraft?.attachments));
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
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
    setAttachmentError("");
    setUploadProgress(0);
    let newlyUploaded: OutreachAttachment[] = [];
    try {
      newlyUploaded = await uploadOutreachAttachments(
        pendingFiles,
        (_file, uploaded, total) =>
          setUploadProgress(Math.round((uploaded / total) * 100)),
      );
      const nextAttachments = [...storedAttachments, ...newlyUploaded];
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
        attachments: nextAttachments,
        id: initialDraft?.id,
      });
      if (removedPaths.length) await deleteOutreachAttachments(removedPaths);
      setStoredAttachments(nextAttachments);
      setPendingFiles([]);
      setRemovedPaths([]);
      setUploadProgress(0);
    } catch (reason) {
      if (newlyUploaded.length) {
        await deleteOutreachAttachments(
          newlyUploaded.map((item) => item.path),
        ).catch(() => undefined);
      }
      setAttachmentError(
        reason instanceof Error ? reason.message : "تعذر حفظ المرفقات.",
      );
    } finally {
      setBusy(false);
    }
  };

  const chooseFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setAttachmentError("");
    const selected = Array.from(files);
    try {
      selected.forEach(validateOutreachAttachment);
      setPendingFiles((current) => [...current, ...selected]);
    } catch (reason) {
      setAttachmentError(
        reason instanceof Error ? reason.message : "تعذر إضافة الملف.",
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
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
          <input
            ref={fileInput}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => chooseFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="btn-secondary"
          >
            تحميل من الجهاز
          </button>
          <span className="text-xs text-[#aab0bf]">
            حتى 100 ميغابايت لكل ملف
          </span>
        </div>

        {(storedAttachments.length > 0 ||
          pendingFiles.length > 0 ||
          attachmentError) && (
          <div className="border-b border-[#454b5c] bg-[#242832] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {storedAttachments.map((item) => (
                <div
                  key={item.path}
                  className="flex items-center gap-2 rounded-xl border border-[#454b5c] bg-[#1d2027] px-3 py-2 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => void openOutreachAttachment(item.path)}
                    className="max-w-64 truncate font-semibold text-[#d8d2ff] underline"
                    title={`فتح ${item.name}`}
                  >
                    {item.name}
                  </button>
                  <span className="text-[#9da4b4]">
                    {formatAttachmentSize(item.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`إزالة ${item.name}`}
                    title="إزالة المرفق"
                    onClick={() => {
                      setStoredAttachments((current) =>
                        current.filter(
                          (attachment) => attachment.path !== item.path,
                        ),
                      );
                      setRemovedPaths((current) => [...current, item.path]);
                    }}
                    className="rounded-full px-2 text-rose-300 hover:bg-rose-500/15"
                  >
                    ×
                  </button>
                </div>
              ))}
              {pendingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-[#7d67ff] bg-[#302b50] px-3 py-2 text-xs"
                >
                  <span className="max-w-64 truncate font-semibold">
                    {file.name}
                  </span>
                  <span className="text-[#c2bbe9]">
                    {formatAttachmentSize(file.size)} · بانتظار الحفظ
                  </span>
                  <button
                    type="button"
                    aria-label={`إزالة ${file.name}`}
                    title="إزالة المرفق"
                    onClick={() =>
                      setPendingFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                    className="rounded-full px-2 text-rose-300 hover:bg-rose-500/15"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {attachmentError && (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                {attachmentError}
              </p>
            )}
            {busy && pendingFiles.length > 0 && (
              <div className="mt-3" aria-live="polite">
                <div className="mb-1 flex justify-between text-xs text-[#c2bbe9]">
                  <span>جارٍ رفع المرفق…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#151820]">
                  <div
                    className="h-full bg-gradient-to-l from-[#ff6b43] to-[#6c4cff] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

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
