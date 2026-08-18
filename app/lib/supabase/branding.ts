import { getSupabaseClient } from './client';

/** يخزَّن شعار الشركة كـ data URL داخل user_settings.logo_data_url — لا يحتاج bucket تخزين جديد. */
const STORAGE_KEY = 'نوفافيرك-logo-data-url';

export function cachedLogoUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function setCachedLogoUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (url) window.localStorage.setItem(STORAGE_KEY, url);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* تخزين محلي معطّل أو ممتلئ — نتجاهل، السجل في Supabase يبقى المرجع */
  }
}

export async function fetchLogoUrl(): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from('user_settings')
    .select('logo_data_url')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const url =
    typeof data.logo_data_url === 'string' && data.logo_data_url.trim()
      ? data.logo_data_url
      : null;
  setCachedLogoUrl(url);
  return url;
}

export async function saveLogoUrl(dataUrl: string | null) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('انتهت جلسة الدخول.');
  const { error } = await supabase.from('user_settings').upsert({
    owner_id: user.id,
    logo_data_url: dataUrl,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  setCachedLogoUrl(dataUrl);
}

/** يضغط أي صورة مرفوعة إلى data URL بعرض أقصى معقول — يمنع تخزين ملفات ضخمة كنص. */
export function resizeImageToDataUrl(file: File, maxDim = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('اختر ملف صورة (PNG أو JPG أو SVG أو WEBP).'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('حجم الصورة أكبر من 8 ميغابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذرت قراءة الملف.'));
    reader.onload = () => {
      const src = String(reader.result || '');
      if (file.type === 'image/svg+xml') {
        // SVG متجه — لا حاجة لإعادة الرسم على canvas
        resolve(src);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('تعذرت قراءة الصورة.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
