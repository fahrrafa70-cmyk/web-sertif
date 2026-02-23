"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const TENANT_TYPE_OPTIONS = [
  { value: "company",      label: "Perusahaan / Industri" },
  { value: "school",       label: "Sekolah / Kampus" },
  { value: "organization", label: "Organisasi / Komunitas" },
  { value: "personal",     label: "Pribadi / Freelancer" },
  { value: "other",        label: "Lainnya" },
];

const SELECT_CLS = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400";
const TEXTAREA_CLS = `${SELECT_CLS} min-h-[80px] resize-y`;
const UPLOAD_LABEL_CLS = "inline-flex items-center px-3 py-1.5 rounded-md border cursor-pointer text-xs sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";

interface EditTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  editTenantName: string;
  setEditTenantName: (name: string) => void;
  editTenantType: string;
  setEditTenantType: (type: string) => void;
  editTenantDescription: string;
  setEditTenantDescription: (desc: string) => void;
  editTenantLogoUrl: string;
  setEditTenantLogoUrl: (url: string) => void;
  editTenantCoverUrl: string;
  setEditTenantCoverUrl: (url: string) => void;
  uploadingEditLogo: boolean;
  setUploadingEditLogo: (uploading: boolean) => void;
  uploadingEditCover: boolean;
  setUploadingEditCover: (uploading: boolean) => void;
  handleSubmitEditTenant: () => void;
  handleUploadImage: (
    e: React.ChangeEvent<HTMLInputElement>,
    bucket: "profile" | "cover",
    setUrl: (url: string) => void,
    setUploading: (uploading: boolean) => void
  ) => Promise<void>;
}

export function EditTenantDialog({
  open, onOpenChange, editing,
  editTenantName, setEditTenantName,
  editTenantType, setEditTenantType,
  editTenantDescription, setEditTenantDescription,
  editTenantLogoUrl, setEditTenantLogoUrl,
  editTenantCoverUrl, setEditTenantCoverUrl,
  uploadingEditLogo, setUploadingEditLogo,
  uploadingEditCover, setUploadingEditCover,
  handleSubmitEditTenant, handleUploadImage
}: EditTenantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit tenant</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-name">Nama tenant / organisasi</Label>
            <Input id="edit-tenant-name" value={editTenantName} onChange={(e) => setEditTenantName(e.target.value)}
              placeholder="Misal: PT. Contoh Jaya" autoFocus disabled={editing} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-description">Deskripsi</Label>
            <textarea id="edit-tenant-description" className={TEXTAREA_CLS} value={editTenantDescription}
              onChange={(e) => setEditTenantDescription(e.target.value)}
              placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan." disabled={editing} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-logo-file">Logo</Label>
            <div className="flex items-center gap-2">
              <input id="edit-tenant-logo-file" type="file" accept="image/*" className="hidden"
                onChange={(e) => handleUploadImage(e, "profile", setEditTenantLogoUrl, setUploadingEditLogo)}
                disabled={editing || uploadingEditLogo} />
              <Label htmlFor="edit-tenant-logo-file" className={UPLOAD_LABEL_CLS}>{uploadingEditLogo ? "Mengunggah..." : "Ganti logo"}</Label>
              {editTenantLogoUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Logo terpilih</span>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-cover-file">Cover</Label>
            <div className="flex items-center gap-2">
              <input id="edit-tenant-cover-file" type="file" accept="image/*" className="hidden"
                onChange={(e) => handleUploadImage(e, "cover", setEditTenantCoverUrl, setUploadingEditCover)}
                disabled={editing || uploadingEditCover} />
              <Label htmlFor="edit-tenant-cover-file" className={UPLOAD_LABEL_CLS}>{uploadingEditCover ? "Mengunggah..." : "Ganti cover"}</Label>
              {editTenantCoverUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Cover terpilih</span>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-type">Tipe tenant</Label>
            <select id="edit-tenant-type" className={SELECT_CLS} value={editTenantType} onChange={(e) => setEditTenantType(e.target.value)} disabled={editing}>
              {TENANT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={editing}>Batal</Button>
          <Button onClick={handleSubmitEditTenant} disabled={editing || !editTenantName.trim()} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
            {editing ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
