"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/language-context";
import { FolderOpen } from "lucide-react";

const CATEGORIES = [
  { name: "Training", template: "General Training" },
  { name: "Internship", template: "Internship" },
  { name: "MoU", template: "MoU Certificate" },
];

export default function CategoriesPage() {
  const { t } = useLanguage();
  return (
    <ModernLayout>
      <section className="relative -mt-2 pb-6 sm:-mt-3 sm:pb-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-4 relative">
          <div className="mb-3">
            <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 w-full">
              <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400 truncate">{t('categories.title')}</h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('categories.create')}</Button>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 hidden md:block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('categories.name')}</TableHead>
                  <TableHead>{t('categories.relatedTemplate')}</TableHead>
                  <TableHead className="text-right">{t('categories.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORIES.map((cat) => (
                  <TableRow key={cat.name}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.template}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-gray-300 dark:border-gray-600">{t('common.edit')}</Button>
                        <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('common.delete')}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>

          {/* Mobile Card View */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 md:hidden space-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.name} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-md">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {t('categories.name')}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {cat.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {t('categories.relatedTemplate')}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {cat.template}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" className="flex-1 border-gray-300 dark:border-gray-600">{t('common.edit')}</Button>
                    <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('common.delete')}</Button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </ModernLayout>
  );
}


