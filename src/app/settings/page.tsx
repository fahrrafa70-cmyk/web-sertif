"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export default function SettingsPage() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
              <p className="text-gray-500 mt-1">{t('settings.subtitle')}</p>
            </div>

            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.organization')}</label>
                <Input placeholder={t('settings.organizationPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.language')}</label>
                <Input placeholder={t('settings.languagePlaceholder')} />
              </div>
              <div className="pt-2">
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('settings.save')}</Button>
              </div>
            </motion.form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


