# 📝 Pagination untuk Halaman /search

## 🎯 **Apa itu Pagination?**

Pagination = **Membagi data besar menjadi halaman-halaman kecil**

Contoh: 100 sertifikat → Dibagi jadi 12 halaman (9 per halaman)

---

## 🔴 **Masalah Tanpa Pagination**

```typescript
// Render 100 sertifikat sekaligus
const SearchResults = () => {
  const [results, setResults] = useState<Certificate[]>([]); // 100 items
  
  return (
    <div>
      {results.map(cert => <CertificateCard cert={cert} />)} {/* 100 cards! */}
    </div>
  );
};
```

**Masalah:**
- 🔴 Render 100+ cards sekaligus = **lambat**
- 🔴 Memory tinggi (semua gambar dimuat)
- 🔴 Scroll terasa **lag**
- 🔴 INP tinggi (interaksi lambat)

---

## ✅ **Solusi: Pagination**

```typescript
// Render hanya 9 sertifikat per halaman
const SearchResults = () => {
  const [results, setResults] = useState<Certificate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  
  // Ambil 9 items untuk halaman saat ini
  const currentResults = results.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  return (
    <div>
      {currentResults.map(cert => <CertificateCard cert={cert} />)} {/* Hanya 9! */}
    </div>
  );
};
```

**Keuntungan:**
- ✅ Render maksimal 9 cards = **cepat**
- ✅ Memory rendah
- ✅ Scroll **smooth**
- ✅ INP rendah (interaksi responsif)

---

## 📐 **Cara Kerja Pagination**

```typescript
// Contoh: 50 sertifikat, 9 per halaman
const totalItems = 50;
const ITEMS_PER_PAGE = 9;

// Berapa halaman?
const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
// Math.ceil(50 / 9) = 6 halaman

// User di halaman 3, tampilkan items mana?
const currentPage = 3;
const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
// (3 - 1) * 9 = 18

const endIndex = startIndex + ITEMS_PER_PAGE;
// 18 + 9 = 27

// Ambil data halaman 3
const currentResults = allResults.slice(startIndex, endIndex);
// allResults.slice(18, 27) → items 19-27
```

**Visualisasi:**
```
Total: 50 items, 9 per halaman

Halaman 1: [0-8]    → 9 items
Halaman 2: [9-17]   → 9 items  
Halaman 3: [18-26]  → 9 items
Halaman 4: [27-35]  → 9 items
Halaman 5: [36-44]  → 9 items
Halaman 6: [45-49]  → 5 items (sisa)

Total: 6 halaman
```

---

## ⚡ **Dampak Performa**

**Skenario: 90 Sertifikat**

| Metric | Tanpa Pagination | Dengan Pagination (9/page) | Improvement |
|--------|------------------|---------------------------|-------------|
| **Render Time** | ~800ms | ~180ms | **77% faster** |
| **DOM Elements** | 90 cards | 9 cards | **90% reduction** |
| **Memory** | ~22MB | ~2.5MB | **88% reduction** |
| **INP** | 888ms | ~120ms | **86% faster** |

**Kesimpulan:** Pagination dengan 9 items = **Sangat cepat & ringan**

---

## 📊 **Berapa Items Per Page?**

```typescript
const ITEMS_PER_PAGE = 9; // Untuk sertifikat dengan gambar
```

**Rekomendasi:**

| Tipe Konten | Items/Page |
|-------------|------------|
| **Text list** | 20-50 |
| **Cards dengan gambar** | 9-12 |
| **Heavy cards (sertifikat)** | 6-9 |
| **Mobile** | 6-9 |

**Mengapa 9?**
- ✅ Grid 3x3 = layout rapi
- ✅ Cukup konten, tidak terlalu banyak
- ✅ Render cepat
- ✅ Memory rendah

---

## 🔄 **Kapan Reset ke Halaman 1?**

```typescript
const handleSearch = (newQuery: string) => {
  setSearchQuery(newQuery);
  setCurrentPage(1); // Reset!
};
```

**Contoh Masalah:**
```
User di Halaman 5
User search "John" → Hanya 9 hasil (1 halaman)
Halaman 5 tidak ada!
User lihat halaman kosong ❌
```

**Solusi: Auto Reset**
```
User di Halaman 5
User search "John"
→ Auto reset ke Halaman 1 ✅
→ User langsung lihat hasil
```

**Reset Saat:**
- Search berubah
- Filter berubah
- Clear/Reset diklik

---

## 🎯 **Client vs Server Pagination**

### **Client-Side** (Pagination di Browser)
```typescript
// Fetch semua data sekali
const allResults = await searchCertificates(query); // 100 items

// Bagi di browser
const currentResults = allResults.slice(
  (currentPage - 1) * 9,
  currentPage * 9
);
```
✅ Ganti halaman instant  
❌ Initial load lambat  
**Cocok:** < 500 items

### **Server-Side** (Pagination di Server)
```typescript
// Fetch hanya 9 items
const { data, totalCount } = await searchCertificates({
  query,
  page: currentPage,
  limit: 9
});
```
✅ Initial load cepat  
❌ Ganti halaman ada loading  
**Cocok:** > 500 items

---

## 🛠️ **Implementasi Sederhana**

```typescript
function SearchPage() {
  const [results, setResults] = useState<Certificate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  
  // Kalkulasi
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const currentResults = results.slice(start, end);
  
  return (
    <div>
      {/* Render 9 items */}
      {currentResults.map(cert => (
        <CertificateCard key={cert.id} cert={cert} />
      ))}
      
      {/* Pagination */}
      <div>
        <button 
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
        >
          ← Sebelumnya
        </button>
        
        <span>Halaman {currentPage} dari {totalPages}</span>
        
        <button 
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={currentPage === totalPages}
        >
          Selanjutnya →
        </button>
      </div>
    </div>
  );
}
```

---

## ✨ **UI Patterns**

**Simple (Recommended):**
```
[← Sebelumnya]  Halaman 3 dari 10  [Selanjutnya →]
```

**Dengan Nomor:**
```
[←] [1] [2] [3] [4] [5] [→]
```

**Load More (Alternative):**
```
[Tampilkan 9 lagi]
```

---

## 🎓 **Kesimpulan**

### **Kapan Pakai Pagination?**

**✅ Wajib jika:**
- Dataset > 50 items dengan gambar
- Render lambat (> 500ms)
- INP tinggi (> 200ms)

**❌ Tidak perlu jika:**
- Dataset < 20 items
- Data real-time (pakai infinite scroll)

### **Decision Tree:**

```
Berapa banyak data?

< 50 items     → ❌ Tidak perlu
50-500 items   → ✅ Client-side (9 per page)
> 500 items    → ✅ Server-side (9 per page)
```

### **ROI:**

```
Waktu: 2-3 jam
Performa: +70-80%
UX: Jauh lebih baik
→ Worth it untuk > 50 items
```


---

## ✅ **Checklist Implementasi**

```typescript
// Yang perlu dibuat:

[ ] State: currentPage, ITEMS_PER_PAGE = 9
[ ] Kalkulasi: totalPages, currentItems
[ ] Button: Sebelumnya & Selanjutnya
[ ] Reset ke page 1 saat search berubah
[ ] Scroll to top saat ganti halaman
```

---

**Dibuat**: 17 November 2025  
**Untuk**: Referensi pagination dengan 9 items per page  
**Implementasi**: Lihat `src/app/search/page.tsx`
