"use client";

import { useParams } from "next/navigation";
import ModernLayout from "@/components/modern-layout";
import { useTenantDetail } from "@/features/tenant-detail/hooks/useTenantDetail";
import { TenantDetailHeader } from "@/features/tenant-detail/components/TenantDetailHeader";
import { TenantMembersCard } from "@/features/tenant-detail/components/TenantMembersCard";
import { TenantActivityCard } from "@/features/tenant-detail/components/TenantActivityCard";
import { EditTenantDetailDialog } from "@/features/tenant-detail/components/EditTenantDetailDialog";

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string | undefined;

  const {
    tenant,
    members,
    loading,
    error,
    currentUserId,
    creatingInvite,
    editOpen,
    setEditOpen,
    editing,
    editTenantName,
    setEditTenantName,
    editTenantType,
    setEditTenantType,
    editTenantDescription,
    setEditTenantDescription,
    updatingMemberId,
    removingMemberId,
    handleEditTenant,
    handleChangeMemberRole,
    handleRemoveMember,
    handleSubmitEditTenant,
    handleDeleteTenant, // can be used in a broader menu later
    handleCreateInvite,
    router,
  } = useTenantDetail(tenantId);

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
          <TenantDetailHeader tenant={tenant} onBack={() => router.push("/tenants")} />

          {/* Team Members and Activity Log - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.3fr] gap-4 sm:gap-6">
            <TenantMembersCard
              tenant={tenant}
              members={members}
              currentUserId={currentUserId}
              creatingInvite={creatingInvite}
              updatingMemberId={updatingMemberId}
              removingMemberId={removingMemberId}
              handleCreateInvite={handleCreateInvite}
              handleChangeMemberRole={handleChangeMemberRole}
              handleRemoveMember={handleRemoveMember}
            />

            <TenantActivityCard members={members} />
          </div>
        </div>
      </section>

      <EditTenantDetailDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        editTenantName={editTenantName}
        setEditTenantName={setEditTenantName}
        editTenantType={editTenantType}
        setEditTenantType={setEditTenantType}
        editTenantDescription={editTenantDescription}
        setEditTenantDescription={setEditTenantDescription}
        onSubmit={handleSubmitEditTenant}
      />
    </ModernLayout>
  );
}
