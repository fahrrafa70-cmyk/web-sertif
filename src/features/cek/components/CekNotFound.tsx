"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function CekNotFound({ router }: { router: AppRouterInstance }) {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4" style={{ minHeight: '100vh', width: '100%', backgroundColor: '#ffffff' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Certificate Not Found</h1>
        <p className="text-gray-600 mb-6">
          The certificate you&apos;re looking for doesn&apos;t exist or is no longer publicly available.
        </p>
        <Button onClick={() => router.push('/')} className="gradient-primary text-white">Go to Home</Button>
      </motion.div>
    </div>
  );
}
