"use client";

import ModernLayout from "@/components/modern-layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/language-context";

const CATEGORIES = [
  { name: "Training", template: "General Training" },
  { name: "Internship", template: "Internship" },
  { name: "MoU", template: "MoU Certificate" },
];

export default function CategoriesPage() {
  const { t } = useLanguage();
  return (
    <ModernLayout>
      <section className="bg-white dark:bg-gray-800 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('categories.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{t('categories.subtitle')}</p>
            </div>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('categories.create')}</Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
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
        </div>
      </section>
    </ModernLayout>
  );
}


