# BAB III – PEMBAHASAN

## A. Gambaran Umum Sistem
Sistem Sertifikat Berbasis Web pada platform `sertifikat.ubig.co.id` merupakan sebuah aplikasi manajemen sertifikat digital yang memfasilitasi pembuatan, pengelolaan, dan distribusi sertifikat secara efisien. Sistem ini dibangun menggunakan ekosistem Next.js (dengan App Router) yang memungkinkan pemrosesan *client-side* dan penyediaan rute API dalam satu *codebase* tunggal. Keputusan menggunakan Next.js ini sangat krusial, karena mempermudah orkestrasi antara peramban (*browser*) pengguna yang melakukan proses pembuatan gambar (*rendering canvas*) dan *backend* yang melayani penyimpanan data, tanpa perlu membangun layanan API terpisah yang rumit.

Platform ini mengusung arsitektur perangkat lunak berbasis *multi-tenant* terintegrasi dengan basis data Supabase. Hal ini memungkinkan berbagai sekolah atau institusi untuk memiliki ruang kerja (*workspace*) mereka masing-masing secara terisolasi. Ini menjamin keamanan privasi data (menggunakan *Row Level Security* di Supabase) sekaligus menyederhanakan alur kerja administrasi dokumen di setiap institusi tanpa perlu melakukan instalasi perangkat lunak tambahan.

## B. Penjelasan Fitur Bulk Certificate Generation
Fitur *Bulk Certificate Generation* pada sistem `sertifikat.ubig.co.id` adalah fungsionalitas inti yang memungkinkan administrator memproduksi ribuan dokumen sertifikat sekaligus dalam satu kali proses. Fitur ini dirancang khusus untuk mengakomodasi dokumen *spreadsheet* (Excel/CSV) yang berisi data peserta massal, dan secara otomatis memetakan baris data tersebut ke dalam posisi elemen teks pada *template* sertifikat yang telah dikonfigurasi melalui fitur *Builder*.

Berbeda dengan sistem *generate* tradisional yang membebankan pembuatan PDF atau gambar ke sisi *server* (yang dapat menyebabkan *server timeout* dan membutuhkan biaya infrastruktur tinggi), arsitektur `sertifikat.ubig.co.id` memindahkan beban komputasi *rendering* ini langsung ke peramban pengguna (*client-side*). Algoritma memanfaatkan HTML5 Canvas untuk menggambar teks, foto, dan QR Code di atas kanvas, lalu mengonversinya menjadi URL data (*Data URL*) berformat gambar.

Alur kerjanya dimulai dengan *parsing* file Excel di sisi klien. Kemudian, sistem melakukan perulangan asinkron (*asynchronous loop*) secara *sequential* (berurutan) atau berkelompok kecil. Hal ini dilakukan dengan sengaja untuk mencegah *browser tab* menjadi *crash* atau *Out of Memory* akibat melakukan render ribuan gambar serentak. Pada setiap rotasi perulangan, *browser* merender sertifikat, mengunggah hasilnya ke *bucket* Supabase Storage melalui jalur API buatan sendiri (untuk *retry mechanism* agar jaringan tidak terputus), lalu mencatat *record* metadata di tabel `certificates` Supabase. Hal ini menghasilkan efisiensi waktu yang revolusioner tanpa harus membayar layanan pembuatan sertifikat dari pihak ketiga.

## C. Langkah-Langkah Pembuatan Fitur

### Langkah 1 – Persiapan & Instalasi Library

**Tujuan:**
Menginisialisasi pustaka internal maupun eksternal yang dibutuhkan oleh *hook* `useCertificateGenerate.ts` untuk melangsungkan fungsi *render* kanvas dan mengelola antarmuka pengguna selama proses massal berlangsung.

