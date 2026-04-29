# BAB III – PEMBAHASAN

## A. Gambaran Umum Sistem
Sistem Sertifikat Berbasis Web pada platform `sertifikat.ubig.co.id` merupakan sebuah aplikasi manajemen sertifikat digital yang memfasilitasi pembuatan, pengelolaan, dan distribusi sertifikat secara efisien. Sistem ini dibangun menggunakan *framework* Next.js yang terintegrasi dengan berbagai teknologi modern untuk memberikan performa yang cepat dan antarmuka pengguna yang responsif. Melalui platform ini, administrator dapat mendesain tata letak sertifikat, mengelola data penerima, serta menyimpan seluruh dokumen secara digital.

Selain itu, platform ini mengusung arsitektur perangkat lunak berbasis *multi-tenant* yang memungkinkan berbagai sekolah atau institusi untuk memiliki ruang kerja (*workspace*) mereka masing-masing secara terisolasi. Hal ini menjamin keamanan privasi data sekaligus menyederhanakan alur kerja administrasi dokumen di setiap institusi tanpa perlu melakukan instalasi perangkat lunak desktop secara konvensional.

## B. Penjelasan Fitur Bulk Certificate Generation
Fitur *Bulk Certificate Generation* adalah sebuah kemampuan terotomatisasi pada sistem yang memungkinkan pengguna (administrator) untuk memproduksi puluhan hingga ribuan dokumen sertifikat sekaligus dalam satu kali proses komputasi tunggal. Fitur ini dirancang untuk membaca sekumpulan data peserta secara masif—seperti berkas format *spreadsheet* Excel atau CSV—lalu memetakan setiap baris data tersebut ke dalam posisi elemen teks kanvas pada desain *template* dasar sertifikat yang telah disesuaikan tata letaknya.

Keberadaan fitur ini sangat krusial mengingat pada implementasi nyatanya, pihak institusi atau penyelenggara acara seringkali harus menerbitkan sertifikat dalam jumlah yang sangat besar, contohnya pada saat kelulusan akademik, penyelesaian seminar, atau kompetisi massal. Apabila tugas administratif percetakan sertifikat ini dioperasikan dengan metode pengetikan satu per satu, hal tersebut tidak hanya akan menguras jam kerja operasional secara signifikan, tetapi juga sangat rentan terhadap *human error* seperti kesalahan pengetikan nama maupun duplikasi nomor dokumen.

Secara teknis, alur kerja dari fitur ini diawali oleh administrator yang memuat *template* sertifikat lalu memilih opsi untuk melakukan pencetakan berganda. Pengguna cukup mengunggah data tabel dari Microsoft Excel, lalu sistem algoritma di sisi *client-side* akan memulai proses perulangan (*looping*). Pada setiap putaran iterasinya, sistem merender satu gambar sertifikat di dalam HTML5 Canvas, menggantikan tag variabel penampung dengan teks nama atau nilai yang spesifik, melakukan konversi (*encoding*) ke dalam format gambar biner, dan mengunggahnya secara berurutan (*asynchronous*) ke fasilitas penyimpanan awan (*cloud storage*) bersamaan dengan perekaman identitas data di *database*.

Manfaat paling utama dari implementasi fitur ini jika dikomparasikan dengan teknik pembuatan satu per satu adalah lompatan efisiensi waktu yang sangat revolusioner. Pekerjaan yang sebelumnya membutuhkan pengerjaan manual intensif berhari-hari dapat diselesaikan sepenuhnya oleh sistem secara otonom dalam durasi hitungan detik atau menit saja. Fitur mutakhir ini dapat dieksekusi dengan baik berkat dukungan berbagai integrasi *library* canggih, utamanya fitur *rendering* manipulasi objek gambar di kanvas secara asinkronus, serta *storage queue* dari arsitektur *backend* mutakhir Supabase.

## C. Langkah-Langkah Pembuatan Fitur

### Langkah 1 – Persiapan & Instalasi Library

**Tujuan:**
Menyiapkan *environment* ekosistem proyek dan menginisialisasi ketergantungan modul eksternal maupun internal agar fitur logika penyatuan *layer* dokumen dapat diolah dengan baik.

