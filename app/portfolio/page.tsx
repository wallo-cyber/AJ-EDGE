"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Factory, Frame, Building2, ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

export default function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState("الكل");

  const categories = ["الكل", "مصانع ومستودعات", "هياكل معدنية", "مباني تجارية"];

  const projects = [
    {
      id: 1,
      title: "توسعة مصنع باتوك (المرحلة الثانية)",
      category: "مصانع ومستودعات",
      location: "المنطقة الشرقية",
      description: "إدارة شاملة لأعمال التوسعة، شاملة تقييم العطاءات ومراجعة جداول الكميات الإنشائية لضمان الجودة.",
      icon: <Factory className="w-6 h-6 text-[#C89840]" />
    },
    {
      id: 2,
      title: "مصنع الإضاءة المتقدمة",
      category: "مصانع ومستودعات",
      location: "المدينة الصناعية",
      description: "التنسيق الهندسي ومتابعة التعديلات التصميمية الدقيقة للمنشأة وفق أعلى المعايير.",
      icon: <Factory className="w-6 h-6 text-[#C89840]" />
    },
    {
      id: 3,
      title: "مصانع بوان وفاريل",
      category: "مصانع ومستودعات",
      location: "مدن (MODON)",
      description: "تجهيز واعتماد المخططات والوثائق الهندسية الشاملة عبر منصة مدن شريك.",
      icon: <Building2 className="w-6 h-6 text-[#C89840]" />
    },
    {
      id: 4,
      title: "مشاريع الهناجر المعدنية المتكاملة",
      category: "هياكل معدنية",
      location: "الدمام",
      description: "تصميم وتنفيذ وتعديل الهياكل المعدنية (Steel Structures) وإدارة المخططات الهندسية بدقة.",
      icon: <Frame className="w-6 h-6 text-[#C89840]" />
    },
    {
      id: 5,
      title: "المجمعات الترفيهية والتجارية",
      category: "مباني تجارية",
      location: "الدمام",
      description: "تطوير وإدارة المساحات التجارية والترفيهية (مثل مجمعات الترامبولين) ضمن مراكز التسوق (Strip Malls).",
      icon: <Building2 className="w-6 h-6 text-[#C89840]" />
    }
  ];

  const filteredProjects = activeFilter === "الكل" 
    ? projects 
    : projects.filter(p => p.category === activeFilter);

  return (
    <div className="min-h-screen bg-[#0A1622] text-slate-200 font-sans" dir="rtl">
      
      {/* Header */}
      <header className="bg-[#142030] border-b border-[#C89840]/20 py-4 sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-wide">NOVAWERK <span className="text-[#C89840]">PORTFOLIO</span></h1>
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#C89840] transition">
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 lg:py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-white mb-4">سجل <span className="text-[#C89840]">المشاريع</span> والإنجازات</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            نستعرض هنا نخبة من أعمالنا في قطاع المقاولات العامة، حيث نجسد التزامنا بالجودة والاحترافية في كل مشروع، من المصانع المتقدمة إلى الهياكل المعدنية والمجمعات التجارية.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeFilter === category 
                  ? "bg-[#C89840] text-[#0A1622]" 
                  : "bg-[#16293B] text-gray-400 hover:bg-[#142030] border border-[#16293B] hover:border-[#C89840]/50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-[#142030] border border-[#16293B] hover:border-[#C89840]/50 rounded-sm overflow-hidden group transition-all"
            >
              <div className="h-48 bg-[#16293B] relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#142030] to-transparent z-10"></div>
                <div className="transform group-hover:scale-110 transition duration-500 z-0 opacity-50">
                   {project.icon}
                </div>
                <span className="absolute top-4 right-4 z-20 bg-[#C89840] text-[#0A1622] text-xs font-bold px-3 py-1 rounded-sm">
                  {project.category}
                </span>
              </div>
              
              <div className="p-6 relative z-20">
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#C89840] transition">{project.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <MapPin className="w-4 h-4" />
                  {project.location}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  {project.description}
                </p>
                <button className="text-[#C89840] text-sm font-bold flex items-center gap-2 hover:text-white transition">
                  عرض تفاصيل المشروع
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}