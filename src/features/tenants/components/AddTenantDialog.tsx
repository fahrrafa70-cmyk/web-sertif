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

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  newTenantName: string;
  setNewTenantName: (name: string) => void;
  newTenantType: string;
  setNewTenantType: (type: string) => void;
  newTenantDescription: string;
  setNewTenantDescription: (desc: string) => void;
  newTenantLogoUrl: string;
  setNewTenantLogoUrl: (url: string) => void;
  newTenantCoverUrl: string;
  setNewTenantCoverUrl: (url: string) => void;
  uploadingNewLogo: boolean;
  setUploadingNewLogo: (uploading: boolean) => void;
  uploadingNewCover: boolean;
  setUploadingNewCover: (uploading: boolean) => void;
  handleCreateTenant: () => void;
  handleUploadImage: (
    e: React.ChangeEvent<HTMLInputElement>,
    bucket: "profile" | "cover",
    setUrl: (url: string) => void,
    setUploading: (uploading: boolean) => void
  ) => Promise<void>;
}

export function AddTenantDialog({
  open, onOpenChange, creating,
  newTenantName, setNewTenantName,
  newTenantType, setNewTenantType,
  newTenantDescription, setNewTenantDescription,
  newTenantLogoUrl, setNewTenantLogoUrl,
  newTenantCoverUrl, setNewTenantCoverUrl,
  uploadingNewLogo, setUploadingNewLogo,
  uploadingNewCover, setUploadingNewCover,
  handleCreateTenant, handleUploadImage
}: AddTenantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Buat tenant baru</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="tenant-name">Nama tenant / organisasi</Label>
            <Input id="tenant-name" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="Misal: PT. Contoh Jaya" autoFocus disabled={creating} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tenant-description">Deskripsi</Label>
            <textarea id="tenant-description" className={TEXTAREA_CLS} value={newTenantDescription}
              onChange={(e) => setNewTenantDescription(e.target.value)}
              placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan." disabled={creating} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tenant-logo-file">Logo</Label>
            <div className="flex items-center gap-2">
              <input id="tenant-logo-file" type="file" accept="image/*" className="hidden"
                onChange={(e) => handleUploadImage(e, "profile", setNewTenantLogoUrl, setUploadingNewLogo)}
                disabled={creating || uploadingNewLogo} />
              <Label htmlFor="tenant-logo-file" className={UPLOAD_LABEL_CLS}>{uploadingNewLogo ? "Mengunggah..." : "Upload logo"}</Label>
              {newTenantLogoUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Logo terpilih</span>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tenant-cover-file">Cover</Label>
            <div className="flex items-center gap-2">
              <input id="tenant-cover-file" type="file" accept="image/*" className="hidden"
                onChange={(e) => handleUploadImage(e, "cover", setNewTenantCoverUrl, setUploadingNewCover)}
                disabled={creating || uploadingNewCover} />
              <Label htmlFor="tenant-cover-file" className={UPLOAD_LABEL_CLS}>{uploadingNewCover ? "Mengunggah..." : "Upload cover"}</Label>
              {newTenantCoverUrl && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">Cover terpilih</span>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tenant-type">Tipe tenant</Label>
            <select id="tenant-type" className={SELECT_CLS} value={newTenantType} onChange={(e) => setNewTenantType(e.target.value)} disabled={creating}>
              {TENANT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Batal</Button>
          <Button onClick={handleCreateTenant} disabled={creating || !newTenantName.trim()} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
            {creating ? "Membuat..." : "Buat tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
