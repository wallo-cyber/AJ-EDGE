"use client";

import React from "react";
import { 
  Building2, Factory, Shield, HardHat, 
  MapPin, Phone, MessageSquare, Globe, 
  Home, Wind, ArrowLeft, Mail
} from "lucide-react";
import Link from "next/link";

// مكونات الهوية البصرية
const BrandAr = () => <span className="font-extrabold text-white">نوفا<span className="text-[#C89840]">ويرك</span></span>;
const BrandEn = () => <span className="font-extrabold text-white tracking-widest uppercase">NOV<span className="text-[#C89840]">Λ</span>WERK</span>;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0B121D] text-slate-200 font-sans relative selection:bg-[#C89840] selection:text-[#0B121D]" dir="rtl">
      
      {/* النافبار */}
      <header className="bg-[#0B121D]/95 backdrop-blur-lg border-b border-[#1E293B] py-4 sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl cursor-pointer">
              <BrandEn />
            </h1>
          </div>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-gray-300">
            <Link href="#services" className="hover:text-[#C89840] transition-colors">الخدمات</Link>
            <Link href="#why-us" className="hover:text-[#C89840] transition-colors">لماذا <BrandAr /></Link>
            <Link href="#sectors" className="hover:text-[#C89840] transition-colors">القطاعات</Link>
            <Link href="#how-it-works" className="hover:text-[#C89840] transition-colors">منهجية العمل</Link>
            <Link href="#contact" className="hover:text-[#C89840] transition-colors">تواصل معنا</Link>
          </nav>
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 bg-[#152336] text-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#C89840] hover:text-[#0B121D] transition-all border border-[#1E293B] group">
               <Globe className="w-4 h-4 text-[#C89840] group-hover:text-[#0B121D] transition-colors" />
               EN
             </button>
          </div>
        </div>
      </header>

      {/* زر التواصل العائم */}
      <a href="#contact" className="fixed bottom-8 left-8 bg-[#C89840] text-[#0B121D] px-6 py-3 rounded-full font-bold shadow-2xl shadow-[#C89840]/30 z-50 flex items-center gap-2 hover:bg-[#b08538] transition transform hover:scale-105 border-2 border-[#C89840]">
        <MessageSquare className="w-5 h-5" />
        تواصل معنا
      </a>

      {/* 
        ========================================
        قسم الهيرو - تم حذف الشعار وإرجاع النص لليمين
        ========================================
      */}
      <section className="container mx-auto px-6 py-20 lg:py-28 max-w-7xl">
        <div className="flex flex-col items-start text-right">
          
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white mb-6 leading-tight w-full">
            نبني ما <span className="text-[#C89840]">يدوم،</span><br/>
            وننفذ ما <span className="text-[#C89840]">نلتزم</span> به.
          </h1>
          
          <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-300 mb-8 leading-tight w-full flex flex-col items-end" dir="ltr">
            <span>We build what <span className="text-[#C89840]">lasts</span>,</span>
            <span>and deliver what we <span className="text-[#C89840]">commit</span> to.</span>
          </h2>
          
          <p className="text-gray-400 text-lg lg:text-xl leading-relaxed mb-10 w-full max-w-2xl text-right">
            <BrandAr /> للمقاولات العامة — تنفيذ أعمال المقاولات العامة والأعمال المدنية الصناعية والمباني السكنية والتجارية في المنطقة الشرقية، بمعايير جودة وسلامة تلتزم بالاشتراطات السعودية ومتطلبات الدفاع المدني.
          </p>
          
          <div className="flex flex-wrap gap-4 w-full justify-start mt-2">
            <a href="#contact" className="bg-[#C89840] text-[#0B121D] px-10 py-4 rounded-md font-extrabold text-lg hover:bg-[#b08538] transition">
              اطلب عرض سعر
            </a>
            <a href="#services" className="bg-transparent border border-[#475569] text-white px-10 py-4 rounded-md font-bold text-lg hover:border-[#C89840] hover:text-[#C89840] transition">
              تصفح خدماتنا
            </a>
          </div>

        </div>

        {/* الإحصائيات */}
        <div className="w-full mt-24">
          <div className="bg-[#152336]/60 border border-[#1E293B] rounded-xl grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#1E293B]">
            <div className="p-8 text-center">
              <h3 className="text-4xl font-extrabold text-[#C89840] mb-2">+7</h3>
              <p className="text-gray-300 font-bold text-sm">تخصصات تنفيذية</p>
            </div>
            <div className="p-8 text-center">
              <h3 className="text-4xl font-extrabold text-[#C89840] mb-2">100%</h3>
              <p className="text-gray-300 font-bold text-sm">التزام بالاشتراطات</p>
            </div>
            <div className="p-8 text-center">
              <h3 className="text-4xl font-extrabold text-[#C89840] mb-2">24/7</h3>
              <p className="text-gray-300 font-bold text-sm">متابعة المشاريع</p>
            </div>
            <div className="p-8 text-center">
              <h3 className="text-4xl font-extrabold text-[#C89840] mb-2">SA</h3>
              <p className="text-gray-300 font-bold text-sm">كوادر ومورّدون محليون</p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================
        قسم الخدمات
        ========================================
      */}
      <section id="services" className="py-24 bg-[#0F172A]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="mb-16 text-right">
            <div className="mb-6">
              <span className="inline-block border border-[#C89840] text-[#C89840] px-8 py-2 rounded-full text-sm font-bold bg-transparent">ما نقدمه</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">خدماتنا التنفيذية</h2>
            <p className="text-gray-400 text-lg max-w-3xl">نغطي دورة المشروع من الأعمال المدنية حتى التسليم والتشغيل، بفريق تنفيذ ومورّدين ضمن المنطقة الشرقية.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl hover:border-[#C89840]/50 transition group flex flex-col h-full text-right">
              <div className="flex justify-start mb-6">
                <div className="p-3 border border-[#475569] rounded-lg group-hover:border-[#C89840] transition">
                  <Building2 className="w-6 h-6 text-[#C89840]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">المقاولات العامة</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow">تنفيذ المشاريع الإنشائية بعقود متكاملة، من التجهيز والأعمال المدنية حتى التشطيب والتسليم النهائي.</p>
              <Link href="#" className="text-[#C89840] font-bold text-sm flex items-center gap-2 group-hover:text-white transition w-fit">
                عرض التفاصيل والصور <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl hover:border-[#C89840]/50 transition group flex flex-col h-full text-right">
              <div className="flex justify-start mb-6">
                <div className="p-3 border border-[#475569] rounded-lg group-hover:border-[#C89840] transition">
                  <Factory className="w-6 h-6 text-[#C89840]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">الأعمال المدنية الصناعية</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow">أساسات المعدات، الأرضيات الصناعية، المستودعات، والأعمال المدنية داخل المصانع والمنشآت القائمة.</p>
              <Link href="#" className="text-[#C89840] font-bold text-sm flex items-center gap-2 group-hover:text-white transition w-fit">
                عرض التفاصيل والصور <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl hover:border-[#C89840]/50 transition group flex flex-col h-full text-right">
              <div className="flex justify-start mb-6">
                <div className="p-3 border border-[#475569] rounded-lg group-hover:border-[#C89840] transition">
                  <Factory className="w-6 h-6 text-[#C89840]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">المصانع والتوسعات</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow">إنشاء المصانع الجديدة وتوسعة القائم منها، مع مراعاة استمرارية التشغيل أثناء التنفيذ.</p>
              <Link href="#" className="text-[#C89840] font-bold text-sm flex items-center gap-2 group-hover:text-white transition w-fit">
                عرض التفاصيل والصور <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-[#152336] p-8 border border-[#C89840] rounded-xl hover:bg-[#1A2C42] transition group flex flex-col h-full text-right shadow-[0_0_15px_rgba(200,152,64,0.1)]">
              <div className="flex justify-start mb-6">
                <div className="p-3 border border-[#C89840] rounded-lg group-hover:border-white transition">
                  <Building2 className="w-6 h-6 text-[#C89840] group-hover:text-white transition" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">المباني السكنية والتجارية</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow">العمائر السكنية، المجمعات التجارية، والمكاتب — تنفيذ يلتزم بالجداول الزمنية والمواصفات المعتمدة.</p>
              <Link href="#" className="text-[#C89840] font-bold text-sm flex items-center gap-2 group-hover:text-white transition w-fit">
                عرض التفاصيل والصور <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl hover:border-[#C89840]/50 transition group flex flex-col h-full text-right">
              <div className="flex justify-start mb-6">
                <div className="p-3 border border-[#475569] rounded-lg group-hover:border-[#C89840] transition">
                  <Home className="w-6 h-6 text-[#C89840]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">الفلل الخاصة</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow">بناء وتشطيب الفلل الخاصة بمستوى تنفيذ دقيق، مع إشراف مباشر ومتابعة يومية للمالك.</p>
              <Link href="#" className="text-[#C89840] font-bold text-sm flex items-center gap-2 group-hover:text-white transition w-fit">
                عرض التفاصيل والصور <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl hover:border-[#C89840]/50 transition group flex flex-col h-full text-right">
              <div className="flex justify-start mb-6">
                <div className="p-3 border border-[#475569] rounded-lg group-hover:border-[#C89840] transition">
                  <Wind className="w-6 h-6 text-[#C89840]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">أعمال التكييف</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow">توريد وتركيب أنظمة التكييف والتهوية للمنشآت السكنية والتجارية والصناعية، مع الصيانة والتشغيل.</p>
              <Link href="#" className="text-[#C89840] font-bold text-sm flex items-center gap-2 group-hover:text-white transition w-fit">
                عرض التفاصيل والصور <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================
        قسم القطاعات
        ========================================
      */}
      <section id="sectors" className="py-24 bg-[#0B121D] border-t border-[#1E293B]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="mb-12 text-right">
            <div className="mb-6">
              <span className="inline-block border border-[#C89840] text-[#C89840] px-8 py-2 rounded-full text-sm font-bold bg-transparent">من نخدم</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-4">القطاعات التي نعمل معها</h2>
            <p className="text-gray-400 text-lg max-w-3xl">نعمل مع المقاولين الرئيسيين والمطورين والمصانع وملاك المشاريع الخاصة داخل المنطقة الشرقية.</p>
          </div>
          <div className="flex flex-wrap gap-4 justify-start">
            {['المصانع والشركات الصناعية', 'القطاع السكني الخاص', 'المجمعات التجارية', 'المستودعات واللوجستيات', 'عقود الصيانة والتشغيل'].map((sector, i) => (
              <span key={i} className="bg-[#152336] border border-[#1E293B] text-gray-200 px-8 py-4 rounded-full font-bold text-sm hover:border-[#C89840] transition cursor-default shadow-md">
                {sector}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 
        ========================================
        قسم لماذا نوفاويرك
        ========================================
      */}
      <section id="why-us" className="py-24 bg-[#0F172A] border-t border-[#1E293B]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="mb-16 text-right">
            <div className="mb-6">
              <span className="inline-block border border-[#C89840] text-[#C89840] px-8 py-2 rounded-full text-sm font-bold bg-transparent">ما يميزنا</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white">لماذا <BrandAr /></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right flex flex-col">
              <span className="text-[#C89840] font-extrabold text-xl mb-4">01</span>
              <h3 className="text-xl font-bold text-white mb-4">حضور محلي في الشرقية</h3>
              <p className="text-gray-400 text-sm leading-relaxed">فريقنا ومورّدونا داخل الدمام والخبر والجبيل — استجابة أسرع للموقع وتكاليف تعبئة أقل.</p>
            </div>
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right flex flex-col">
              <span className="text-[#C89840] font-extrabold text-xl mb-4">02</span>
              <h3 className="text-xl font-bold text-white mb-4">الالتزام بالجدول الزمني</h3>
              <p className="text-gray-400 text-sm leading-relaxed">خطة تنفيذ واضحة بمراحل ومؤشرات تسليم، وتقارير تقدّم دورية للمالك دون مفاجآت.</p>
            </div>
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right flex flex-col">
              <span className="text-[#C89840] font-extrabold text-xl mb-4">03</span>
              <h3 className="text-xl font-bold text-white mb-4">السلامة أولاً</h3>
              <p className="text-gray-400 text-sm leading-relaxed">اشتراطات السلامة المهنية مطبّقة في الموقع، وتجهيز المنشأة لمتطلبات الدفاع المدني من التصميم.</p>
            </div>
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right flex flex-col">
              <span className="text-[#C89840] font-extrabold text-xl mb-4">04</span>
              <h3 className="text-xl font-bold text-white mb-4">شفافية التكلفة</h3>
              <p className="text-gray-400 text-sm leading-relaxed">عروض أسعار مبنية على كميات موثّقة وأسعار مواد محدّثة، وتوضيح مسبق لأي بند خارج النطاق.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================
        قسم كيف نعمل
        ========================================
      */}
      <section id="how-it-works" className="py-24 bg-[#0B121D] border-t border-[#1E293B]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="mb-16 text-right">
            <div className="mb-6">
              <span className="inline-block border border-[#C89840] text-[#C89840] px-8 py-2 rounded-full text-sm font-bold bg-transparent">كيف نعمل</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">من أول مكالمة حتى التسليم</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right">
              <span className="text-[#C89840] font-extrabold text-xl mb-4 block">01</span>
              <h3 className="text-xl font-bold text-white mb-4">الزيارة والدراسة</h3>
              <p className="text-gray-400 text-sm leading-relaxed">معاينة الموقع، فهم النطاق، وتحديد المتطلبات الفنية والنظامية قبل أي تسعير.</p>
            </div>
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right">
              <span className="text-[#C89840] font-extrabold text-xl mb-4 block">02</span>
              <h3 className="text-xl font-bold text-white mb-4">عرض السعر</h3>
              <p className="text-gray-400 text-sm leading-relaxed">عرض مفصّل بالكميات والمواد والجدول الزمني، بلا بنود مبهمة.</p>
            </div>
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right">
              <span className="text-[#C89840] font-extrabold text-xl mb-4 block">03</span>
              <h3 className="text-xl font-bold text-white mb-4">التنفيذ</h3>
              <p className="text-gray-400 text-sm leading-relaxed">تنفيذ مرحلي بإشراف هندسي، مع تقارير تقدّم دورية وضبط للجودة والسلامة.</p>
            </div>
            <div className="bg-[#152336] p-8 border border-[#1E293B] rounded-xl text-right">
              <span className="text-[#C89840] font-extrabold text-xl mb-4 block">04</span>
              <h3 className="text-xl font-bold text-white mb-4">التسليم والضمان</h3>
              <p className="text-gray-400 text-sm leading-relaxed">تسليم موثّق مع المخططات النهائية، وفترة ضمان ومتابعة بعد التشغيل.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================
        قسم التواصل 
        ========================================
      */}
      <section id="contact" className="py-24 bg-[#0F172A] border-t border-[#1E293B]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* الجانب الأيمن (معلومات التواصل) */}
            <div className="text-right">
              <div className="mb-6">
                <span className="inline-block border border-[#C89840] text-[#C89840] px-8 py-2 rounded-full text-sm font-bold bg-transparent">ابدأ مشروعك</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
                خبّرنا عن مشروعك<br/>ونرجع لك بعرض واضح.
              </h2>
              <p className="text-gray-400 text-lg mb-10 w-full max-w-lg ml-auto">
                سواء كان مبنى سكني، توسعة مصنع، أو حزمة أعمال من الباطن — تواصل معنا وسنرتب زيارة للموقع.
              </p>
              
              <div className="space-y-4 w-full max-w-lg ml-auto">
                <div className="flex items-center bg-[#152336] p-6 rounded-2xl border border-[#1E293B]">
                  <div className="text-right flex-grow">
                    <h4 className="text-white font-bold text-sm mb-1">الهاتف / واتساب</h4>
                    <p className="text-gray-300 font-bold text-lg" dir="ltr">+966 5X XXX XXXX</p>
                  </div>
                  <div className="p-4 border border-[#334155] rounded-xl shrink-0 mr-4">
                    <Phone className="w-6 h-6 text-[#C89840]" />
                  </div>
                </div>

                <div className="flex items-center bg-[#152336] p-6 rounded-2xl border border-[#1E293B]">
                  <div className="text-right flex-grow">
                    <h4 className="text-white font-bold text-sm mb-1">البريد الإلكتروني</h4>
                    <p className="text-gray-300 font-bold text-lg">info@novawerk.sa</p>
                  </div>
                  <div className="p-4 border border-[#334155] rounded-xl shrink-0 mr-4">
                    <Mail className="w-6 h-6 text-[#C89840]" />
                  </div>
                </div>

                <div className="flex items-center bg-[#152336] p-6 rounded-2xl border border-[#1E293B]">
                  <div className="text-right flex-grow">
                    <h4 className="text-white font-bold text-sm mb-1">الموقع</h4>
                    <p className="text-gray-400 text-sm mt-1">الدمام، المنطقة الشرقية، المملكة العربية السعودية</p>
                  </div>
                  <div className="p-4 border border-[#334155] rounded-xl shrink-0 mr-4">
                    <MapPin className="w-6 h-6 text-[#C89840]" />
                  </div>
                </div>
              </div>
            </div>

            {/* الجانب الأيسر (النموذج) */}
            <div className="bg-[#152336] p-8 lg:p-10 rounded-2xl border border-[#1E293B] shadow-2xl w-full">
              <div className="text-right mb-8">
                <h3 className="text-3xl font-extrabold text-white mb-2">طلب عرض سعر</h3>
                <p className="text-gray-400 text-sm">عبّئ البيانات وسنتواصل معك خلال يوم عمل.</p>
              </div>
              
              <form className="space-y-6 text-right">
                <div className="w-full">
                  <label className="block text-sm font-bold text-gray-300 mb-2">الاسم</label>
                  <input type="text" className="w-full bg-[#0B121D] border border-[#1E293B] rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C89840] transition text-right" />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-bold text-gray-300 mb-2">رقم الجوال</label>
                  <input type="tel" dir="ltr" className="w-full bg-[#0B121D] border border-[#1E293B] rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C89840] transition text-right" />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-bold text-gray-300 mb-2">نوع المشروع</label>
                  <select className="w-full bg-[#0B121D] border border-[#1E293B] rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C89840] transition text-right appearance-none" dir="rtl">
                    <option>مقاولات عامة</option>
                    <option>أعمال مدنية</option>
                    <option>تشطيبات</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-bold text-gray-300 mb-2">تفاصيل المشروع</label>
                  <textarea rows={5} className="w-full bg-[#0B121D] border border-[#1E293B] rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C89840] transition text-right resize-none" placeholder="الموقع، المساحة التقريبية، والمدة المطلوبة..."></textarea>
                </div>
                <button type="button" className="w-full bg-[#C89840] text-[#0B121D] py-4 rounded-lg font-extrabold text-xl hover:bg-[#b08538] transition mt-2">
                  إرسال الطلب
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* الفوتر */}
      <footer className="bg-[#0B121D] border-t border-[#1E293B] py-12">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-right mb-12 border-b border-[#1E293B] pb-12">
            <div>
              <div className="mb-6">
                <BrandEn />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm ml-auto">
                <BrandAr /> للمقاولات العامة — تنفيذ مشاريع المقاولات والأعمال المدنية الصناعية في المنطقة الشرقية بالمملكة العربية السعودية.
              </p>
            </div>
            <div>
              <h4 className="text-[#C89840] font-bold mb-6">روابط</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link href="#services" className="hover:text-white transition">الخدمات</Link></li>
                <li><Link href="#why-us" className="hover:text-white transition">لماذا نوفاويرك</Link></li>
                <li><Link href="#sectors" className="hover:text-white transition">القطاعات</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition">منهجية العمل</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#C89840] font-bold mb-6">تواصل</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li dir="ltr" className="text-right">+966 5X XXX XXXX</li>
                <li>info@novawerk.sa</li>
                <li><a href="#contact" className="hover:text-white transition">اطلب عرض سعر</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div>
              الدمام • المملكة العربية السعودية
            </div>
            <div>
               © 2026 نوفاويرك للمقاولات العامة. جميع الحقوق محفوظة.
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}