**Penjelasan:**
Pada proyek `sertifikat.ubig.co.id`, tidak semua *library* digunakan untuk sekadar membangun UI. Di baris ini, `toast` dari Sonner diimpor khusus untuk memberikan indikator berjalannya *looping* pembuatan sertifikat, yang akan diperbarui secara konstan (misal "Generate 10/100"). Kemudian, fungsi bawaan proyek seperti `createCertificate` dari *layer* Supabase dipakai untuk merekam *database*. Hal paling utama adalah pemanggilan *engine* render kanvas internal yang dibuat spesifik untuk proyek ini, yaitu `renderCertificateToDataURL`, yang mengambil spesifikasi *layout* (*font*, posisi X/Y, warna) untuk diaplikasikan ke atas gambar.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 1 sampai 23

**Kode:**
```typescript
import { useState } from "react";
import { toast } from "sonner";
import { Template, getTemplateImageUrl, getTemplateLayout } from "@/lib/supabase/templates";
import { createCertificate, CreateCertificateData } from "@/lib/supabase/certificates";
import { renderCertificateToDataURL } from "@/lib/render/certificate-render";
```

**Penjelasan Kode Baris per Baris:**
- `import { useState } from "react";` : Mengambil hook bawaan React untuk mengatur keadaan *state* lokal, seperti melacak status form modal sedang memuat (*loading*) atau tidak.
- `import { toast } from "sonner";` : Mengimpor pustaka notifikasi antarmuka yang akan dipakai sebagai pembaruan progres berjalannya cetak sertifikat secara interaktif di layar (*toast UI*).
- `import { Template, getTemplateImageUrl, getTemplateLayout } from "@/lib/supabase/templates";` : Memanggil modul utilitas internal Supabase untuk mendapatkan gambar dasar *template* dan struktur koordinat letak (seperti posisi penempatan nama dan tanggal).
- `import { createCertificate... } from "@/lib/supabase/certificates";` : Mengimpor fungsi khusus yang bertugas melakukan *query insert* satu baris data sertifikat baru ke dalam tabel `certificates` di Supabase.
- `import { renderCertificateToDataURL } from "@/lib/render/certificate-render";` : Modul *rendering* kustom milik proyek yang mengeksekusi komputasi HTML5 Canvas, menggabungkan gambar dasar dan teks, lalu mengembalikannya sebagai gambar berbasis `Base64`.

Penyiapan dan impor *engine* seperti `renderCertificateToDataURL` adalah gerbang awal yang krusial sebelum logika berat dari siklus *bulk generation* diimplementasikan pada fungsi-fungsi selanjutnya.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE ONLY]                   │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.1 — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`
> Tampilkan: Blok kode paling atas dari *file* yang memperlihatkan sekumpulan import, pastikan baris impor `renderCertificateToDataURL` dan `createCertificate` terlihat jelas.

---

### Langkah 2 – Struktur File & Folder untuk Fitur Ini

**Tujuan:**
Menerapkan konsep *Separation of Concerns* (pemisahan tanggung jawab) pada arsitektur Next.js di mana komputasi kompleks (*bulk generate*) dipisah dari komponen presentasi atau UI.

**Penjelasan:**
Dalam skema proyek `sertifikat.ubig.co.id`, fail komponen tampilan (seperti `page.tsx`) tidak boleh dibebani dengan logika *looping* dan manipulasi kanvas yang panjang. Oleh karena itu, seluruh alur pemrosesan massal dibungkus ke dalam *Custom Hook* yang dinamakan `useCertificateGenerate.ts`. Dengan melakukan pemisahan *hook* (*extracted hooks*), halaman manajemen sertifikat utama dapat berfokus pada render UI tabel dan *state* antarmuka, sedangkan *hook* ini secara khusus menangani mesin pembuatan gambar, pengunduhan daftar peserta, dan manajemen memori peramban saat proses massal berlangsung.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificatesPage.ts` — Line 25 sampai 32

**Kode:**
```typescript
// Pre-existing extracted hooks (shared with hero-section.tsx)
import { useCertificateExport } from "./useCertificateExport";
import { useCertificateEmail } from "./useCertificateEmail";

// New page-specific extracted hooks
import { useCertificateState } from "./useCertificateState";
import { useCertificateGenerate } from "./useCertificateGenerate";
```

