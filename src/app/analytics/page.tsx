"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const { t } = useLanguage();
  return (
    <ModernLayout>
      <section className="relative -mt-2 pb-6 sm:-mt-3 sm:pb-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-4 relative">
          <div className="mb-3">
            <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 w-full">
              <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400 truncate">{t('analytics.title')}</h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {[1,2,3,4].map((i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm h-48" />
            ))}
          </div>
        </div>
      </section>
    </ModernLayout>
  );
}


