# Loading Button Implementation Guide

## Komponen LoadingButton

Komponen `LoadingButton` adalah button reusable dengan built-in loading state dan animasi spinner.

## Lokasi File
- **Komponen**: `src/components/ui/loading-button.tsx`
- **Sudah diimplementasikan di**: `src/components/hero-section.tsx`

## Cara Penggunaan

### 1. Import Komponen
```tsx
import { LoadingButton } from "@/components/ui/loading-button";
```

### 2. Tambahkan State Loading
```tsx
const [isLoading, setIsLoading] = useState(false);
```

### 3. Gunakan LoadingButton
```tsx
<LoadingButton
  onClick={handleAction}
  isLoading={isLoading}
  loadingText="Saving..."
  variant="primary"
>
  Save
</LoadingButton>
```

## Props

| Prop | Type | Default | Deskripsi |
|------|------|---------|-----------|
| `isLoading` | `boolean` | `false` | Menampilkan spinner dan disable button |
| `loadingText` | `string` | - | Text yang ditampilkan saat loading (opsional) |
| `variant` | `"default" \| "outline" \| "ghost" \| "destructive" \| "primary"` | `"default"` | Style variant button |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Ukuran button |
| `className` | `string` | - | Custom CSS classes |
| `disabled` | `boolean` | `false` | Disable button manual |
| `...props` | `ButtonHTMLAttributes` | - | Props HTML button lainnya |

## Contoh Implementasi

### 1. Search Button (Sudah diimplementasikan)
```tsx
const [searching, setSearching] = useState(false);

<LoadingButton
  onClick={handleSearch}
  isLoading={searching}
  loadingText="Searching..."
  variant="primary"
>
  Search
</LoadingButton>
```

### 2. Save Button
```tsx
const [saving, setSaving] = useState(false);

const handleSave = async () => {
  setSaving(true);
  try {
    await saveData();
    toast.success("Saved successfully!");
  } catch (error) {
    toast.error("Failed to save");
  } finally {
    setSaving(false);
  }
};

<LoadingButton
  onClick={handleSave}
  isLoading={saving}
  loadingText="Saving..."
  variant="primary"
>
  Save Changes
</LoadingButton>
```

### 3. Delete Button
```tsx
const [deleting, setDeleting] = useState(false);

<LoadingButton
  onClick={handleDelete}
  isLoading={deleting}
  loadingText="Deleting..."
  variant="destructive"
>
  Delete
</LoadingButton>
```

### 4. Upload Button
```tsx
const [uploading, setUploading] = useState(false);

<LoadingButton
  onClick={handleUpload}
  isLoading={uploading}
  loadingText="Uploading..."
  variant="primary"
  size="lg"
>
  Upload File
</LoadingButton>
```

## File yang Perlu Diupdate

Untuk mengimplementasikan loading state di semua button yang membutuhkan:

### 1. **Certificates Page** (`src/app/certificates/page.tsx`)
- [ ] Search button
- [ ] Filter button
- [ ] Download button
- [ ] Send email button

### 2. **Members Page** (`src/app/members/page.tsx`)
- [ ] Add member button
- [ ] Save button
- [ ] Delete button
- [ ] Import button

### 3. **Templates Page** (`src/app/templates/page.tsx`)
- [ ] Add template button
- [ ] Save button
- [ ] Delete button
- [ ] Upload button

### 4. **Templates Configure Page** (`src/app/templates/configure/page.tsx`)
- [ ] Save configuration button
- [ ] Generate preview button

## Pattern yang Direkomendasikan

```tsx
// 1. Definisikan state
const [isProcessing, setIsProcessing] = useState(false);

// 2. Buat handler dengan try-catch-finally
const handleProcess = async () => {
  setIsProcessing(true);
  try {
    await performAction();
    toast.success("Success!");
  } catch (error) {
    toast.error("Failed!");
  } finally {
    setIsProcessing(false); // Selalu set false di finally
  }
};

// 3. Gunakan LoadingButton
<LoadingButton
  onClick={handleProcess}
  isLoading={isProcessing}
  loadingText="Processing..."
  variant="primary"
>
  Process
</LoadingButton>
```

## Keuntungan

✅ **User Experience**: User tahu bahwa aksi sedang diproses
✅ **Prevent Double Click**: Button otomatis disabled saat loading
✅ **Consistent UI**: Semua loading state menggunakan animasi yang sama
✅ **Reusable**: Satu komponen untuk semua button dengan loading
✅ **Accessible**: Built-in disabled state untuk accessibility

## Animasi

Komponen menggunakan `Loader2` dari `lucide-react` dengan animasi `animate-spin` dari Tailwind CSS untuk spinner yang smooth dan modern.
