import { getSupabaseClient } from './client';

export const COMPANY_DOCUMENT_BUCKET='company-documents';
export const MB=1024*1024;

const limitsByExtension:Record<string,number>={
  pdf:100*MB,
  doc:50*MB, docx:50*MB,
  xls:50*MB, xlsx:50*MB,
  jpg:30*MB, jpeg:30*MB, png:30*MB, webp:30*MB,
};
const allowedMimeTypes=new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg','image/png','image/webp'
]);

export function fileExtension(file:File){
  return (file.name.split('.').pop()||'').toLowerCase();
}

export function uploadLimitFor(file:File,readinessItemKey?:string){
  const ext=fileExtension(file);
  if(readinessItemKey==='prof' && ext==='pdf') return 150*MB;
  return limitsByExtension[ext]??0;
}

export function validateCompanyDocument(file:File,readinessItemKey?:string){
  const ext=fileExtension(file);
  const limit=uploadLimitFor(file,readinessItemKey);
  if(!limit) throw new Error('صيغة الملف غير مدعومة. الصيغ المسموحة: PDF، Word، Excel، JPG، PNG، WEBP.');
  if(file.type && !allowedMimeTypes.has(file.type)) throw new Error(`نوع الملف غير مدعوم (${file.type}).`);
  if(file.size>limit){
    const max=Math.round(limit/MB);
    const actual=(file.size/MB).toFixed(1);
    throw new Error(`حجم الملف ${actual} MB ويتجاوز الحد المسموح ${max} MB لهذا النوع.`);
  }
  return {ext,limit};
}

export async function uploadCompanyDocument(file:File,readinessItemKey?:string){
  validateCompanyDocument(file,readinessItemKey);
  const supabase=getSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('يجب تسجيل الدخول أولاً.');
  const ext=fileExtension(file)||'bin';
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-90);
  const path=`${user.id}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName || `document.${ext}`}`;
  const {data,error}=await supabase.storage.from(COMPANY_DOCUMENT_BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
  if(error){
    const msg=String(error.message||'');
    if(/size|maximum|limit|too large/i.test(msg)) throw new Error('رفض التخزين حجم الملف. الحد العام للتخزين 150 MB، مع حدود أقل حسب نوع المستند.');
    if(/mime|content.?type|type/i.test(msg)) throw new Error('رفض التخزين صيغة الملف. استخدم PDF أو Word أو Excel أو JPG/PNG/WEBP.');
    throw new Error(`تعذر رفع المستند: ${msg || 'خطأ غير معروف في التخزين.'}`);
  }
  return data.path;
}

export async function openCompanyDocument(path:string){
  const {data,error}=await getSupabaseClient().storage.from(COMPANY_DOCUMENT_BUCKET).createSignedUrl(path,300);
  if(error||!data?.signedUrl)throw new Error('تعذر فتح المستند.');
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
}

export async function deleteCompanyDocumentFile(path:string){
  const {error}=await getSupabaseClient().storage.from(COMPANY_DOCUMENT_BUCKET).remove([path]);
  if(error)throw new Error('تعذر حذف ملف المستند.');
}
