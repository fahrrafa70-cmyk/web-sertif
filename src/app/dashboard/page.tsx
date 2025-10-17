"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/language-context";

export default function DashboardPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
              <p className="text-gray-500">{t('dashboard.overview')}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[t('templates.title'), t('certificates.title'), t('categories.title'), "Members"].map((label, idx) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="text-sm text-gray-500">{label}</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">—</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


