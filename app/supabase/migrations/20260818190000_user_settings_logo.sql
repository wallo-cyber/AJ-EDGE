-- شعار مخصص يرفعه المستخدم من صفحة الإعدادات، يُخزَّن كـ data URL (بلا حاجة لـ storage bucket جديد)
alter table public.user_settings
  add column if not exists logo_data_url text;
