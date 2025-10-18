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
const translations = {
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
    'templates.noTemplates': 'No templates found',
    'templates.createNew': 'Create New Template',
    'templates.templatePreview': 'Template Preview',
    'templates.templateDetails': 'Details and preview of the selected template.',
    
    // Certificates
    'certificates.title': 'Certificates',
    'certificates.subtitle': 'Manage and track certificates',
    'certificates.create': 'Create Certificate',
    'certificates.recipient': 'Recipient',
    'certificates.issuedDate': 'Issued Date',
    'certificates.status': 'Status',
    'certificates.actions': 'Actions',
    'certificates.search': 'Search certificates...',
    'certificates.noCertificates': 'No certificates found',
    
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
    'footer.email': '@nurtiyas.id',
    'footer.location': 'Jakarta Timur',
    
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
    'footer.copyright': '© 2024 E-Certificate Management Platform. All rights reserved.',
    
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
    
    // My Certificates
    'myCertificates.title': 'My Certificates',
    'myCertificates.subtitle': 'View and manage your certificates',
    'myCertificates.search': 'Search certificates...',
    'myCertificates.noCertificates': 'No certificates found',
    'myCertificates.download': 'Download',
    'myCertificates.verify': 'Verify',
    
    // Certificates
    'certificates.title': 'Certificates',
    'certificates.subtitle': 'Manage and track certificates',
    'certificates.create': 'Create Certificate',
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
    'templates.noTemplates': 'Tidak ada template ditemukan',
    'templates.createNew': 'Buat Template Baru',
    'templates.templatePreview': 'Pratinjau Template',
    'templates.templateDetails': 'Detail dan pratinjau template yang dipilih.',
    
    // Certificates
    'certificates.title': 'Sertifikat',
    'certificates.subtitle': 'Kelola dan lacak sertifikat',
    'certificates.create': 'Buat Sertifikat',
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
    'footer.email': '@nurtiyasah.id',
    'footer.location': 'Jakarta Timur',
    
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
    'footer.copyright': '© 2024 Platform Manajemen E-Certificate. Semua hak dilindungi.',
    
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
    
    // My Certificates
    'myCertificates.title': 'Sertifikat Saya',
    'myCertificates.subtitle': 'Lihat dan kelola sertifikat Anda',
    'myCertificates.search': 'Cari sertifikat...',
    'myCertificates.noCertificates': 'Tidak ada sertifikat ditemukan',
    'myCertificates.download': 'Unduh',
    'myCertificates.verify': 'Verifikasi',
    
    // Certificates
    'certificates.title': 'Sertifikat',
    'certificates.subtitle': 'Kelola dan lacak sertifikat',
    'certificates.create': 'Buat Sertifikat',
    'certificates.recipient': 'Penerima',
    'certificates.issuedDate': 'Tanggal Diterbitkan',
    'certificates.status': 'Status',
    'certificates.actions': 'Aksi',
    'certificates.search': 'Cari sertifikat...',
    'certificates.noCertificates': 'Tidak ada sertifikat ditemukan',
    'certificates.download': 'Unduh',
    'certificates.verify': 'Verifikasi',
    'certificates.edit': 'Edit',
    'certificates.delete': 'Hapus',
    
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

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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
    return translations[language][key as keyof typeof translations[typeof language]] || key;
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