**Penjelasan:**
Langkah pengawalan ini melibatkan penarikan modul-modul esensial yang menopang logika algoritma. Sistem memanfaatkan `useState` dari pustaka React untuk mempertahankan informasi siklus data. Selain itu, fitur notifikasi interaktif yang sangat penting untuk memberikan umpan balik persentase progres dicapai melalui modul `toast` dari pustaka Sonner. Terakhir, dilakukan impor fungsi *query* komunikasi basis data yang merujuk pada direktori fungsional Supabase internal, yang bertugas mengatur alur pemuatan desain *template* serta detail profil partisipan.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 1 sampai Line 9

**Kode:**
```typescript
// Line 1 - Import hook useState dari pustaka inti React untuk manajemen state
import { useState } from "react";
// Line 2 - Import pustaka toast dari sonner untuk notifikasi UI proses massal
import { toast } from "sonner";
// Line 3 - Import antarmuka dan utilitas fungsi terkait template dari direktori Supabase
import {
// Line 4 - Import tipe data definisi Template
  Template,
// Line 5 - Import fungsi utama untuk menarik URL aset gambar dasar template
  getTemplateImageUrl,
// Line 6 - Import fungsi untuk memanggil rekam koordinat layer letak teks 
  getTemplateLayout,
// Line 7 - Import fungsi pengunduh koleksi list template berdasarkan domain institusi
  getTemplatesForTenant,
// Line 8 - Penutup blok import spesifik template
} from "@/lib/supabase/templates";
// Line 9 - Import tipe Member serta fungsi pengambilan koleksi data member aktif
import { Member, getMembersForTenant } from "@/lib/supabase/members";
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE ONLY]                   │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.1 — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`, Line 1–9
> Tampilkan: Blok import *library* dan *module dependency* di baris paling atas dari sebuah berkas TypeScript untuk membuktikan persiapan operasional fungsionalitas.

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Langkah persiapan pustaka (*libraries*) secara murni berada di tataran arsitektur penulisan *source code* tanpa menghasilkan perubahan *output* antarmuka grafis di layar, sehingga jenis *screenshot code* tunggal adalah representasi yang paling tepat.

---

### Langkah 2 – Struktur File & Folder untuk Fitur Ini

**Tujuan:**
Mengelompokkan pemisahan logika pembuatan sertifikat massal ke dalam ruang kait moduler (*custom hooks*) independen guna mendesain struktur program yang terukur dan terawat.

**Penjelasan:**
Pada tingkat desain hierarki program ini, kompleksitas halaman interaktif utama diisolasi menggunakan metode abstraksi pemisahan ranah tanggung jawab (*separation of concerns*). Alih-alih meletakkan kode pembuatan gambar ribuan baris di dalam penampil utama UI (`page.tsx`), seluruh kode perhitungan logika *Bulk Generate* diwadahi pada berkas *hook* beralias `useCertificateGenerate.ts`. Berkas tersebut selanjutnya diimpor dan didaftarkan pada jembatan pengelola status `useCertificatesPage.ts`. Hal ini memastikan manajemen kode yang lebih ringkas dan meminimalisir kemungkinan *bug* *memory leak*.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificatesPage.ts` — Line 25 sampai Line 32

**Kode:**
```typescript
// Line 25 - Komentar sekat pembagian hook untuk fitur ekspor dasar yang dapat dibagikan
// Pre-existing extracted hooks (shared with hero-section.tsx)
// Line 26 - Import custom hook penyedia fungsionalitas ekspor dan unduhan
import { useCertificateExport } from "./useCertificateExport";
// Line 27 - Import custom hook fasilitator persuratan digital elektronik
import { useCertificateEmail } from "./useCertificateEmail";
// Line 28 - Baris pemisah penataan kode (spacing)
// Line 29 - Komentar sekat spesifik untuk hook fitur halaman manajemen tersentralisasi
// New page-specific extracted hooks
// Line 30 - Import custom hook pengelola status tabel, pemuatan data serta navigasi tabel
import { useCertificateState } from "./useCertificateState";
// Line 31 - Import custom hook yang mengeksekusi dan membungkus penuh mekanisme Bulk Generation
import { useCertificateGenerate } from "./useCertificateGenerate";
// Line 32 - Baris pemisah penataan kode (spacing)
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE ONLY]                   │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.2 — Source Code
> File: `src/features/certificates/hooks/useCertificatesPage.ts`, Line 25–32
> Tampilkan: Struktur impor *custom hooks* yang memperlihatkan dekomposisi logika kode, khususnya lokasi fungsi impor komponen penghasil seritifkat massal.

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Langkah ini bertujuan menerangkan model skema *Clean Architecture* pengelompokan fail (file) yang berada sepenuhnya pada wilayah pengaturan skrip sehingga tangkapan layar antarmuka pengguna tidak dibutuhkan.

