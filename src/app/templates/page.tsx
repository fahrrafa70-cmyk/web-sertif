"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type TemplateItem = {
  id: string;
  name: string;
  orientation: "Landscape" | "Portrait";
  category: string;
};

const TEMPLATES: TemplateItem[] = [
  { id: "t1", name: "General Training", orientation: "Landscape", category: "Training" },
  { id: "t2", name: "Internship", orientation: "Portrait", category: "Internship" },
  { id: "t3", name: "MoU Certificate", orientation: "Landscape", category: "MoU" },
  { id: "t4", name: "Industrial Visit", orientation: "Landscape", category: "Visit" },
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Templates</h1>
                <p className="text-gray-500 mt-1">Manage certificate templates</p>
              </div>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">Add Template</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {TEMPLATES.map((tpl, idx) => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video rounded-lg bg-gray-50 border border-dashed border-gray-200 mb-4" />
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-gray-900">{tpl.name}</div>
                    <div className="text-sm text-gray-500">Orientation: {tpl.orientation}</div>
                    <div className="text-sm text-gray-500">Category: {tpl.category}</div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" className="border-gray-300">Preview</Button>
                    <Button variant="outline" className="border-gray-300">Edit</Button>
                    <Button variant="outline" className="border-gray-300 opacity-50 cursor-not-allowed" aria-disabled>
                      Delete
                    </Button>
                  </div>
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


