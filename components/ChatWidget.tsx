"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, User } from "lucide-react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 right-0 w-80 bg-[#142030] border border-[#C89840]/30 rounded-lg shadow-2xl overflow-hidden flex flex-col"
          >
            {/* رأس الشات */}
            <div className="bg-[#16293B] p-4 border-b border-[#C89840]/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-white font-bold text-sm">الدعم الفني - NOVAWERK</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* منطقة الرسائل */}
            <div className="p-4 h-64 overflow-y-auto bg-[#0A1622] flex flex-col gap-3">
              <div className="bg-[#16293B] text-gray-200 text-sm p-3 rounded-l-lg rounded-br-lg self-start border border-gray-700 max-w-[85%]">
                مرحباً بك في شركة نوفاويرك للمقاولات. كيف يمكننا مساعدتك في مشروعك اليوم؟
              </div>
            </div>

            {/* حقل الإدخال */}
            <div className="p-3 bg-[#142030] border-t border-gray-800 flex gap-2">
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 bg-[#0A1622] text-white text-sm rounded-sm px-3 py-2 border border-gray-700 focus:outline-none focus:border-[#C89840]"
              />
              <button className="bg-[#C89840] text-[#0A1622] p-2 rounded-sm hover:bg-[#b08538] transition flex items-center justify-center">
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* زر فتح وإغلاق الشات */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#C89840] text-[#0A1622] p-4 rounded-full shadow-lg hover:bg-[#b08538] transition transform hover:scale-110 flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}