**Penjelasan Kode Baris per Baris:**
- `// Pre-existing extracted hooks...` : Sebuah komentar dokumentasi bahwa fungsi *export* dan *email* berada pada *layer* independen agar bisa dipakai ulang di komponen lain.
- `import { useCertificateExport } from "./useCertificateExport";` : Mengimpor modul pengelola *download* ZIP dan berbagi *link* tautan.
- `import { useCertificateEmail } from "./useCertificateEmail";` : Mengimpor utilitas distribusi sertifikat lewat email pasca selesai pembuatan massal.
- `// New page-specific extracted hooks` : Menandai modul sentral yang menjadi penggerak utama halaman dasbor.
- `import { useCertificateState } from "./useCertificateState";` : Mengimpor logika penyimpanan sementara daftar sertifikat (*pagination*, filter).
- `import { useCertificateGenerate } from "./useCertificateGenerate";` : Mengimpor fungsionalitas algoritma inti dari bab ini, yaitu mesin pengeksekusi *bulk generate*.

Praktik pengimporan ini menunjukkan struktur *clean code* di mana `useCertificateGenerate` diposisikan sejajar dan modular dengan fitur lainnya, memudahkan penelusuran *bug* saat *rendering* massal.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE ONLY]                   │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.2 — Source Code
> File: `src/features/certificates/hooks/useCertificatesPage.ts`
> Tampilkan: Potongan impor beberapa berkas `.ts` (*custom hooks*) yang berada dalam direktori yang sama, untuk memperlihatkan arsitektur *clean code* pemisahan *logic* Next.js.

---

### Langkah 3 – Pembuatan Template Sertifikat Dinamis

**Tujuan:**
Membangun algoritma pelacakan dan substitusi *variabel* yang memastikan label *placeholder* `{name}` atau `{certificate_no}` dalam desain kanvas tergantikan dengan nilai dari *database* atau data Excel peserta yang relevan.

**Penjelasan:**
Sistem pada platform ini harus sangat dinamis. Ketika pengguna mendesain letak nama menggunakan *tools builder*, sistem menyimpan koordinat tersebut dengan identifikasi "name". Algoritma di tahap ini bertugas merakit satu objek JavaScript, yaitu `variableData`, yang merangkum *fallbacks* (prioritas data). Jika data *Excel* (contoh kolom custom "Nilai_Akhir") tersedia, nilainya akan ditumpangkan ke objek menggunakan *Spread Operator* JavaScript. Nantinya utilitas `replaceVariablesInRichText` akan mencocokkan *placeholder* di kanvas dengan *dictionary* `variableData` ini untuk disuntikkan secara presisi.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 143 sampai 151

**Kode:**
```typescript
const variableData: Record<string, string> = {
  name: member.name || "", 
  nama: member.name || "",
  certificate_no: finalCertData.certificate_no || "",
  description: finalCertData.description || "",
  issue_date: formatDateString(finalCertData.issue_date, dateFormat),
  expired_date: finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "",
  ...certDataMap, 
  ...(excelRowData || {}), 
  ...(scoreData || {}),
};
```

**Penjelasan Kode Baris per Baris:**
- `const variableData: Record<string, string> = {` : Deklarasi pembuatan objek yang mengikat konvensi kunci berformat *string* murni sebagai kamus substitusi *template*.
- `name: member.name || "", nama: member.name || "",` : Menetapkan secara *hardcode* properti "name" atau "nama" untuk dipadankan langsung dari variabel entitas *member database*, dengan *fallback* *string* kosong jika nihil.
- `certificate_no: finalCertData.certificate_no || "",` : Menetapkan format penomoran seri sertifikat unik yang sudah di *generate* oleh sistem pada urutan sebelumnya.
- `issue_date: ...` dan `expired_date: ...` : Mengonversi struktur penanggalan (*Date*) menjadi format teks bahasa/zona waktu yang lebih ramah dibaca manusia (*human-readable*) melalui utilitas peramu *formatDateString*.
- `...certDataMap, ...(excelRowData || {}), ...(scoreData || {}),` : Pemanfaatan *Spread Operator* JavaScript yang sangat penting: ia meluapkan sisa atribut apa pun dari sel *Excel* di luar sistem *default* (seperti Asal Kampus, Judul Lomba, dsb.) langsung ke dalam *dictionary*, sehingga *placeholder custom* bisa didukung.

