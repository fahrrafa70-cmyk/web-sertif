"use client";

import ModernLayout from "@/components/modern-layout";
import { useAuth } from "@/contexts/auth-context";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { TenantsHeader } from "@/features/tenants/components/TenantsHeader";
import { TenantsGrid } from "@/features/tenants/components/TenantsGrid";
import { AddTenantDialog } from "@/features/tenants/components/AddTenantDialog";
import { EditTenantDialog } from "@/features/tenants/components/EditTenantDialog";

export default function TenantsPage() {
  const { role: authRole } = useAuth();
  const {
    // list
    tenants, loading, error, currentUserId, tenantsWithData,
    handleOpenTenant, handleEditTenant, handleDeleteTenant,
    // create dialog
    createOpen, setCreateOpen, creating,
    newTenantName, setNewTenantName,
    newTenantType, setNewTenantType,
    newTenantDescription, setNewTenantDescription,
    newTenantLogoUrl, setNewTenantLogoUrl,
    newTenantCoverUrl, setNewTenantCoverUrl,
    uploadingNewLogo, uploadingNewCover,
    handleCreateTenant, handleUploadImage,
    setUploadingNewLogo, setUploadingNewCover,
    // edit dialog
    editOpen, handleCloseEditDialog, editing,
    editTenantName, setEditTenantName,
    editTenantType, setEditTenantType,
    editTenantDescription, setEditTenantDescription,
    editTenantLogoUrl, setEditTenantLogoUrl,
    editTenantCoverUrl, setEditTenantCoverUrl,
    uploadingEditLogo, uploadingEditCover,
    handleSubmitEditTenant,
    setUploadingEditLogo, setUploadingEditCover,
  } = useTenants();

  const isOwner = authRole === "owner";

  return (
    <ModernLayout>
      <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8" style={{ backgroundColor: "var(--background, #0b1120)" }}>
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <TenantsHeader 
            currentUserId={currentUserId} 
            isOwner={isOwner} 
            setCreateOpen={setCreateOpen} 
          />

          <TenantsGrid 
            tenants={tenants}
            loading={loading}
            error={error}
            currentUserId={currentUserId}
            isOwner={isOwner}
            tenantsWithData={tenantsWithData}
            setCreateOpen={setCreateOpen}
            handleOpenTenant={handleOpenTenant}
            handleEditTenant={handleEditTenant}
            handleDeleteTenant={handleDeleteTenant}
          />

        </div>

        <AddTenantDialog 
          open={createOpen}
          onOpenChange={setCreateOpen}
          creating={creating}
          newTenantName={newTenantName}
          setNewTenantName={setNewTenantName}
          newTenantType={newTenantType}
          setNewTenantType={setNewTenantType}
          newTenantDescription={newTenantDescription}
          setNewTenantDescription={setNewTenantDescription}
          newTenantLogoUrl={newTenantLogoUrl}
          setNewTenantLogoUrl={setNewTenantLogoUrl}
          newTenantCoverUrl={newTenantCoverUrl}
          setNewTenantCoverUrl={setNewTenantCoverUrl}
          uploadingNewLogo={uploadingNewLogo}
          setUploadingNewLogo={setUploadingNewLogo}
          uploadingNewCover={uploadingNewCover}
          setUploadingNewCover={setUploadingNewCover}
          handleCreateTenant={handleCreateTenant}
          handleUploadImage={handleUploadImage}
        />

        <EditTenantDialog 
          open={editOpen}
          onOpenChange={handleCloseEditDialog}
          editing={editing}
          editTenantName={editTenantName}
          setEditTenantName={setEditTenantName}
          editTenantType={editTenantType}
          setEditTenantType={setEditTenantType}
          editTenantDescription={editTenantDescription}
          setEditTenantDescription={setEditTenantDescription}
          editTenantLogoUrl={editTenantLogoUrl}
          setEditTenantLogoUrl={setEditTenantLogoUrl}
          editTenantCoverUrl={editTenantCoverUrl}
          setEditTenantCoverUrl={setEditTenantCoverUrl}
          uploadingEditLogo={uploadingEditLogo}
          setUploadingEditLogo={setUploadingEditLogo}
          uploadingEditCover={uploadingEditCover}
          setUploadingEditCover={setUploadingEditCover}
          handleSubmitEditTenant={handleSubmitEditTenant}
          handleUploadImage={handleUploadImage}
        />

      </section>
    </ModernLayout>
  );
}
