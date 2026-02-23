import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EditTenantDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  editTenantName: string;
  setEditTenantName: (val: string) => void;
  editTenantType: string;
  setEditTenantType: (val: string) => void;
  editTenantDescription: string;
  setEditTenantDescription: (val: string) => void;
  onSubmit: () => void;
}

export function EditTenantDetailDialog({
  open,
  onOpenChange,
  editing,
  editTenantName,
  setEditTenantName,
  editTenantType,
  setEditTenantType,
  editTenantDescription,
  setEditTenantDescription,
  onSubmit,
}: EditTenantDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-name-detail">Nama tenant / organisasi</Label>
            <Input
              id="edit-tenant-name-detail"
              value={editTenantName}
              onChange={(e) => setEditTenantName(e.target.value)}
              placeholder="Misal: PT. Contoh Jaya"
              autoFocus
              disabled={editing}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-description-detail">Deskripsi</Label>
            <textarea
              id="edit-tenant-description-detail"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[80px] resize-y"
              value={editTenantDescription}
              onChange={(e) => setEditTenantDescription(e.target.value)}
              placeholder="Contoh: Tenant untuk mengelola kerjasama dan sertifikat pelatihan."
              disabled={editing}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tenant-type-detail">Tipe tenant</Label>
            <select
              id="edit-tenant-type-detail"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
              value={editTenantType}
              onChange={(e) => setEditTenantType(e.target.value)}
              disabled={editing}
            >
              <option value="company">Perusahaan / Industri</option>
              <option value="school">Sekolah / Kampus</option>
              <option value="organization">Organisasi / Komunitas</option>
              <option value="personal">Pribadi / Freelancer</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={editing}
          >
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={editing || !editTenantName.trim()}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            {editing ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
