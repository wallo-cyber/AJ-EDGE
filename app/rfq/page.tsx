"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardSignature, Building, MapPin, Phone, Mail, FileText, UploadCloud, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function RFQPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      alert("تم استلام طلب التسعير بنجاح! سيتم التواصل معكم قريباً.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A1622] text-slate-200 font-sans" dir="rtl">
      
      {/* Header */}
      <header className="bg-[#142030] border-b border-[#C89840]/20 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-wide">NOVAWERK <span className="text-[#C89840]">RFQ</span></h1>
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 lg:py-20 flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl bg-[#142030] rounded-sm border border-[#16293B] shadow-2xl overflow-hidden"
        >
          <div className="bg-[#16293B] p-8 border-b border-[#16293B]">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ClipboardSignature className="w-8 h-8 text-[#C89840]" />
              طلب عرض سعر لمشروع
            </h2>
            <p className="text-gray-400">نحن هنا لتحويل رؤيتك إلى واقع هندسي. يرجى تزويدنا بالتفاصيل المبدئية لمشروعك ليتسنى لفريقنا الفني دراسته وتقديم العرض الأنسب.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* قسم بيانات العميل */}
            <div>
              <h3 className="text-lg font-bold text-[#C89840] mb-4 border-b border-gray-800 pb-2">بيانات العميل / الجهة المنسقة</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">الاسم الكريم</label>
                  <input required type="text" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500"/> الجوال</label>
                  <input required type="tel" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500"/> البريد الإلكتروني</label>
                  <input required type="email" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" dir="ltr" />
                </div>
              </div>
            </div>

            {/* قسم بيانات المشروع */}
            <div>
              <h3 className="text-lg font-bold text-[#C89840] mb-4 border-b border-gray-800 pb-2">التفاصيل الفنية للمشروع</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><Building className="w-4 h-4 text-gray-500"/> نوع المشروع</label>
                  <select className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition">
                    <option>مصنع / مستودع (صناعي)</option>
                    <option>مبنى تجاري / إداري</option>
                    <option>أعمال معدنية (Hangar/Steel)</option>
                    <option>توسعة منشأة قائمة</option>
                    <option>أخرى</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500"/> موقع المشروع</label>
                  <select className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition">
                    <option>الدمام (المدينة الصناعية - مدن)</option>
                    <option>الخبر</option>
                    <option>الجبيل</option>
                    <option>الرياض</option>
                    <option>منطقة أخرى</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500"/> وصف مختصر لنطاق العمل المطلوب</label>
                <textarea required rows={4} className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" placeholder="مثال: إنشاء هنجر معدني بمساحة 2000 متر مربع مع أعمال الأساسات..."></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2"><UploadCloud className="w-4 h-4 text-gray-500"/> إرفاق المخططات أو كراسة الشروط (BOQ)</label>
                <div className="w-full border-2 border-dashed border-gray-700 rounded-sm p-6 text-center hover:border-[#C89840] hover:bg-[#16293B] transition cursor-pointer">
                  <p className="text-sm text-gray-400">اضغط هنا لرفع الملفات أو اسحبها وأفلتها هنا (PDF, AutoCAD, Excel)</p>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#C89840] text-[#0A1622] py-4 rounded-sm font-bold text-lg hover:bg-[#b08538] transition disabled:opacity-70 mt-4"
            >
              {isSubmitting ? "جاري الإرسال..." : "تأكيد وإرسال طلب التسعير"}
            </button>
            
          </form>
        </motion.div>
      </main>
    </div>
  );
}