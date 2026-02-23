import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import type { Tenant } from "@/lib/supabase/tenants";

interface TenantDetailHeaderProps {
  tenant: Tenant;
  onBack: () => void;
}

export function TenantDetailHeader({ tenant, onBack }: TenantDetailHeaderProps) {
  return (
    <div className="mb-3">
      <div className="flex flex-col gap-3 mb-4">
        {/* Title and Button Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                  {tenant.name}
                </h1>
                {tenant.tenant_type && (
                  <span className="uppercase tracking-wide text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {tenant.tenant_type}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-gray-300 dark:border-gray-700 flex items-center gap-1.5 w-fit"
            onClick={onBack}
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
