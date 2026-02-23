import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import type { TenantMember } from "@/lib/supabase/tenants";

interface TenantActivityCardProps {
  members: TenantMember[];
}

export function TenantActivityCard({ members }: TenantActivityCardProps) {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md dark:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Link2 className="w-4 h-4" />
          <span>Activity log</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            Belum ada aktivitas pada tenant ini.
          </p>
        ) : (
          <div className="space-y-3">
            {members
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((member) => (
                <div
                  key={member.id}
                  className="flex items-start gap-3 rounded-md border border-gray-100 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <p>
                      <span className="font-medium">
                        {member.user?.full_name || member.user?.email || "User"}
                      </span>{" "}
                      bergabung sebagai{" "}
                      <span className="uppercase font-semibold">{member.role}</span>.
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {new Date(member.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
