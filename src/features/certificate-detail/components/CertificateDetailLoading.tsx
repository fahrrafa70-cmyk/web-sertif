"use client";

import ModernLayout from "@/components/modern-layout";
import { Eye } from "lucide-react";

export function CertificateDetailLoading() {
  return (
    <ModernLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Loading certificate...
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Please wait while we verify your certificate.
          </p>
        </div>
      </div>
    </ModernLayout>
  );
}