Perakitan kamus ini sangat penting, karena ini menjadi satu-satunya sumber validasi informasi (*Single Source of Truth*) ketika sistem *rendering* menelusuri ratusan elemen teks pada berkas *template JSON*.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE + TAMPILAN WEB]         │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.3a — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`
> Tampilkan: Blok kode deklarasi `variableData` beserta sintaksis rest-spread `...excelRowData`.
> 🌐 Gambar 3.3b — Tampilan Web
> Halaman: `Sertifikat > Builder (Editor Template)`
> Tampilkan: Mode Web Editor saat admin pengguna menyeret teks. Elemen teks pada lembar desain sertifikat harus berisi penanda kurung kurawal seperti `{name}` atau variabel custom `{organisasi}` yang mencerminkan integrasi *template* tersebut.

---

### Langkah 4 – Pembuatan Form Input & Upload Data Massal

**Tujuan:**
Membaca dokumen *.xlsx* dari luar peramban klien, mengekstrak data dari sel *spreadsheet*, lalu menterjemahkannya menjadi format objek JSON sementara untuk dimasukkan ke antrean proses cetak.

**Penjelasan:**
Alih-alih memaksa pengguna mendaftarkan data satu per satu di *database* Supabase (yang dapat memberatkan *server*), proyek `sertifikat.ubig.co.id` menginisiasi mode *Upload Excel* yang memproses dokumen *client-side*. *Hook* akan memindai kolom *array* `excelData`. Melalui kecerdasan percabangan (*conditional branching*), fungsi secara pintar memeriksa variasi ejaan header *Excel*, seperti baris kolom `name` atau `recipient`, dan `certificate_no` atau `cert_no`. Peserta virtual diciptakan dengan `id` berformat sementara (`temp-timestamp`) sehingga mesin dapat membuat sertifikatnya meskipun datanya tidak permanen mengendap di tabel *members* sistem utama.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 372 sampai 382

**Kode:**
```typescript
for (const row of params.excelData) {
  try {
    const name = String(row.name || row.recipient || "");
    let issueDate = String(row.issue_date || row.date || "");
    if (!issueDate) issueDate = new Date().toISOString().split("T")[0];
    const certNo = String(row.certificate_no || row.cert_no || "");
    const expiredDate = String(row.expired_date || row.expiry || "");
    
    const tempMember: Member = { id: `temp-${Date.now()}-${generated}`, name, email: String(row.email || ""), ... };
    
    const excelRowData: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!["name","certificate_no","issue_date","expired_date"].includes(k) && v !== undefined && v !== null && v !== "") {
        excelRowData[k] = String(v);
      }
    }
