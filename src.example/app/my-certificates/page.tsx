"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/language-context";

const MY_CERTS = [
  { number: "EC-2025-1001", category: "Training", issueDate: "2025-04-02" },
  { number: "EC-2025-1033", category: "Internship", issueDate: "2025-06-18" },
];

export default function MyCertificatesPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('myCertificates.title')}</h1>
                <p className="text-gray-500 mt-1">{t('myCertificates.subtitle')}</p>
              </div>
              <Input placeholder={t('myCertificates.search')} className="w-72" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('certificates.certificateId')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>{t('certificates.issuedDate')}</TableHead>
                    <TableHead className="text-right">{t('certificates.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MY_CERTS.map((c) => (
                    <TableRow key={c.number}>
                      <td className="px-4 py-3 font-medium">{c.number}</td>
                      <td className="px-4 py-3">{c.category}</td>
                      <td className="px-4 py-3">{c.issueDate}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="border-gray-300">{t('common.preview')}</Button>
                          <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">{t('myCertificates.download')}</Button>
                        </div>
                      </td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


