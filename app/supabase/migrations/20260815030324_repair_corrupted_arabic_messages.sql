with templates(template_name, subject, body) as (
  values
    ('Initial Email', 'تعارف وفرص تعاون', 'تحية طيبة إلى {{company}}، نرغب في التعارف وبحث {{focus}}. يمكننا مشاركة الملف التعريفي عند الطلب، ويسعدنا معرفة آلية التسجيل أو الشخص المختص.'),
    ('Short WhatsApp', 'تعارف مختصر', 'السلام عليكم، نتواصل للتعارف مع {{company}} وبحث {{focus}}. نأمل توجيهنا للمسؤول المختص.'),
    ('LinkedIn Intro', 'تعارف مهني', 'مرحباً، يسعدنا التعارف مع {{company}} وبحث {{focus}} والتواصل مع المسؤول المختص.'),
    ('Phone Call Opening', 'افتتاحية مكالمة', 'السلام عليكم، نتواصل للتعريف المختصر وبحث {{focus}} لدى {{company}}. هل يمكن توجيهنا لمسؤول المشاريع أو المشتريات؟'),
    ('Follow-up 1', 'متابعة أولى', 'تحية طيبة، نتابع بلطف تواصلنا مع {{company}} بشأن {{focus}}.'),
    ('Follow-up 2', 'متابعة ثانية', 'تحية طيبة، متابعة أخيرة غير مزعجة مع {{company}} بشأن {{focus}}.'),
    ('Revisit Later', 'إعادة تواصل لاحقاً', 'تحية طيبة، نعيد التواصل مع {{company}} في وقت مناسب لبحث {{focus}}.')
), repaired as (
  select m.id, t.subject,
    replace(replace(t.body, '{{company}}', c.company_name), '{{focus}}',
      case c.company_type
        when 'Factory' then 'الأعمال المدنية والإنشاءات الصناعية والتوسعات والصيانة الإنشائية'
        when 'Industrial Company' then 'الأعمال المدنية والإنشاءات الصناعية والتوسعات والصيانة الإنشائية'
        when 'Main Contractor' then 'حزم المقاولات الباطنة والأعمال المدنية والمعمارية والصناعية'
        when 'Real Estate Developer' then 'التسجيل كمقاول والمشاريع المستقبلية وحزم الأعمال المدنية والمعمارية'
        else 'فرص أعمال المقاولات والتنفيذ المناسبة'
      end) as body
  from public.messages m
  join public.companies c on c.id = m.company_id
  join templates t on t.template_name = m.template_name
  where m.body like '%ھ%' or m.subject like '%ھ%'
)
update public.messages m
set subject = repaired.subject,
    body = repaired.body,
    updated_at = now()
from repaired
where m.id = repaired.id;