---

### Langkah 3 – Pembuatan Template Sertifikat Dinamis

**Tujuan:**
Merumuskan logika penyusunan paket pemetaan variabel data dinamis yang akan disuntikkan secara presisi untuk menimpa area kustomisasi kanvas gambar.

**Penjelasan:**
Di tahap persiapan pra-cetak ini, dirancanglah sebuah relasi objek terstruktur yang bertugas menterjemahkan atribut kata kunci (contoh: nomor seri dan tanggal tenggat waktu) agar merujuk pada nilai spesifik per individu. Objek `variableData` ini dikerangkai untuk mengakomodasi fleksibilitas penimpaan (*fallback*); di mana bila pengguna memiliki pengaturan predikat dari fitur Excel, maka nilai-nilai pelengkap dari luapan Excel akan menyatu dan ditumpukkan ke variabel utamanya menggunakan notasi rest-spread (`...`). Algoritma inilah yang bertanggung jawab mensubstitusi label *placeholder* kurung kurawal pada templat editor administrator.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 143 sampai Line 151

**Kode:**
```typescript
// Line 143 - Menetapkan deklarasi objek map parameter bernilai tunggal ke label teks
const variableData: Record<string, string> = {
// Line 144 - Pemetaan pangkalan kata nama lengkap partisipan mengantisipasi atribut nama/name
  name: member.name || "", nama: member.name || "",
// Line 145 - Pemetaan pangkalan nomor surat seri sertifikat utama
  certificate_no: finalCertData.certificate_no || "",
// Line 146 - Pemetaan paragraf tambahan atau anotasi deskripsi dokumen
  description: finalCertData.description || "",
// Line 147 - Pengecekan eksistensi nilai angka mutu agar direkam sebagai string
  nilai: nilaiFromCert !== undefined && nilaiFromCert !== null ? String(nilaiFromCert) : "",
// Line 148 - Parsing struktur zona waktu dan penulisan standar tanggal rilis
  issue_date: formatDateString(finalCertData.issue_date, dateFormat),
// Line 149 - Parsing dinamis tanggal masa berakhir validasi jika format kedaluwarsa dicantumkan
  expired_date: finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "",
// Line 150 - Menggabungkan seluruh serapan ekstra atribut excel dari proses massal menggunakan spread array
  ...certDataMap, ...(excelRowData || {}), ...(scoreData || {}),
// Line 151 - Titik penutup ruang lingkup pendefinisian variabel rujukan string
};
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE + TAMPILAN WEB]         │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.3a — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`, Line 143–151
> Tampilkan: Blok pendefinisian variabel objek mapping tag data.
> 🌐 Gambar 3.3b — Tampilan Web
> Halaman: `Sertifikat > Builder (Editor Template)`
> Tampilkan: Antarmuka dari layar Editor Template yang mendemonstrasikan perletakan teks dengan format kurung kurawal seperti `{name}` atau `{certificate_no}` tepat di atas dasar desain.

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Diperlukan kombinasi visual perbandingan dua aspek ini karena esensi pemetaan variabel yang ditulis murni lewat *source code* secara nyata berdampak pada teknik peletakan label dinamis oleh pengguna di dalam mode UI *Builder* peramban Web.

---

