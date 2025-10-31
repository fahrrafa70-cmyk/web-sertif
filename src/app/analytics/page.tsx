"use client";

import { SiteHeader } from "@/components/site-header";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";

export default function AnalyticsPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('analytics.title')}</h1>
                <p className="text-gray-500 mt-1">{t('analytics.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {[1,2,3,4].map((i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-48" />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


