"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Building2, FileText, Phone, Mail, UserCheck, ArrowRight, UploadCloud } from "lucide-react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
export default function VendorsPortal() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // سحب البيانات من الحقول
    const formData = new FormData(e.currentTarget);
    const vendorData = {
      company_name: formData.get('company_name'),
      cr_number: formData.get('cr_number'),
      specialty: formData.get('specialty'),
      contact_person: formData.get('contact_person'),
      phone: formData.get('phone'),
      email: formData.get('email'),
    };

    // إرسال البيانات إلى جدول vendors في Supabase
    const { error } = await supabase
      .from('vendors')
      .insert([vendorData]);

    setIsSubmitting(false);

    if (error) {
      alert("حدث خطأ أثناء الإرسال: " + error.message);
    } else {
      alert("تم استلام طلب التسجيل بنجاح! البيانات الآن في قاعدة بياناتك.");
      e.currentTarget.reset(); // تفريغ الحقول بعد النجاح
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1622] text-slate-200 font-sans" dir="rtl">
      
      <header className="bg-[#142030] border-b border-[#C89840]/20 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-wide">NOVAWERK <span className="text-[#C89840]">PORTAL</span></h1>
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 lg:py-20 flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-[#142030] rounded-sm border border-[#16293B] shadow-2xl overflow-hidden"
        >
          <div className="bg-[#16293B] p-8 border-b border-[#16293B]">
            <h2 className="text-3xl font-bold text-white mb-2">تسجيل الموردين والمقاولين</h2>
            <p className="text-gray-400">انضم لشبكة شركاء النجاح في تنفيذ المشاريع الصناعية والتجارية. يرجى تعبئة البيانات بدقة لتسهيل عملية الاعتماد.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C89840]" /> اسم الشركة / المؤسسة
                </label>
                <input name="company_name" required type="text" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" placeholder="شركة ... للمقاولات" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C89840]" /> رقم السجل التجاري
                </label>
                <input name="cr_number" required type="text" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" placeholder="1010..." />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">مجال الاختصاص الرئيسي</label>
              <select name="specialty" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition">
                <option>أعمال الحفريات وتجهيز الموقع</option>
                <option>الأعمال المدنية والخرسانة</option>
                <option>الهياكل المعدنية (Steel Structure)</option>
                <option>أعمال التكييف (HVAC) والميكانيكا</option>
                <option>أعمال الأمن والسلامة (الدفاع المدني)</option>
                <option>توريد مواد البناء</option>
              </select>
            </div>

            <hr className="border-gray-800 my-6" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#C89840]" /> اسم المسؤول
                </label>
                <input name="contact_person" required type="text" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" placeholder="الاسم الكامل" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#C89840]" /> الجوال
                </label>
                <input name="phone" required type="tel" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition text-left" placeholder="05x xxx xxxx" dir="ltr" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#C89840]" /> البريد الإلكتروني
                </label>
                <input name="email" required type="email" className="w-full bg-[#0A1622] border border-gray-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition text-left" placeholder="info@company.com" dir="ltr" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#C89840] text-[#0A1622] py-4 rounded-sm font-bold text-lg hover:bg-[#b08538] transition disabled:opacity-70 mt-4"
            >
              {isSubmitting ? "جاري الإرسال..." : "تقديم طلب الاعتماد والتسجيل"}
            </button>
            
          </form>
        </motion.div>
      </main>
    </div>
  );
}