### Langkah 4 – Pembuatan Form Input & Upload Data Massal

**Tujuan:**
Memecah, memindai, dan melakukan penyerapan parameter struktur baris per baris secara otomatis ketika pengguna mengunggah dokumen luapan Microsoft Excel.

**Penjelasan:**
Langkah strategis ini mencakup logika intersepsi ketika pengguna mentransmisikan *file* bereksistensi eksternal, yaitu tabel sel Excel. Mesin logika akan melintas per baris tabel di mana deteksi algoritma (*conditional branching*) dipakai untuk mendiagnosa properti identifikasi baku yang umum dipakai, mencakup ejaan `name`, atau `recipient`. Agar tidak bersinggungan (*crash*) pada integrasi *database*, sistem memberikan setiap identitas tersebut sebuah kartu identifikasi virtual bernomor token (*temporary id*). Langkah cermat ini menjaga kestabilan data selaras tanpa membebani direktori pengguna dengan catatan yang tidak diinginkan secara permanen.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 370 sampai Line 382

**Kode:**
```typescript
// Line 370 - Evaluasi gerbang awal pendeteksi mode muatan unggahan data dari fasilitas Excel
} else if (params.dataSource === "excel" && params.excelData) {
// Line 371 - Mencatat kompilasi target dan menyiapkan wadah indeks pencapaian konversi
  const total = params.excelData.length; let generated = 0;
// Line 372 - Menetapkan pola loop sinkron untuk setiap bongkah data baris Excel yang diekstrak
  for (const row of params.excelData) {
// Line 373 - Menyalakan sistem penangkap proteksi per baris iterasi guna mencegah fatal error total
    try {
// Line 374 - Mengakuisisi identitas partisipan dengan kapabilitas tebakan cerdas kunci sel (name/recipient)
      const name = String(row.name || row.recipient || "");
// Line 375 - Mengakuisisi anotasi narasi pelengkap khusus yang disyaratkan secara spesifik per sel
      const description = String(row.description || "");
// Line 376 - Menginisiasi rujukan kalender waktu penerbitan dokumen sertifikasi
      let issueDate = String(row.issue_date || row.date || "");
// Line 377 - Memasukkan cap waktu riil ISO tanggal hari ini apabila excel menihilkan bidang tanggalnya
      if (!issueDate) issueDate = new Date().toISOString().split("T")[0];
// Line 378 - Merumuskan seri nomor sertifikat unik dengan fallback pendeteksi sel ejaan 'cert_no'
      const certNo = String(row.certificate_no || row.cert_no || "");
// Line 379 - Merumuskan seri validitas batas tenggat waktu kedaluwarsa dokumen
      const expiredDate = String(row.expired_date || row.expiry || "");
// Line 380 - Mengonstruksi wujud objek profil partisipan virtual sementara yang terisolasi dari direktori member inti
      const tempMember: Member = { id: `temp-${Date.now()}-${generated}`, name, email: String(row.email || ""), organization: String(row.organization || ""), phone: String(row.phone || ""), job: String(row.job || ""), date_of_birth: null, address: String(row.address || ""), city: String(row.city || ""), notes: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
// Line 381 - Menata direktori kosong untuk pengepulan data label sisa pelengkap Excel
      const excelRowData: Record<string, string> = {};
// Line 382 - Putaran pengulangan mendalam untuk mengkonversi kolom-kolom custom secara bebas (Object entries)
      for (const [k, v] of Object.entries(row)) {
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [TAMPILAN WEB ONLY]                  │
└─────────────────────────────────────────────┘
> 🌐 Gambar 3.4 — Tampilan Web
> Halaman: `Modal Wizard Generate / Excel Upload Step`
> Tampilkan: Antarmuka jendela Modal dialog unggahan yang menyajikan kotak area berkas *Dropzone* yang siap membaca ekstensi `.xlsx` / `.csv`.
> Fokus pada: Sorot kolom tabel penampil pratinjau matriks data hasil ekstrak berkas Excel yang mencantumkan deretan sampel profil pengguna di layar.

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Fokus utama di langkah operasional eksternal ini adalah pemastian pembacaan sukses data *offline*, sehingga tangkapan UI antarmuka jendela *upload* dan pratinjau tabelnya adalah bukti implementasi yang paling kuat.

---

### Langkah 5 – Logic Bulk Generation (Looping, Inject Data, Generate File)

**Tujuan:**
Memproses eksekusi produksi kanvas digital secara massal serentak dalam bingkai perulangan asinkronus agar terunggah otomatis dengan pemonitoran progres transparan.

**Penjelasan:**
Proses kalkulasi berat diselesaikan dalam etape ini, yang mewakili nadi kekuatan utama pemrosesan *Bulk Generate*. Untuk mencegah memori kolaps pada komputasi web, rutinitas pencetakan diatur menggunakan loop `for...of` terkurung `await` untuk menerapkan penugasan gambar linear (*sequential processing*). Per baris komputasi, fungsi utama generasi sertifikat mendikte peramban untuk menggambar penempatan font, membubuhi *QR Code*, dan mengekspor hasilnya. Secara proaktif, fungsi `toast.loading` dilibatkan untuk melayani pembaharuan UI pengukur rasio selesai di sudut layar demi menjaga ekspektasi dan interaktivitas bagi penggunanya di sisi *client*.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateGenerate.ts` — Line 351 sampai Line 360

