import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ChevronDown } from "lucide-react";
import type { Tenant, TenantMember } from "@/lib/supabase/tenants";

interface TenantMembersCardProps {
  tenant: Tenant | null;
  members: TenantMember[];
  currentUserId: string | null;
  creatingInvite: boolean;
  updatingMemberId: string | null;
  removingMemberId: string | null;
  handleCreateInvite: () => void;
  handleChangeMemberRole: (member: TenantMember, newRole: string) => void;
  handleRemoveMember: (member: TenantMember) => void;
}

export function TenantMembersCard({
  tenant,
  members,
  currentUserId,
  creatingInvite,
  updatingMemberId,
  removingMemberId,
  handleCreateInvite,
  handleChangeMemberRole,
  handleRemoveMember,
}: TenantMembersCardProps) {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md dark:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Users className="w-4 h-4" />
          <span>Team members</span>
        </CardTitle>
        {tenant && currentUserId && tenant.owner_user_id === currentUserId && (
          <Button
            size="sm"
            onClick={handleCreateInvite}
            disabled={creatingInvite}
            className="h-8 px-3 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-1.5"
          >
            <UserPlus className="w-3 h-3" />
            <span>{creatingInvite ? "Generating..." : "Generate invite"}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            Belum ada member di tenant ini.
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-100 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.avatar_url || undefined} alt={member.user?.full_name || "User"} />
                    <AvatarFallback className="text-xs font-semibold">
                      {member.user?.full_name?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {member.user?.full_name || member.user?.email || "User"}
                      {member.user?.username && (
                        <span className="text-gray-500 dark:text-gray-400 font-normal"> ({member.user.username})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 min-w-[150px]">
                  {tenant &&
                    currentUserId &&
                    tenant.owner_user_id === currentUserId &&
                    member.role.toLowerCase() !== "owner" ? (
                      <div className="flex items-center gap-2">
                        <div className="relative inline-flex">
                          <select
                            className="appearance-none text-[11px] uppercase tracking-wide px-2 py-0.5 pr-6 rounded-full border border-input bg-background text-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={member.role}
                            disabled={updatingMemberId === member.id}
                            onChange={(e) => handleChangeMemberRole(member, e.target.value)}
                          >
                            <option value="manager">MANAGER</option>
                            <option value="staff">STAFF</option>
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-[11px] bg-red-500 hover:bg-red-600 text-white border-none"
                          disabled={removingMemberId === member.id}
                          onClick={() => handleRemoveMember(member)}
                        >
                          {removingMemberId === member.id ? "Removing..." : "Kick"}
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                      >
                        {member.role}
                      </Badge>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
