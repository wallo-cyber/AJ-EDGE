"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { UploadCloud, CheckCircle, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("المقاولات العامة");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setMessage("الرجاء إدخال العنوان واختيار صورة!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 1. رفع الصورة إلى Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`; // اسم فريد للصورة
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. جلب الرابط العام للصورة
      const { data: publicUrlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(fileName);
      
      const imageUrl = publicUrlData.publicUrl;

      // 3. حفظ بيانات المشروع في جدول Portfolio
      const { error: insertError } = await supabase
        .from("portfolio")
        .insert([{ title, category, image_url: imageUrl }]);

      if (insertError) throw insertError;

      setMessage("تم رفع المشروع بنجاح! ✅");
      setTitle("");
      setFile(null);
    } catch (error: any) {
      console.error(error);
      setMessage(`حدث خطأ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B121D] text-slate-200 font-sans p-6 lg:p-12" dir="rtl">
      <div className="max-w-2xl mx-auto bg-[#152336] p-8 lg:p-12 rounded-2xl border border-[#1E293B] shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2">لوحة تحكم <span className="text-[#C89840]">نوفاويرك</span></h1>
          <p className="text-gray-400">أضف أعمالاً وصوراً جديدة لمعرض مشاريعك</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 text-center font-bold ${message.includes("بنجاح") ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">عنوان المشروع / الصورة</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0B121D] border border-[#1E293B] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition" 
              placeholder="مثال: تشطيب فيلا سكنية في الخبر..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">القسم (القطاع)</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0B121D] border border-[#1E293B] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C89840] transition appearance-none"
            >
              <option value="المقاولات العامة">المقاولات العامة</option>
              <option value="الأعمال المدنية الصناعية">الأعمال المدنية الصناعية</option>
              <option value="المصانع والتوسعات">المصانع والتوسعات</option>
              <option value="المباني السكنية والتجارية">المباني السكنية والتجارية</option>
              <option value="الفلل الخاصة">الفلل الخاصة</option>
              <option value="أعمال التكييف">أعمال التكييف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">اختر الصورة</label>
            <div className="w-full bg-[#0B121D] border-2 border-dashed border-[#1E293B] rounded-lg p-8 text-center hover:border-[#C89840] transition cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center pointer-events-none">
                {file ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                    <span className="text-gray-300 font-bold">{file.name}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-[#C89840] mb-3" />
                    <span className="text-gray-400 font-medium">اضغط هنا أو اسحب الصورة لإرفاقها</span>
                    <span className="text-gray-500 text-xs mt-2">JPG, PNG (يفضل ضغط الصور قبل رفعها)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#C89840] text-[#0B121D] py-4 rounded-lg font-extrabold text-lg hover:bg-[#b08538] transition disabled:opacity-50 mt-6"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "رفع وإضافة المشروع"}
          </button>
        </form>
      </div>
    </div>
  );
}