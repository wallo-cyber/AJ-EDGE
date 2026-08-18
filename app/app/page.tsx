import Link from "next/link";
import { CRMPage } from "../components/crm-shell";

const workAreas = [
  {
    title: "مركز الاستقطاب",
    description: "أولويات اليوم، أفضل الفرص، وحركة الوكلاء.",
    href: "/daily",
    icon: "◎",
  },
  {
    title: "السوق والشركات",
    description: "ملفات الشركات، التأهيل، وصنّاع القرار.",
    href: "/companies",
    icon: "◉",
  },
  {
    title: "ذكاء المشاريع",
    description: "المشاريع المحفوظة، الأطراف، الحزم، ومسار الوصول.",
    href: "/intelligence",
    icon: "◇",
  },
  {
    title: "فريق التسويق",
    description: "المهندسون، التواصل، والأداء الأسبوعي.",
    href: "/marketing",
    icon: "▣",
  },
  {
    title: "العلاقات والتواصل",
    description: "العلاقات، الشركاء، المسودات، والمتابعات.",
    href: "/relationships",
    icon: "↗",
  },
  {
    title: "الفرص والنتائج",
    description: "خط المبيعات، العروض، العقود، والتقارير.",
    href: "/pipeline",
    icon: "◆",
  },
] as const;

export default function Home() {
  return (
    <CRMPage
      title="واجهة الموقع"
      description="نقطة البداية الموحدة لمنصة نوفافيرك. اختر مساحة العمل التي تريدها دون فقدان مكانك داخل النظام."
      action={
        <Link href="/daily" className="btn-primary">
          فتح عمل اليوم
        </Link>
      }
    >
      <section className="crm-card overflow-hidden p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black tracking-[.28em] text-[#ff9b4a]">
            نوفافيرك BUSINESS DEVELOPMENT
          </p>
          <h3 className="mt-3 text-3xl font-black sm:text-4xl">
            من السوق إلى المشروع، ثم إلى الإيراد
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#8f96a3]">
            واجهة تشغيل واحدة لمتابعة الشركات والمشاريع والعلاقات والتواصل، مع
            بقاء القرار البشري واضحًا في كل مرحلة.
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {workAreas.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="crm-card group flex min-h-40 flex-col justify-between p-5 transition hover:-translate-y-1 hover:border-[var(--nav-accent)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[rgba(199,154,43,.16)] text-xl text-[var(--nav-accent)]">
              {area.icon}
            </span>
            <div className="mt-6">
              <h3 className="text-lg font-black group-hover:text-[#ff9b4a]">
                {area.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#8f96a3]">
                {area.description}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </CRMPage>
  );
}
