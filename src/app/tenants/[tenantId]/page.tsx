"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { useLanguage } from "@/contexts/language-context";
import {
  getTenantById,
  getTenantMembers,
  getTenantInvites,
  createTenantInvite,
  updateTenant,
  deleteTenant,
  type Tenant,
  type TenantMember,
  type TenantInvite,
} from "@/lib/supabase/tenants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Link2, Users, UserPlus, Building2 } from "lucide-react";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const tenantId = params?.tenantId as string | undefined;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [invites, setInvites] = useState<TenantInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleEditTenant = async () => {
    if (!tenant) return;

    const newName = window.prompt("Nama tenant", tenant.name);
    if (newName === null) return;

    const newType = window.prompt(
      "Tipe tenant (company, school, organization, personal, other)",
      tenant.tenant_type || "company",
    );

    try {
      setError(null);
      const updated = await updateTenant(tenant.id, {
        name: newName,
        tenant_type: newType || null,
      });
      setTenant(updated);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update tenant";
      setError(message);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant) return;
    const confirmed = window.confirm(
      "Yakin ingin menghapus tenant ini? Pastikan semua data sudah tidak diperlukan.",
    );
    if (!confirmed) return;

    try {
      setError(null);
      await deleteTenant(tenant.id);
      router.push("/tenants");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete tenant";
      setError(message);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!tenantId) return;
      try {
        setLoading(true);
        setError(null);
        const [tenantData, memberData, inviteData] = await Promise.all([
          getTenantById(tenantId),
          getTenantMembers(tenantId),
          getTenantInvites(tenantId),
        ]);
        setTenant(tenantData);
        setMembers(memberData);
        setInvites(inviteData);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load tenant";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [tenantId]);

  const baseInviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite`;
  }, []);

  const handleCreateInvite = async () => {
    if (!tenantId) return;
    try {
      setCreatingInvite(true);
      const invite = await createTenantInvite(tenantId, "staff");
      setInvites((prev) => [invite, ...prev]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create invite";
      setError(message);
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInvite = async (token: string) => {
    const url = `${baseInviteUrl}/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <ModernLayout>
        <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8">
          <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 -mt-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-b-2 border-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Loading tenant...</p>
            </div>
          </div>
        </section>
      </ModernLayout>
    );
  }

  if (error || !tenant) {
    return (
      <ModernLayout>
        <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[240px]">
            <p className="text-sm text-red-500">{error || "Tenant tidak ditemukan"}</p>
          </div>
        </section>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8" style={{ backgroundColor: "var(--background, #0b1120)" }}>
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.3fr] gap-4 sm:gap-6">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md dark:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="w-4 h-4" />
                  <span>Team members</span>
                </CardTitle>
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
                            <AvatarImage src={member.user?.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.user?.full_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {member.user?.full_name || member.user?.email || "User"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                            {member.role}
                          </Badge>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {member.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md dark:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Link2 className="w-4 h-4" />
                  <span>Invite links</span>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                  className="h-8 px-3 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-1.5"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{creatingInvite ? "Generating..." : "Generate link"}</span>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {invites.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    Belum ada invite link. Buat link untuk mengundang member baru ke tenant ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => {
                      const url = `${baseInviteUrl}/${invite.token}`;
                      const isCopied = copiedToken === invite.token;
                      return (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-gray-100 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                              {url}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                {invite.role}
                              </Badge>
                              <span>{invite.status}</span>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleCopyInvite(invite.token)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {isCopied && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 ml-1">
                              Copied
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </ModernLayout>
  );
}
