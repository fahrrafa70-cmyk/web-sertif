"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation data
type Translations = Record<Language, Record<string, string>>;
const translations: Translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About E-Certificate',
    'nav.templates': 'Templates',
    'nav.certificates': 'Certificates',
    'nav.myCertificates': 'My Certificates',
    'nav.faq': 'FAQ',
    'nav.management': 'Management',
    'nav.explore': 'Explore',
    'nav.contact': 'Contact',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Log Out',
    'auth.role': 'Role',
    'auth.selectRole': 'Select Role',
    'auth.admin': 'Admin',
    'auth.team': 'Team',
    'auth.public': 'Public',
    
    // Templates
    'templates.title': 'Templates',
    'templates.subtitle': 'Manage and create certificate templates',
    'templates.create': 'Create Template',
    'templates.edit': 'Edit',
    'templates.delete': 'Delete',
    'templates.preview': 'Preview',
    'templates.name': 'Template Name',
    'templates.category': 'Category',
    'templates.orientation': 'Orientation',
    'templates.landscape': 'Landscape',
    'templates.portrait': 'Portrait',
    'templates.description': 'Description',
    'templates.actions': 'Actions',
    'templates.search': 'Search templates...',
    'templates.allCategories': 'All Categories',
    'templates.noTemplates': 'No templates found',
    'templates.createNew': 'Create New Template',
    'templates.templatePreview': 'Template Preview',
    'templates.templateDetails': 'Details and preview of the selected template.',
    'templates.cleanupImages': 'Cleanup Images',
    'templates.cleaning': 'Cleaning...',
    'templates.useThisTemplate': 'Use This Template',
    'templates.loading': 'Loading Templates',
    
    // Certificates
    'certificates.title': 'Certificates',
    'certificates.subtitle': 'Manage and track certificates',
    'certificates.create': 'Create Certificate',
    'certificates.certificateId': 'Certificate Number',
    'certificates.recipient': 'Recipient',
    'certificates.issuedDate': 'Issued Date',
    'certificates.status': 'Status',
    'certificates.actions': 'Actions',
    'certificates.search': 'Search certificates...',
    'certificates.noCertificates': 'No certificates found',
    'certificates.download': 'Download',
    'certificates.verify': 'Verify',
    'certificates.edit': 'Edit',
    'certificates.delete': 'Delete',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.preview': 'Preview',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Footer
    'footer.multilingual': 'Multilingual Platform',
    'footer.phone': '+6281380935185',
    'footer.email': 'fahrirafa.rpl1@gmail.com',
    'footer.location': 'Malang',
    
    // Language
    'language.english': 'English',
    'language.indonesia': 'Indonesia',
    'language.switch': 'Switch Language',
    
    // Hero Section
    'hero.title': 'E-Certificate Management Platform',
    'hero.subtitle': 'Digital Certificate Solutions',
    'hero.description': 'Create, manage, and verify digital certificates for trainings, internships, MoUs, and industrial visits with our professional multilingual platform.',
    'hero.searchPlaceholder': 'Search certificate by ID...',
    'hero.searchButton': 'Search Certificate',
    'hero.getStarted': 'Get Started',
    'hero.learnMore': 'Learn More',
    
    // About Section
    'about.title': 'About E-Certificate',
    'about.description1': 'Our multilingual E-Certificate Management Platform revolutionizes how organizations create, manage, and verify certificates for various programs including trainings, internships, MoUs, and industrial visits.',
    'about.description2': 'Built with modern technology stack including Next.js, Shadcn UI, Tailwind CSS, and Supabase, our platform ensures scalability, security, and seamless user experience across multiple languages.',
    'about.features.multiUser': 'Multi-User Management',
    'about.features.multiUserDesc': 'Support for Admin, Team, and Public access levels with role-based permissions.',
    'about.features.professional': 'Professional Certificates',
    'about.features.professionalDesc': 'Create beautiful, verifiable certificates with customizable templates and layouts.',
    'about.features.secure': 'Secure Verification',
    'about.features.secureDesc': 'Public verification system with unique URLs for each certificate.',
    'about.features.email': 'Email Integration',
    'about.features.emailDesc': 'Send certificates via email individually or in bulk with advanced filtering options.',
    
    // Footer
    'footer.quickLinks': 'Quick Links',
    'footer.legal': 'Legal',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.contact': 'Contact Us',
    'footer.cookies': 'Cookie Policy',
    'footer.developedBy': 'Developed by',
    
    
    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Find answers to common questions about our platform',
    'faq.q1': 'What is the E-Certificate Management Platform?',
    'faq.a1': 'The E-Certificate Management Platform is a comprehensive solution for creating, managing, and verifying certificates for various programs including trainings, internships, MoUs, and industrial visits. It supports multiple languages and offers role-based access control.',
    'faq.q2': 'What languages are supported?',
    'faq.a2': 'Our platform currently supports English (default) and Indonesian languages, with seamless switching between them. We\'re continuously working to add more language support based on user demand.',
    'faq.q3': 'What are the different access levels?',
    'faq.a3': 'We offer three main access levels: Admin (full management access), Team (can add, view, and edit certificates but cannot delete), and Public (can search and view specific certificates via search or direct URL access).',
    'faq.q4': 'How do I create a certificate?',
    'faq.a4': 'Creating certificates is simple: 1) Choose or create a template, 2) Select a category, 3) Add member information, 4) Generate the certificate as PDF, and 5) Send via email if needed. Our platform guides you through each step.',
    'faq.q5': 'Can I import data from Excel?',
    'faq.a5': 'Yes, our platform supports bulk import from Excel files. You can upload a spreadsheet with member information and automatically generate multiple certificates at once.',
    'faq.q6': 'How secure are the certificates?',
    'faq.a6': 'All certificates are secured with unique verification URLs and can be verified publicly. We use industry-standard encryption and security measures to protect your data.',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Platform preferences',
    'settings.organization': 'Organization Name',
    'settings.organizationPlaceholder': 'Your organization',
    'settings.language': 'Default Language',
    'settings.languagePlaceholder': 'en / id',
    'settings.save': 'Save Changes',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to your dashboard',
    'dashboard.overview': 'Overview',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.stats.members': 'Members',
    'dashboard.stats.membersChange': '+5 this week',
    
    // Analytics
    'analytics.title': 'Analytics',
    'analytics.subtitle': 'Platform usage and insights',
    'analytics.totalCertificates': 'Total Certificates',
    'analytics.totalTemplates': 'Total Templates',
    'analytics.totalUsers': 'Total Users',
    'analytics.recentActivity': 'Recent Activity',
    
    // Categories
    'categories.title': 'Categories',
    'categories.subtitle': 'Manage certificate categories',
    'categories.create': 'Create Category',
    'categories.name': 'Category Name',
    'categories.description': 'Description',
    'categories.color': 'Color',
    'categories.actions': 'Actions',
    
    // Members
    'members.title': 'Members',
    'members.subtitle': 'Manage members and their certificates',
    'members.addMember': 'Add Member',
    'members.viewCertificates': 'View Certificates',
    'members.loadCertificatesFailed': 'Failed to load certificates',
    'members.loadMembersFailed': 'Failed to load members',
    'members.loadingPage': 'Preparing members page...',
    'members.accessDenied.title': 'Access Denied',
    'members.accessDenied.message': 'You do not have permission to view this page.',
    'members.nameRequired': 'Full name is required',
    'members.updateSuccess': 'Member updated successfully',
    'members.updateFailed': 'Failed to update member',
    'members.addSuccess': 'Member added successfully',
    'members.addFailed': 'Failed to add member',
    'members.deleteNoPermission': "You don't have permission to delete members",
    'members.deleteSuccess': 'Member deleted successfully',
    'members.deleteFailed': 'Failed to delete member',
    'members.adding': 'Adding...',
    'members.saving': 'Saving...',
    'members.saveChanges': 'Save Changes',
    'members.certificateImagePreview': 'Certificate Image',
    'members.noImage': 'No image',
    'members.loadingMembers': 'Loading members...',
    'members.noMembersTitle': 'No members yet',
    'members.noMembersMessage': 'Start by adding your first member.',
    'members.certificates': 'Certificates',
    'members.noCertificatesForMember': 'No certificates for this member',
    'members.editMember': 'Edit Member',
    'members.form.fullName': 'Full Name',
    'members.form.fullNamePlaceholder': 'e.g. John Doe',
    'members.form.email': 'Email',
    'members.form.organization': 'Organization',
    'members.form.phone': 'Phone',
    'members.form.job': 'Job',
    'members.form.dob': 'Date of Birth',
    'members.form.address': 'Address',
    'members.form.city': 'City',
    'members.form.notes': 'Notes',
    'members.form.optional': 'Optional',
    'members.table.name': 'Name',
    'members.table.organization': 'Organization',
    'members.table.email': 'Email',
    'members.excel.title': 'Excel Import Format',
    'members.excel.description': 'Please prepare your Excel file with the following columns',
    'members.excel.requiredColumns': 'Required Columns:',
    'members.excel.optionalColumns': 'Columns To Fill:',
    'members.excel.exampleFormat': 'Example Format:',
    'members.excel.note': 'Note:',
    'members.excel.noteText': 'Column names are case-insensitive. You can use "Name", "name", or "NAME".',
    'members.excel.cancel': 'Cancel',
    'members.excel.chooseFile': 'Choose Excel File',
    'members.excel.importing': 'Importing...',
    'members.excel.importExcel': 'Import Excel',
    'members.excel.nameRequired': 'Full name of the member (Required)',
    'members.table.phone': 'Phone',
    'members.table.job': 'Job',
    'members.table.city': 'City',
    'members.table.actions': 'Actions',

    // My Certificates
    'myCertificates.title': 'My Certificates',
    'myCertificates.subtitle': 'View and manage your certificates',
    'myCertificates.search': 'Search certificates...',
    'myCertificates.noCertificates': 'No certificates found',
    'myCertificates.download': 'Download',
    'myCertificates.verify': 'Verify',
    
    // Certificate Generator
    'generator.title': 'Certificate Generator',
    'generator.subtitle': 'Create and customize certificates',
    'generator.template': 'Template',
    'generator.recipient': 'Recipient Information',
    'generator.preview': 'Certificate Preview',
    'generator.generate': 'Generate Certificate',
    'generator.download': 'Download PDF',
    'generator.email': 'Send via Email',
    'generator.recipientName': 'Recipient Name',
    'generator.recipientEmail': 'Recipient Email',
    'generator.courseName': 'Course Name',
    'generator.completionDate': 'Completion Date',
    'generator.certificateId': 'Certificate ID',
    'generator.organization': 'Organization',
    'generator.instructor': 'Instructor',
    'generator.duration': 'Duration',
    'generator.grade': 'Grade',
    'generator.notes': 'Notes',
    
    // Navigation
    'nav.menu': 'Menu',
    
    // Error Messages - Search
    'error.search.notFound': 'Certificate not found. Please check the certificate number or link and try again.',
    'error.search.empty': 'Please enter a certificate number, name, or link to search',
    'error.search.failed': 'Search failed. Please try again.',
    
    // Error Messages - Login
    'error.login.invalidEmail': 'Please enter a valid email address.',
    'error.login.invalidPassword': 'Your password must be at least 6 characters long.',
    'error.login.invalidCredentials': 'Invalid email or password.',
    
    // Search & Filter
    'search.filters': 'Filters',
    'search.category': 'Category',
    'search.allCategories': 'All Categories',
    'search.dateRange': 'Date Range',
    'search.startDate': 'Start Date',
    'search.endDate': 'End Date',
    'search.clearFilters': 'Clear Filters',
    'search.applyFilters': 'Apply Filters',
    'search.noResults': 'No matching results found for',
    'search.noResultsGeneral': 'No certificates found',
    'search.filteredBy': 'Filtered by',
    'search.showingResults': 'Showing results',
    'search.searchByName': 'Search by name, ID, or link...',
  },
  id: {
    // Navigation
    'nav.home': 'Beranda',
    'nav.about': 'Tentang E-Certificate',
    'nav.templates': 'Template',
    'nav.certificates': 'Sertifikat',
    'nav.myCertificates': 'Sertifikat Saya',
    'nav.faq': 'FAQ',
    'nav.management': 'Manajemen',
    'nav.explore': 'Jelajahi',
    'nav.contact': 'Kontak',
    
    // Auth
    'auth.login': 'Masuk',
    'auth.register': 'Daftar',
    'auth.logout': 'Keluar',
    'auth.role': 'Peran',
    'auth.selectRole': 'Pilih Peran',
    'auth.admin': 'Admin',
    'auth.team': 'Tim',
    'auth.public': 'Publik',
    
    // Templates
    'templates.title': 'Template',
    'templates.subtitle': 'Kelola dan buat template sertifikat',
    'templates.create': 'Buat Template',
    'templates.edit': 'Edit',
    'templates.delete': 'Hapus',
    'templates.preview': 'Pratinjau',
    'templates.name': 'Nama Template',
    'templates.category': 'Kategori',
    'templates.orientation': 'Orientasi',
    'templates.landscape': 'Landscape',
    'templates.portrait': 'Portrait',
    'templates.description': 'Deskripsi',
    'templates.actions': 'Aksi',
    'templates.search': 'Cari template...',
    'templates.allCategories': 'Semua Kategori',
    'templates.noTemplates': 'Tidak ada template ditemukan',
    'templates.createNew': 'Buat Template Baru',
    'templates.templatePreview': 'Pratinjau Template',
    'templates.templateDetails': 'Detail dan pratinjau template yang dipilih.',
    'templates.cleanupImages': 'Bersihkan Gambar',
    'templates.cleaning': 'Membersihkan...',
    'templates.useThisTemplate': 'Gunakan Template Ini',
    'templates.loading': 'Memuat Template',
    
    // Certificates
    'certificates.title': 'Sertifikat',
    'certificates.subtitle': 'Kelola dan lacak sertifikat',
    'certificates.create': 'Buat Sertifikat',
    'certificates.certificateId': 'Nomor Sertifikat',
    'certificates.recipient': 'Penerima',
    'certificates.issuedDate': 'Tanggal Diterbitkan',
    'certificates.status': 'Status',
    'certificates.actions': 'Aksi',
    'certificates.search': 'Cari sertifikat...',
    'certificates.noCertificates': 'Tidak ada sertifikat ditemukan',
    
    // Common
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.close': 'Tutup',
    'common.edit': 'Edit',
    'common.delete': 'Hapus',
    'common.preview': 'Pratinjau',
    'common.search': 'Cari',
    'common.loading': 'Memuat...',
    'common.error': 'Error',
    'common.success': 'Berhasil',
    'common.confirm': 'Konfirmasi',
    'common.yes': 'Ya',
    'common.no': 'Tidak',
    
    // Footer
    'footer.multilingual': 'Platform Multibahasa',
    'footer.phone': '+6281380935185',
    'footer.email': 'fahrirafa.rpl1@gmail.com',
    'footer.location': 'Malang',
    
    // Language
    'language.english': 'English',
    'language.indonesia': 'Indonesia',
    'language.switch': 'Ganti Bahasa',
    
    // Hero Section
    'hero.title': 'Platform Manajemen E-Certificate',
    'hero.subtitle': 'Solusi Sertifikat Digital',
    'hero.description': 'Buat, kelola, dan verifikasi sertifikat digital untuk pelatihan, magang, MoU, dan kunjungan industri dengan platform multibahasa profesional kami.',
    'hero.searchPlaceholder': 'Cari sertifikat berdasarkan ID...',
    'hero.searchButton': 'Cari Sertifikat',
    'hero.getStarted': 'Mulai Sekarang',
    'hero.learnMore': 'Pelajari Lebih Lanjut',
    
    // About Section
    'about.title': 'Tentang E-Certificate',
    'about.description1': 'Platform Manajemen E-Certificate multibahasa kami merevolusi cara organisasi membuat, mengelola, dan memverifikasi sertifikat untuk berbagai program termasuk pelatihan, magang, MoU, dan kunjungan industri.',
    'about.description2': 'Dibangun dengan teknologi modern termasuk Next.js, Shadcn UI, Tailwind CSS, dan Supabase, platform kami memastikan skalabilitas, keamanan, dan pengalaman pengguna yang mulus di berbagai bahasa.',
    'about.features.multiUser': 'Manajemen Multi-Pengguna',
    'about.features.multiUserDesc': 'Dukungan untuk level akses Admin, Tim, dan Publik dengan izin berbasis peran.',
    'about.features.professional': 'Sertifikat Profesional',
    'about.features.professionalDesc': 'Buat sertifikat yang indah dan dapat diverifikasi dengan template dan tata letak yang dapat disesuaikan.',
    'about.features.secure': 'Verifikasi Aman',
    'about.features.secureDesc': 'Sistem verifikasi publik dengan URL unik untuk setiap sertifikat.',
    'about.features.email': 'Integrasi Email',
    'about.features.emailDesc': 'Kirim sertifikat melalui email secara individual atau massal dengan opsi filter lanjutan.',
    
    // Footer
    'footer.quickLinks': 'Tautan Cepat',
    'footer.legal': 'Legal',
    'footer.privacy': 'Kebijakan Privasi',
    'footer.terms': 'Syarat Layanan',
    'footer.contact': 'Hubungi Kami',
    'footer.cookies': 'Kebijakan Cookie',
    'footer.developedBy': 'Dikembangkan oleh',
    
    
    // FAQ
    'faq.title': 'Pertanyaan yang Sering Diajukan',
    'faq.subtitle': 'Temukan jawaban untuk pertanyaan umum tentang platform kami',
    'faq.q1': 'Apa itu Platform Manajemen E-Certificate?',
    'faq.a1': 'Platform Manajemen E-Certificate adalah solusi komprehensif untuk membuat, mengelola, dan memverifikasi sertifikat untuk berbagai program termasuk pelatihan, magang, MoU, dan kunjungan industri. Mendukung berbagai bahasa dan menawarkan kontrol akses berbasis peran.',
    'faq.q2': 'Bahasa apa saja yang didukung?',
    'faq.a2': 'Platform kami saat ini mendukung bahasa Inggris (default) dan Indonesia, dengan peralihan yang mulus di antara keduanya. Kami terus bekerja untuk menambahkan dukungan bahasa lebih banyak berdasarkan permintaan pengguna.',
    'faq.q3': 'Apa saja level akses yang berbeda?',
    'faq.a3': 'Kami menawarkan tiga level akses utama: Admin (akses manajemen penuh), Tim (dapat menambah, melihat, dan mengedit sertifikat tetapi tidak dapat menghapus), dan Publik (dapat mencari dan melihat sertifikat tertentu melalui pencarian atau akses URL langsung).',
    'faq.q4': 'Bagaimana cara membuat sertifikat?',
    'faq.a4': 'Membuat sertifikat sangat mudah: 1) Pilih atau buat template, 2) Pilih kategori, 3) Tambahkan informasi anggota, 4) Generate sertifikat sebagai PDF, dan 5) Kirim melalui email jika diperlukan. Platform kami memandu Anda melalui setiap langkah.',
    'faq.q5': 'Bisakah saya mengimpor data dari Excel?',
    'faq.a5': 'Ya, platform kami mendukung impor massal dari file Excel. Anda dapat mengunggah spreadsheet dengan informasi anggota dan secara otomatis menghasilkan beberapa sertifikat sekaligus.',
    'faq.q6': 'Seberapa aman sertifikat-sertifikat tersebut?',
    'faq.a6': 'Semua sertifikat diamankan dengan URL verifikasi unik dan dapat diverifikasi secara publik. Kami menggunakan enkripsi standar industri dan langkah-langkah keamanan untuk melindungi data Anda.',
    
    // Settings
    'settings.title': 'Pengaturan',
    'settings.subtitle': 'Preferensi platform',
    'settings.organization': 'Nama Organisasi',
    'settings.organizationPlaceholder': 'Organisasi Anda',
    'settings.language': 'Bahasa Default',
    'settings.languagePlaceholder': 'en / id',
    'settings.save': 'Simpan Perubahan',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Selamat datang di dashboard Anda',
    'dashboard.overview': 'Ringkasan',
    'dashboard.recentActivity': 'Aktivitas Terbaru',
    'dashboard.quickActions': 'Aksi Cepat',
    
    // Analytics
    'analytics.title': 'Analitik',
    'analytics.subtitle': 'Penggunaan platform dan wawasan',
    'analytics.totalCertificates': 'Total Sertifikat',
    'analytics.totalTemplates': 'Total Template',
    'analytics.totalUsers': 'Total Pengguna',
    'analytics.recentActivity': 'Aktivitas Terbaru',
    
    // Categories
    'categories.title': 'Kategori',
    'categories.subtitle': 'Kelola kategori sertifikat',
    'categories.create': 'Buat Kategori',
    'categories.name': 'Nama Kategori',
    'categories.description': 'Deskripsi',
    'categories.color': 'Warna',
    'categories.actions': 'Aksi',
    
    // Members
    'members.title': 'Anggota',
    'members.subtitle': 'Kelola anggota dan sertifikatnya',
    'members.addMember': 'Tambah Anggota',
    'members.viewCertificates': 'Lihat Sertifikat',
    'members.loadCertificatesFailed': 'Gagal memuat sertifikat',
    'members.loadMembersFailed': 'Gagal memuat data anggota',
    'members.loadingPage': 'Menyiapkan halaman anggota...',
    'members.accessDenied.title': 'Akses Ditolak',
    'members.accessDenied.message': 'Anda tidak memiliki izin untuk melihat halaman ini.',
    'members.nameRequired': 'Nama lengkap wajib diisi',
    'members.updateSuccess': 'Data anggota berhasil diperbarui',
    'members.updateFailed': 'Gagal memperbarui data anggota',
    'members.addSuccess': 'Anggota berhasil ditambahkan',
    'members.addFailed': 'Gagal menambahkan anggota',
    'members.deleteNoPermission': 'Anda tidak memiliki izin untuk menghapus anggota',
    'members.deleteSuccess': 'Anggota berhasil dihapus',
    'members.deleteFailed': 'Gagal menghapus anggota',
    'members.adding': 'Menambahkan...',
    'members.saving': 'Menyimpan...',
    'members.saveChanges': 'Simpan Perubahan',
    'members.certificateImagePreview': 'Gambar Sertifikat',
    'members.noImage': 'Tidak ada gambar',
    'members.loadingMembers': 'Memuat data anggota...',
    'members.noMembersTitle': 'Belum ada anggota',
    'members.noMembersMessage': 'Mulai dengan menambahkan anggota pertama Anda.',
    'members.certificates': 'Sertifikat',
    'members.noCertificatesForMember': 'Tidak ada sertifikat untuk anggota ini',
    'members.editMember': 'Edit Anggota',
    'members.form.fullName': 'Nama Lengkap',
    'members.form.fullNamePlaceholder': 'contoh: Budi Santoso',
    'members.form.email': 'Email',
    'members.form.organization': 'Organisasi',
    'members.form.phone': 'Telepon',
    'members.form.job': 'Pekerjaan',
    'members.form.dob': 'Tanggal Lahir',
    'members.form.address': 'Alamat',
    'members.form.city': 'Kota',
    'members.form.notes': 'Catatan',
    'members.form.optional': 'Opsional',
    'members.table.name': 'Nama',
    'members.table.organization': 'Organisasi',
    'members.table.email': 'Email',
    'members.table.phone': 'Telepon',
    'members.table.job': 'Pekerjaan',
    'members.table.city': 'Kota',
    'members.table.actions': 'Aksi',
    'members.excel.title': 'Format Import Excel',
    'members.excel.description': 'Silakan siapkan file Excel Anda dengan kolom-kolom berikut',
    'members.excel.requiredColumns': 'Kolom Wajib:',
    'members.excel.optionalColumns': 'Kolom Yang Diisi:',
    'members.excel.exampleFormat': 'Contoh Format:',
    'members.excel.note': 'Catatan:',
    'members.excel.noteText': 'Nama kolom tidak peka huruf besar/kecil. Anda bisa menggunakan "Name", "name", atau "NAME".',
    'members.excel.cancel': 'Batal',
    'members.excel.chooseFile': 'Pilih File Excel',
    'members.excel.importing': 'Mengimpor...',
    'members.excel.importExcel': 'Import Excel',
    'members.excel.nameRequired': 'Nama lengkap anggota (Wajib)',
    // My Certificates
    'myCertificates.title': 'Sertifikat Saya',
    'myCertificates.subtitle': 'Lihat dan kelola sertifikat Anda',
    'myCertificates.search': 'Cari sertifikat...',
    'myCertificates.noCertificates': 'Tidak ada sertifikat ditemukan',
    'myCertificates.download': 'Unduh',
    'myCertificates.verify': 'Verifikasi',
    
    // Certificate Generator
    'generator.title': 'Generator Sertifikat',
    'generator.subtitle': 'Buat dan sesuaikan sertifikat',
    'generator.template': 'Template',
    'generator.recipient': 'Informasi Penerima',
    'generator.preview': 'Pratinjau Sertifikat',
    'generator.generate': 'Generate Sertifikat',
    'generator.download': 'Unduh PDF',
    'generator.email': 'Kirim via Email',
    'generator.recipientName': 'Nama Penerima',
    'generator.recipientEmail': 'Email Penerima',
    'generator.courseName': 'Nama Kursus',
    'generator.completionDate': 'Tanggal Penyelesaian',
    'generator.certificateId': 'ID Sertifikat',
    'generator.organization': 'Organisasi',
    'generator.instructor': 'Instruktur',
    'generator.duration': 'Durasi',
    'generator.grade': 'Nilai',
    'generator.notes': 'Catatan',
    
    // Navigation
    'nav.menu': 'Menu',
    
    // Error Messages - Search
    'error.search.notFound': 'Sertifikat tidak ditemukan. Silakan periksa nomor sertifikat atau link dan coba lagi.',
    'error.search.empty': 'Silakan masukkan nomor sertifikat, nama, atau link untuk mencari',
    'error.search.failed': 'Pencarian gagal. Silakan coba lagi.',
    
    // Error Messages - Login
    'error.login.invalidEmail': 'Silakan masukkan alamat email yang valid.',
    'error.login.invalidPassword': 'Kata sandi Anda harus minimal 6 karakter.',
    'error.login.invalidCredentials': 'Email atau kata sandi salah.',
    
    // Search & Filter
    'search.filters': 'Filter',
    'search.category': 'Kategori',
    'search.allCategories': 'Semua Kategori',
    'search.dateRange': 'Rentang Tanggal',
    'search.startDate': 'Tanggal Mulai',
    'search.endDate': 'Tanggal Akhir',
    'search.clearFilters': 'Hapus Filter',
    'search.applyFilters': 'Terapkan Filter',
    'search.noResults': 'Tidak ada hasil yang cocok untuk',
    'search.noResultsGeneral': 'Tidak ada sertifikat ditemukan',
    'search.filteredBy': 'Difilter berdasarkan',
    'search.showingResults': 'Menampilkan hasil',
    'search.searchByName': 'Cari berdasarkan nama, ID, atau link...',
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('ecert-language');
        if (saved === 'en' || saved === 'id') return saved;
      } catch {}
    }
    return 'en';
  });

  // removed unused hydrated state

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ecert-language', language);
      }
    } catch {}
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
