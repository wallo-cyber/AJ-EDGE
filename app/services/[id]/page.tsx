"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Image as ImageIcon } from "lucide-react";

// مكونات الهوية
const BrandEn = () => <span className="font-extrabold text-white tracking-widest uppercase">NOV<span className="text-[#C89840]">Λ</span>WERK</span>;

export default function ServiceDetailsPage() {
  // هذه بيانات وهمية مؤقتة، لاحقاً سنسحبها من Supabase حسب الـ ID
  const serviceData = {
    title: "المقاولات العامة",
    description: "تنفيذ المشاريع الإنشائية بعقود متكاملة، من التجهيز والأعمال المدنية حتى التشطيب والتسليم النهائي بتسليم مفتاح، مع ضمان أعلى معايير الجودة والالتزام بالجدول الزمني المعتمد.",
    features: [
      "إدارة شاملة للمشروع من الحفر حتى تسليم المفتاح.",
      "توفير عمالة ماهرة وموردين معتمدين في المنطقة الشرقية.",
      "تطبيق صارم لاشتراطات الكود السعودي.",
      "تقارير أسبوعية لنسب الإنجاز بشفافية تامة."
    ],
    // صور مؤقتة لمعرض الصور (Placeholder)
    gallery: [
      "/images/placeholder-1.jpg", 
      "/images/placeholder-2.jpg",
      "/images/placeholder-3.jpg",
      "/images/placeholder-4.jpg",
      "/images/placeholder-5.jpg",
      "/images/placeholder-6.jpg",
    ]
  };

  return (
    <div className="min-h-screen bg-[#0B121D] text-slate-200 font-sans selection:bg-[#C89840] selection:text-[#0B121D]" dir="rtl">
      
      {/* هيدر بسيط مخصص للصفحات الداخلية */}
      <header className="bg-[#0B121D]/95 backdrop-blur-lg border-b border-[#1E293B] py-4 sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between max-w-7xl">
          <Link href="/" className="text-2xl cursor-pointer">
            <BrandEn />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-[#C89840] transition font-bold text-sm">
            العودة للرئيسية <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* قسم عنوان الخدمة وتفاصيلها */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            
            {/* النصوص (اليمين) */}
            <div className="w-full lg:w-1/2 text-right">
              <span className="inline-block border border-[#C89840] text-[#C89840] px-6 py-2 rounded-full text-sm font-bold bg-transparent mb-6">
                تفاصيل الخدمة
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
                {serviceData.title}
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-10">
                {serviceData.description}
              </p>
              
              <h3 className="text-2xl font-bold text-white mb-6">نطاق العمل ومميزات التنفيذ</h3>
              <ul className="space-y-4">
                {serviceData.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 justify-end text-gray-300">
                    <span className="text-right leading-relaxed">{feature}</span>
                    <CheckCircle className="w-6 h-6 text-[#C89840] shrink-0 mt-0.5" />
                  </li>
                ))}
              </ul>
            </div>

            {/* صورة رئيسية للخدمة (اليسار) */}
            <div className="w-full lg:w-1/2">
              <div className="bg-[#152336] border border-[#1E293B] rounded-2xl w-full h-96 lg:h-[500px] flex items-center justify-center relative overflow-hidden shadow-2xl">
                {/* ستستبدل هذه الأيقونة بصورة حقيقية من قاعدة البيانات لاحقاً */}
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 text-[#475569] mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500 font-bold">الصورة الرئيسية للمشروع</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* معرض الصور (Gallery) */}
      <section className="py-24 bg-[#0F172A] border-t border-[#1E293B]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="mb-16 text-right">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">معرض أعمالنا</h2>
            <p className="text-gray-400 text-lg">مجموعة من الصور الموثقة لتنفيذنا في هذا القطاع.</p>
          </div>

          {/* شبكة الصور (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceData.gallery.map((image, idx) => (
              <div key={idx} className="group relative aspect-video bg-[#152336] rounded-xl border border-[#1E293B] overflow-hidden hover:border-[#C89840] transition cursor-pointer">
                {/* الحاوية المؤقتة للصور */}
                <div className="absolute inset-0 flex items-center justify-center">
                   <ImageIcon className="w-10 h-10 text-[#334155] opacity-50" />
                </div>
                {/* 
                  هنا سنضع وسم الصورة لاحقاً:
                  <img src={image} alt={`Project ${idx}`} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                */}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* دعوة للتواصل (CTA) */}
      <section className="py-20 bg-[#0B121D] border-t border-[#1E293B] text-center">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-6">جاهز لبدء مشروعك معنا؟</h2>
          <p className="text-gray-400 text-lg mb-10">تواصل معنا الآن للحصول على استشارة هندسية وعرض سعر مخصص لمشروعك.</p>
          <Link href="/#contact" className="inline-block bg-[#C89840] text-[#0B121D] px-12 py-4 rounded-md font-extrabold text-lg hover:bg-[#b08538] transition shadow-[0_0_20px_rgba(200,152,64,0.3)]">
            اطلب عرض سعر
          </Link>
        </div>
      </section>

    </div>
  );
}