```

**Penjelasan Kode Baris per Baris:**
- `for (const row of params.excelData) {` : Menjalankan siklus rotasi untuk membedah baris per baris data dari berkas Excel yang telah dibaca sebelumnya lewat *library* pengolah CSV/XLSX.
- `const name = String(row.name || row.recipient || "");` : Melakukan tebakan cerdas; sistem mengizinkan administrator mengunggah Excel yang kolomnya bernama "name" atau "recipient" sebagai nama peserta di sertifikat.
- `if (!issueDate) issueDate = ...` : Menerapkan proteksi keamanan (*fallback*) yang secara otomatis memompa tanggal riil server saat itu apabila baris tanggal peluncuran dokumen pada fail Excel tertinggal kosong.
- `const tempMember: Member = { id: \`temp-${Date.now()}-${generated}\`, name, ... };` : Membuat proksi profil anggota sementara menggunakan kombinasi cap waktu dan indeks *looping* untuk mencegah tabrakan data (*collision*) tanpa harus menuliskannya secara permanen ke daftar anggota tabel *database* Supabase.
- `const excelRowData: Record<string, string> = {}; for (const [k, v] of Object.entries(row)) {` : Siklus pemindahan tahap sekunder untuk menarik atribut-atribut properti kolom Excel spesifik milik sekolah (*custom fields*) di luar atribut standar sistem, memindahkannya mentah-mentah ke penampungan tambahan.

Tahap pembongkaran data *Excel* berfase *client-side* ini memfasilitasi beban baca operasi dari pundak server sehingga proyek berjalan sangat responsif.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [TAMPILAN WEB ONLY]                  │
└─────────────────────────────────────────────┘
> 🌐 Gambar 3.4 — Tampilan Web
> Halaman: `Modal Wizard Generate / Excel Upload Step`
> Tampilkan: Modal dialog dengan status berhasil mengunggah berkas *Excel*. Bagian bawah harus menampilkan komponen tabel *Preview Data* di mana sel baris pertamanya sudah terisi dengan contoh data nama partisipan hasil *parsing* (contoh "John Doe").

---

### Langkah 5 – Logic Bulk Generation (Looping, Render, Upload)

**Tujuan:**
Mengeksekusi *rendering* gambar kanvas berdasarkan antrean data secara berurutan (*sequential async/await*), mengunggah ke *Storage*, menyimpan rekaman di Supabase, serta terus mengabari pengguna kemajuan prosesnya via UI.

**Penjelasan:**
Ini adalah jantung operasional dari `sertifikat.ubig.co.id`. Proses tidak menggunakan `Promise.all` serentak yang paralel, melainkan `for...of` asinkronus berurutan. Jika ada 1000 data dan dieksekusi paralel di *browser*, memori tab *browser* akan tumpah (*crash*). Lewat iterasi `await generateSingleCertificate`, program menggambar kanvas HTML, mengkonversi hasil pindaian *base64* lalu melempar utilitas API `uploadWithRetry` ke Supabase *Storage*. Pada baris akhir blok, peramban memicu instruksi *toast UI* untuk memperbarui metrik capaian, mengubah tulisan progres "Generating 45/100" secara seketika (*real-time*).

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 351 sampai 360

**Kode:**
```typescript
const total = params.members.length; 
let generated = 0;
for (const member of params.members) {
  try {
    await generateSingleCertificate(
      params.template, member, params.certificateData, 
      defaults, params.dateFormat, params.scoreDataMap?.[member.id], layoutConfig
    );
    generated++;
    toast.loading(`${t("quickGenerate.generatingCertificates")} ${generated}/${total}`, { id: loadingToast });
  } catch (e) { 
    console.error(`❌ Failed for ${member.name}:`, e); 
  }
}
toast.dismiss(loadingToast);
toast.success(`${t("quickGenerate.successMultiple")} ${generated}/${total} ${t("quickGenerate.certificatesGenerated")}`);
```

**Penjelasan Kode Baris per Baris:**
- `const total = params.members.length; let generated = 0;` : Menghitung volume antrean sertifikat yang akan dieksekusi, serta menanam variabel pencatat skor komputasi kesuksesan yang berawal dari angka nol.
- `for (const member of params.members) {` : Perulangan asinkron linear yang secara sadar dipilih agar tab *browser* merender memori satu per satu (*sequential*), mencegah insiden *crash* yang biasa terjadi bila ratusan kanvas beresolusi tinggi dimuat bebarengan.
- `await generateSingleCertificate(...);` : Perintah penangguhan operasional rotasi yang menunggu hingga utilitas *render* menuntaskan tugas penyalinan teks, peletakan *QR Code*, dan unggahan *cloud file* ke ruang Storage Supabase untuk satu individu ini.
- `generated++; toast.loading(..., { id: loadingToast });` : Memperbarui pencatat hasil lalu memerintahkan perpustakaan sonner merayap ke UI dan memanipulasi rentetan teks pengumuman *Toast* (misal berubah menjadi "1/100" menjadi "2/100") dengan ID identik agar tampilan hanya di-*update* dan tak berlapis bertumpuk berulang kali.
- `catch (e) { console.error... }` : Fungsi perangkap *error* asimetris; jika satu baris peserta mengalami kecacatan *upload* lokal, antrean siklus berikutnya untuk peserta selanjutnya tak akan terblokir mati.
- `toast.success(...);` : Sesudah perulangan loop bebas, peramban menghapus pengumuman *loading* untuk selanjutnya diganti dengan jendela purna warna hijau bertanda kesuksesan total pencetakan massal.

Skema ini menjamin pengoperasian sistem berskala tinggi *enterprise* tidak mematikan utilitas *client-side* meskipun ditarik memproses data berskala tebal.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE + TAMPILAN WEB]         │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.5a — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`
> Tampilkan: Blok kode sistem rotasi pengulangan `for...of` asinkronus dengan fokus khusus di `await generateSingleCertificate` dan fungsi antarmuka `toast.loading`.
> 🌐 Gambar 3.5b — Tampilan Web
> Halaman: `Sertifikat > Proses Generate`
> Tampilkan: Kondisi UI ketika sedang menjalankan progres: Antarmuka Web harus sedikit redup, dengan *pop-up toast loading* kecil di sudut kanan yang menampilkan *loading spinner* dan teks konkrit proses rasio, misal "Generating certificates 15/50".

---

### Langkah 6 – Integrasi Pembuatan Nomor Unik & QR Code (Keaslian)

**Tujuan:**
Memberikan lapisan keabsahan dan keaslian dokumen otomatis selama generasi berjalan, termasuk pembentukan *routing URL* khusus yang disisipkan ke *layer QR Code* kanvas.

**Penjelasan:**
Proyek sertifikat massal tidak akan bermakna tanpa validasi verifikasi. Di dalam *logic bulk generate* proyek, fungsi melakukan injeksi *QR Code* instan di sisi-klien. Algoritma akan mencari elemen kanvas bertipe `qr_code`, lalu secara dinamis mengubah label konfigurasi `{{CERTIFICATE_URL}}` menjadi alamat web verifikasi yang utuh dengan mencangkokkan variabel ID atau nomor sertifikat. QR Code ini langsung di-render *real-time* dan dicetak ke gambar sebelum gambar tersebut diunggah ke *cloud*.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 195 sampai 199

**Kode:**
```typescript
const qrLayersForRender = (layoutConfig?.certificate?.qrLayers || []).map((layer: QRCodeLayerConfig) => ({
  id: layer.id, 
  type: layer.type as "qr_code",
  qrData: layer.qrData.replace(
    "{{CERTIFICATE_URL}}", 
    `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/cek/${finalCertData.certificate_no}`
  ),
  x: layer.x, y: layer.y, width: layer.width, height: layer.height,
  foregroundColor: layer.foregroundColor, backgroundColor: layer.backgroundColor
}));
```

**Penjelasan Kode Baris per Baris:**
- `const qrLayersForRender = (layoutConfig?.certificate?.qrLayers || []).map(...)` : Menelusuri seluruh *layer QR Code* (jika ada) dari konfigurasi tata letak desain sertifikat yang tersimpan.
- `type: layer.type as "qr_code",` : Mendeklarasikan bahwa baris matriks ini akan dialokasikan oleh penggerak modul gambar sebagai komponen barkode matriks dan bukan sebagai teks atau gambar statis.
- `qrData: layer.qrData.replace("{{CERTIFICATE_URL}}", ...)` : Proses subtitusi nilai yang vital: kode otomatis mengganti anotasi mentah `{{CERTIFICATE_URL}}` menjadi domain sistem web berjalan ditambah rute rujukan URL pengesahan mandiri, sehingga pengguna alat peninjau eksternal yang menge-scan QR dilarikan ke rute `/cek/[nomor-sertifikat]`.
- `x: layer.x, y: layer.y, ...` : Mewariskan set-set koordinat matematis X, Y dan nilai estetika presisi dari periset UI (warna primer QR, ukuran tinggi dan lebat rasio kotak).

Manipulasi URL dinamis ini menjamin bahwa meskipun mesin me-render seribu sertifikat, setiap QR code di setiap gambar memiliki keunikan mutlak yang menghubungkan ke tautan validasinya sendiri-sendiri tanpa harus me-*request* API eksternal pembuat QR.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE ONLY]                   │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.6 — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`
> Tampilkan: Fungsi deklarasi `qrLayersForRender` yang mendemonstrasikan proses manipulasi pemecahan alamat URL `.replace("{{CERTIFICATE_URL}}"...`.

---

### Langkah 7 – Pengujian Fitur pada Tabel Hasil

**Tujuan:**
Menguji efektivitas penampungan *database* dari alur yang selesai diproses serta memastikan ketersediaan antarmuka unduhan (*download zip*) atau salin akses tautan (*copy link*) pada setiap berkas yang berhasil diloloskan.

**Penjelasan:**
Pengujian paripurna (*Post-verification*) dari fungsionalitas ini adalah mengevaluasi hasil di dalam subsistem dasbor daftar sertifikat yang merentangkan tabel penampil. Pasca jendela rotasi *looping* usai, sistem secara reaktif menembak ulang API *refresh* untuk menyuruh dasbor mengambil status riwayat terbaru dari tabel `certificates` Supabase. Pengujian dikategorikan lulus jika rupa *thumbnail webp* hasil ekstraksi kanvas dapat ditampilkan, data "Recipient" berbeda-beda sesuai tabel *Excel*, serta tombol opsi aksi (Salin Link dan Download PDF/Image) dapat berinteraksi murni karena sistem mendeteksi keberadaan `certificate_image_url` valid pada baris tersebut.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 403

**Kode:**
```typescript
      }
      // Memanggil fungsi refresh pada parent component 
      // untuk memutakhirkan tabel pasca bulk-generate berhasil
      await refresh();
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : "Failed to generate certificate");
    }
  };
```

**Penjelasan Kode Baris per Baris:**
- `await refresh();` : Barisan instruksi kritis yang tertanam pada pangkal ekor blok operasi *Quick Generate*. Ia bertindak membunyikan bel *trigger* agar kompartemen React di komponen tabel (*parent*) segera membuang memori data lama (*invalidate cache*) lalu merilis panggilan tarik data (*fetch*) terbaru dari Supabase server.
- `catch (error: unknown) { ... toast.error(...) }` : Pelindung lapis akhir di *root level hook*. Bila musibah memori meluap atau tab *browser* tertahan akibat konektivitas buruk memicu kesalahan interupsi sistem (*promise reject*), maka indikator putar (*loading spinner*) diretas secara aman dan digantikan laporan galat deskriptif kepada pengguna lewat notifikasi UI merah.

Pemutakhiran berkesinambungan menggunakan injeksi *method prop* (`refresh()`) membuktikan pola ekosistem yang kohesif antara pengeksekusi logika kanvas rahasia dan representasi tabel visual.

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [TAMPILAN WEB ONLY]                  │
└─────────────────────────────────────────────┘
> 🌐 Gambar 3.7 — Tampilan Web
> Halaman: `Halaman Dashboard Manajemen Sertifikat (/certificates)`
> Tampilkan: Fokuskan gambar pada kondisi *Dashboard* yang berhasil diperbarui (*refresh* otomatis paska *bulk generate* sukses). Baris-baris tabel harus penuh dengan barisan *thumbnail* kecil gambar sertifikat, kolom "Recipient" terisi banyak nama beragam yang terinput dari simulasi *Excel*, dan pastikan Menu Aksi baris (*titik tiga*) diklik satu, sehingga memunculkan rincian tarik-turun (*dropdown menu*) menampilkan menu "*Copy Link*" dan "*Download*".

---

**Hasil:**
Dengan mengeksekusi integrasi algoritma komputasi di sisi-*client* yang diadaptasi mendalam melalui fitur *Bulk Certificate Generation* ini, platform `sertifikat.ubig.co.id` sanggup menembus limitasi komputasi awan. Institusi pengguna kini dipersenjatai untuk mengakuisisi daftar excel bermuatan ribuan baris, membiarkan *browser* meramu komputasi grafis *Canvas* secara otonom per elemen, menyulam QR verifikasi mutlak di lembaran sertifikat, sampai akhirnya tercetak dan tersimpan berurutan di pangkalan data Supabase secara elegan, ringkas, dan minim intervensi manual.
Design Document, implementation Plan
TargetFile, Overwrite, CodeContent, Description, IsArtifact
TargetFile: d:\UBIG\Project\web-sertif\BAB_III_Pembahasan_PKL_v2.md
