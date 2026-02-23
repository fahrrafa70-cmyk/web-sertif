"use client";

import ModernLayout from "@/components/modern-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function CertificateDetailNotFound({ router, certificateNo }: { router: AppRouterInstance; certificateNo: string }) {
  return (
    <ModernLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Eye className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Certificate Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {`The certificate with number "${certificateNo}" could not be found.`}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-gray-300 dark:border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="gradient-primary text-white"
            >
              Search Again
            </Button>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