**Kode:**
```typescript
// Line 351 - Merekap total populasi partisipan di keranjang terpilih disusul penandaan kuota kesuksesan awal
const total = params.members.length; let generated = 0;
// Line 352 - Melepas operasi asinkronus ke dalam lintasan rotasi berdasarkan list agregat peserta
for (const member of params.members) {
// Line 353 - Mengaktifkan perisai perangkap anomali jaringan yang mencegah gagal serentak bila terjadi gangguan sinyal 
  try {
// Line 354 - Melemparkan instruksi kompilasi file spesifik untuk satu lembar sertifikat unik kepada mesin kanvas 
    await generateSingleCertificate(params.template, member, params.certificateData, defaults, params.dateFormat, params.scoreDataMap?.[member.id], layoutConfig);
// Line 355 - Meresmikannya sebagai file tuntas apabila operasi upload gambar disetujui server tujuan
    generated++;
// Line 356 - Menyetel ulang panel dialog berjalan progres dengan informasi angka riil pencapaian (misalnya 45/100)
    toast.loading(`${t("quickGenerate.generatingCertificates")} ${generated}/${total}`, { id: loadingToast });
// Line 357 - Mengabaikan kegagalan lalu menyajikan diagnosis error terperinci tunggal ke riwayat log console web
  } catch (e) { console.error(`❌ Failed for ${member.name}:`, e); }
// Line 358 - Terminasi blok pengulangan rotasi produksi berkas dokumen
}
// Line 359 - Mengakhiri tampilan loading wheel di ujung layar UI sebagai tanda istirahat tugas
toast.dismiss(loadingToast);
// Line 360 - Menerbitkan jendela pengumuman kemenangan operasional massal bersama jumlah data akurat yang lulus sensor
toast.success(`${t("quickGenerate.successMultiple")} ${generated}/${total} ${t("quickGenerate.certificatesGenerated")}`, { duration: 3000 });
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE + TAMPILAN WEB]         │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.5a — Source Code
> File: `src/features/certificates/hooks/useCertificateGenerate.ts`, Line 351–360
> Tampilkan: Seluruh ruas lintasan kode perulangan pencetakan massal dengan fungsi `toast` pembaruan metrik progres.
> 🌐 Gambar 3.5b — Tampilan Web
> Halaman: `Sertifikat > Proses Generate`
> Tampilkan: Elemen notifikasi progres antarmuka *Toast Loading* di pojok web peramban, yang tertulis teks aktivitas pemuatan misalnya "Generating certificates 45/100".

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Karena fungsi logika internal berpadu dengan aktivitas yang membutuhkan jeda durasi pemrosesan asinkronus, menunjukkan potret kode sejajar dengan representasi notifikasi indikator UI di layar dapat menginformasikan konsep dengan jelas dan logis.

---

### Langkah 6 – Fitur Download (ZIP / Link Unik per Sertifikat)

**Tujuan:**
Menyediakan gerbang fasilitas penerbitan alamat URL eksternal yang praktis dan kompatibilitas opsi penyalinan otomatis ke dalam memori komputer pengguna (ekspor dokumen).

**Penjelasan:**
Selepas ribuan lembar dokumen gambar biner tercipta di dalam tangki repositori sistem *cloud*, tahapan penutup fitur ini diimplementasikan untuk menyediakan akses jalur publik. Logika program di langkah ini memastikan ketersediaan metode *share link* yang akurat. Mekanismenya secara pintar menyortir keamanan direktori: Jika aset diyakini telah tertanam permanen di dalam wadah Supabase Storage murni, program cukup menyalin URL *raw*-nya. Namun apabila berkas butuh autentikasi portal peninjau rilis, maka ia membuat kerangka tautan rujukan lokal `/cek/[public_id]`. Selain ini, file di berkas terintegrasi ini juga memuat logika pembuatan berkas padat berbasis format konversi instan.

**Lokasi File:**
> 📁 `src/features/certificates/hooks/useCertificateExport.ts` — Line 167 sampai Line 184

**Kode:**
```typescript
// Line 167 - Deklarasi arsitektur perakitan pemanggilan rutin untuk pemformatan penyalinan URL publik sertifikat
const generateCertificateLink = useCallback(
// Line 168 - Mewajibkan injeksi struktur model entitas properti sertifikat yang sudah ditandatangani ID uniknya
  async (certificate: Certificate) => {
// Line 169 - Pintu masuk blok komputasi bersarang untuk perisai keutuhan penanganan kesalahan (*error shielding*)
    try {
// Line 170 - Mekanisme Skrining Resolusi Pertama: Validasi eksistensi dan tipe muatan akses URL penyimpanan luar
      if (
// Line 171 - Mengunci keamanan pemanggilan metode agar tidak mengiterasi properti tak berwujud (*undefined url property*)
        certificate.certificate_image_url &&
// Line 172 - Melaksanakan pengujian keaslian domain yang sah tersambung langsung dengan ekosistem hosting milik Supabase
        certificate.certificate_image_url.includes("supabase.co/storage")
// Line 173 - Ekspansi penetapan area parameter persetujuan kondisi Skrining Pertama
      ) {
// Line 174 - Mengeksekusi API sinkronisasi memori browser lokal untuk menyuntikkan URL gambar rakitan kepada papan klip (*clipboard*)
        await copyToClipboard(certificate.certificate_image_url);
// Line 175 - Melepaskan laporan notifikasi instan interaktif visual berwarna hijau ke arah administrasi atas tuntasnya metode *copy*
        toast.success(t("hero.linkCopied"));
// Line 176 - Terminasi penghentian eksekusi blok kode di bawahnya secara absolut untuk menjaga efisiensi sirkuit program
        return;
// Line 177 - Titik pembatas gerbang kondisi validasi prioritas pertama
      }
// Line 178 - Ruang perantara sela pembagian metode baca struktur pengkondisian alternatif
// Line 179 - Mekanisme Resolusi Alternatif (Kedua): Pembangkitan relasi rujukan internal menggunakan parameter *token public id*
// Line 180 - Pemeriksaan ganda guna memastikan keamanan otorisasi terpublikasi atau tidak (keabsahan field publik)
      if (!certificate.public_id) {
// Line 181 - Merilis keluhan umpan balik sistem merah akibat tidak adanya hak penyiaran dari tabel direktori *database*
        toast.error(t("hero.noPublicLink"));
// Line 182 - Pemutusan sirkuit rantai pemanggilan penyalinan secara dini
        return;
// Line 183 - Garis akhir ruang pembatas validasi keamanan publik id
      }
// Line 184 - Menarik konfigurasi preferensi peladen induk (*Domain Origin Server*) secara langsung lewat rahasia sistem *environment*
      let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [SOURCE CODE ONLY]                   │
└─────────────────────────────────────────────┘
> 📄 Gambar 3.6 — Source Code
> File: `src/features/certificates/hooks/useCertificateExport.ts`, Line 167–184
> Tampilkan: Fungsi utama asinkronus `generateCertificateLink` dengan konstruksi prioritas validasi penyalinan parameter rute penyimpanan lokal sistem operasi (*clipboard*).

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Karena sifat teknikal dan eksekusinya yang tidak tampak kasat mata (terjadi senyap lewat modifikasi intervensi ke memori OS di latar belakang tab peramban), penjabaran dokumentasi teknis dalam rupa representasi kode terstruktur murni merupakan pemaparan yang jauh bernilai lebih akurat.

---

### Langkah 7 – Pengujian Fitur

**Tujuan:**
Memverifikasi ketepatan dan ketahanan keseluruhan proses otomatisasi siklus secara nyata pada parameter lingkungan *production level*, memastikan hasil seragam nan bebas hambatan.

**Penjelasan:**
Pada pengujian pamungkas tahap *Black-Box Testing* fungsional ini, diuji seberapa presisi antarmuka web merespon pemanggilan metode `handleQuickGenerate`. Di langkah ini dikonfirmasi keakuratan injeksi font, proporsi tata letak koordinat data profil baris spesifik, kecepatan konektivitas *upload* muatan berat pada *Cloud*, serta visualisasi *thumbnails* tabel dasbor final. Keberhasilan pengujian terbukti sewaktu administrator menyaksikan jajaran sertifikat yang barusan dicetak secara mandiri telah terekam di indeks riwayat *database* lengkap dengan kapabilitas opsional klik-salin maupun unduh instan.

**Lokasi File:**
> 📁 `src/app/certificates/page.tsx` — Line 45 sampai Line 46

**Kode:**
```typescript
// Line 45 - Membuka deskripsi blok variabel *state destructing* yang menopang *event handler* manajemen massal (*bulk event props*)
// Generate
// Line 46 - Pelepasan kait penerima referensi status bukaan jendelan modal serta *action handler* pengendali generasi berurutan ke *rendering engine*
quickGenerateOpen, setQuickGenerateOpen, wizardGenerateOpen, setWizardGenerateOpen, templates, members, handleOpenWizardGenerate, handleQuickGenerate,
```

**📸 Panduan Tangkapan Layar:**
┌─────────────────────────────────────────────┐
│ JENIS: [TAMPILAN WEB ONLY]                  │
└─────────────────────────────────────────────┘
> 🌐 Gambar 3.7 — Tampilan Web
> Halaman: `Halaman Dashboard Manajemen Sertifikat (/certificates)`
> Tampilkan: Area panel tabel dan *grid* list berisi himpunan dokumen yang barusan diproses, yang terlihat sudah memuat data penerima (nama partisipan berbeda-beda) yang akurat.
> Fokus pada: Kolom *Thumbnail* gambar desain mini sertifikat dan kolom *Issue Date* yang seragam waktunya, dengan menu tombol tarik-turun (*dropdown/opsi aksi baris*) terekspos untuk memperlihatkan tombol salin Link maupun PDF siap unduh.

ALASAN PEMILIHAN JENIS SCREENSHOT:
> Esensi validasi pengujian ada di representasi luaran purna hasil (*output*). Gambar pameran dasbor dipenuhi rentetan rekaman nama yang berhasil tercetak secara sukses adalah demonstrasi puncak mutlak bagi efisiensi fitur integrasi masif ini.

---

**Hasil:**
Dengan mengeksekusi integrasi menyeluruh dari kompilasi langkah algoritma mutakhir ini, kapabilitas fitur penyusunan berkas paralel atau *Bulk Certificate Generation* berhasil difungsikan seutuhnya pada platform `sertifikat.ubig.co.id`. Administrator sistem kini dapat mengonversi tumpukan beban muatan tabel data penerima berkapasitas masif menjadi aset dokumen sertifikat digital elegan dan berformat final siap unduh (*production ready*) terdistribusi mulus di *cloud* dalam estimasi durasi menit tanpa kekhawatiran inkonsistensi sedikit pun.
