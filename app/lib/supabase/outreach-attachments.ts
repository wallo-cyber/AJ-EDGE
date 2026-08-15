import { getSupabaseClient, getSupabaseProjectId } from "./client";
import { Upload } from "tus-js-client";

export const OUTREACH_ATTACHMENT_BUCKET = "outreach-attachments";
export const MAX_OUTREACH_ATTACHMENT_BYTES = 100 * 1024 * 1024;
const RESUMABLE_UPLOAD_THRESHOLD = 6 * 1024 * 1024;

export type OutreachAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
};

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024)
    return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

export function validateOutreachAttachment(file: File) {
  if (!file.size) throw new Error(`الملف «${file.name}» فارغ.`);
  if (file.size > MAX_OUTREACH_ATTACHMENT_BYTES) {
    throw new Error(`الملف «${file.name}» أكبر من الحد المسموح 100 ميغابايت.`);
  }
}

export function parseOutreachAttachments(value: unknown): OutreachAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    const path = String(row.path ?? "").trim();
    if (!name || !path) return [];
    return [
      {
        name,
        path,
        size: Number(row.size ?? 0),
        type: String(row.type ?? "application/octet-stream"),
      },
    ];
  });
}

async function uploadFile(
  file: File,
  path: string,
  onProgress?: (uploaded: number, total: number) => void,
) {
  const supabase = getSupabaseClient();
  if (file.size <= RESUMABLE_UPLOAD_THRESHOLD) {
    const { error } = await supabase.storage
      .from(OUTREACH_ATTACHMENT_BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (error) throw error;
    onProgress?.(file.size, file.size);
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    throw new Error("انتهت جلسة الدخول. سجل الدخول ثم أعد المحاولة.");
  const projectId = getSupabaseProjectId();

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: OUTREACH_ATTACHMENT_BUCKET,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onProgress: (uploaded, total) => onProgress?.(uploaded, total),
      onError: reject,
      onSuccess: () => resolve(),
    });
    void upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length)
          upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
  });
}

export async function uploadOutreachAttachments(
  files: File[],
  onProgress?: (file: File, uploaded: number, total: number) => void,
) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");

  const uploaded: OutreachAttachment[] = [];
  for (const file of files) {
    validateOutreachAttachment(file);
    const safeName =
      file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "attachment";
    const path = `${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
    try {
      await uploadFile(file, path, (bytesUploaded, bytesTotal) =>
        onProgress?.(file, bytesUploaded, bytesTotal),
      );
    } catch (reason) {
      if (uploaded.length)
        await supabase.storage
          .from(OUTREACH_ATTACHMENT_BUCKET)
          .remove(uploaded.map((item) => item.path));
      const message = reason instanceof Error ? reason.message : String(reason);
      if (/size|maximum|limit|too large|payload/i.test(message)) {
        throw new Error(
          `تعذر رفع «${file.name}»: الحد الأقصى 100 ميغابايت لكل ملف.`,
        );
      }
      throw new Error(`تعذر رفع «${file.name}»: ${message}`);
    }
    uploaded.push({
      name: file.name,
      path,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  }
  return uploaded;
}

export async function openOutreachAttachment(path: string) {
  const { data, error } = await getSupabaseClient()
    .storage.from(OUTREACH_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error("تعذر فتح المرفق.");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function deleteOutreachAttachments(paths: string[]) {
  if (!paths.length) return;
  const { error } = await getSupabaseClient()
    .storage.from(OUTREACH_ATTACHMENT_BUCKET)
    .remove(paths);
  if (error) throw new Error("تعذر حذف المرفق من التخزين.");
}
