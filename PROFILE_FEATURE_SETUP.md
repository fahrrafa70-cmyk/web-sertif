# 👤 Profile Edit Feature - Setup & Testing Guide

Fitur edit profile telah selesai diimplementasi dengan lengkap. User sekarang dapat mengedit **nama**, **username**, **gender**, dan **foto profile** mereka.

## 🗂️ Files yang Ditambahkan/Dimodifikasi

### **Database & Backend**
- `migrations/007_add_username_gender_to_users.sql` - Migration untuk field baru
- `src/lib/supabase/users.ts` - Updated types & functions
- `src/app/api/profile/route.ts` - GET & PATCH endpoint
- `src/app/api/profile/username-check/route.ts` - Username availability check
- `src/hooks/use-profile.ts` - Custom hook untuk profile management

### **Frontend**
- `src/app/profile/page.tsx` - Main profile edit page  
- `src/components/user-avatar.tsx` - Added "Edit Profile" link

### **Infrastructure**
- `scripts/setup-profile-storage.js` - Setup Supabase storage bucket

---
## ⚙️ Setup Instructions

### **1. Database Migration**
Jalankan migration untuk menambah fields `username` dan `gender`:

```bash
# Connect to your Supabase database and run:
psql "postgresql://your-connection-string"

# Then execute the migration:
\i migrations/007_add_username_gender_to_users.sql
```

### **2. Setup Profile Storage**
Buat storage bucket untuk profile:

```bash
node scripts/setup-profile-storage.js
```

Storage bucket akan dikonfigurasi dengan:
- 📁 **Bucket name**: `profile`
- 🔓 **Public access**: Enabled
- 📦 **File size limit**: 5MB
- 🖼️ **Allowed types**: JPEG, PNG, WebP, GIF
- 🔐 **Policies**: User dapat upload/delete profile mereka sendiri

### **3. Environment Variables**
Pastikan environment variables sudah ada:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🧪 Testing Guide

### **1. User Authentication**
1. Login ke aplikasi
2. Klik avatar di header → "Edit Profile"

### **2. Profile Information**
- ✅ **Email**: Read-only, tidak bisa diubah
- ✅ **Full Name**: Required, minimal 2 karakter
- ✅ **Username**: Required, minimal 3 karakter, alphanumeric + underscore
- ✅ **Gender**: Optional dropdown (Male, Female, Other, Prefer not to say)
- ✅ **Avatar**: Upload gambar (maks 5MB)

### **3. Validation Testing**

#### **Username Validation:**
- ❌ Kurang dari 3 karakter → Error
- ❌ Karakter special (selain underscore) → Error  
- ❌ Username sudah dipakai → Error "Username is already taken"
- ✅ Valid format → Green checkmark + real-time availability check

#### **Avatar Upload:**
- ❌ File non-image → Error "Please upload an image file"
- ❌ File > 5MB → Error "Image must be smaller than 5MB"
- ✅ Valid image → Upload success + preview update

### **4. API Testing**

#### **GET /api/profile**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/profile
```

#### **PATCH /api/profile**
```bash
curl -X PATCH \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"full_name": "John Doe", "username": "johndoe123"}' \
     http://localhost:3000/api/profile
```

#### **Username Check**
```bash
curl "http://localhost:3000/api/profile/username-check?username=testuser"
```

---

## 🎨 UI/UX Features

### **Form Design**
- 🔄 **Real-time validation** dengan visual feedback
- ✅ **Success/Error indicators** (check/X icons)
- ⏳ **Loading states** untuk all async operations
- 📱 **Responsive design** untuk mobile & desktop

### **Avatar Upload**
- 📷 **Click to upload** dengan file picker
- 🔄 **Upload progress** indicator
- 👀 **Live preview** setelah upload
- 📦 **Automatic file naming** dengan user ID

### **Username Availability**
- ⚡ **Real-time checking** saat user mengetik
- 🔄 **Debounced requests** untuk performance
- ✅ **Clear feedback** available/unavailable
- 🚫 **Exclude current username** dari availability check

---

## 🔐 Security Features

### **Authentication**
- 🔒 **JWT token verification** untuk semua API calls
- 🚪 **Auto-redirect** jika user tidak login
- 🛡️ **Service role key** untuk database operations

### **Data Validation**
- ✅ **Server-side validation** untuk semua inputs
- 🚫 **SQL injection protection** dengan parameterized queries
- 📁 **File type validation** untuk uploads
- 📦 **File size limits** (5MB)

### **Storage Security**
- 🔐 **RLS policies** di Supabase Storage
- 👤 **User isolation** - hanya bisa edit avatar sendiri
- 🌐 **Public read** untuk avatar display
- 🗑️ **Delete permission** hanya untuk owner

---

## 🐛 Troubleshooting

### **Common Issues**

#### **"Username is already taken" tapi seharusnya available:**
- Check `checkUsernameAvailability()` function
- Pastikan current user ID di-exclude dari query

#### **Avatar upload gagal:**
- Verify storage bucket `profile` sudah dibuat
- Check storage policies sudah di-apply
- Pastikan file size < 5MB dan type valid

#### **Profile tidak load:**
- Check authentication token valid
- Verify user ada di database `users` table
- Check API endpoint returns proper response

#### **Database error:**
- Jalankan migration: `007_add_username_gender_to_users.sql`
- Verify kolom `username` dan `gender` sudah ada di table `users`

### **Debug Commands**
```bash
# Check storage buckets
supabase storage ls

# Check user table structure  
psql -c "\d users"

# Test API endpoints
curl -X GET http://localhost:3000/api/profile
```

---

## 🚀 Production Deployment Checklist

- [ ] **Migration applied** ke production database
- [ ] **Storage bucket created** di production Supabase
- [ ] **Storage policies configured** properly
- [ ] **Environment variables** set di production
- [ ] **CORS settings** configured untuk domain
- [ ] **File upload limits** configured di hosting
- [ ] **Error monitoring** enabled untuk API endpoints

---

## 📈 Future Enhancements

### **Possible Improvements:**
- 🔄 **Profile picture cropping** tool
- 📧 **Email change** workflow dengan verification
- 🔐 **Password change** functionality  
- 📱 **Phone number** field tambahan
- 🌍 **Location/timezone** settings
- 🎨 **Theme preferences** per user
- 📊 **Profile completion** progress bar

### **Advanced Features:**
- 🔗 **Social media links** integration
- 📝 **Bio/description** field
- 🏢 **Organization management** 
- 🎯 **User preferences** & settings
- 📸 **Multiple profile pictures**
- 🔄 **Profile change history/audit log**

---

**✅ Profile Edit Feature is Ready!**

Fitur sudah fully implemented dan tested. User dapat mengakses melalui:
`Header Avatar → Edit Profile → /profile`
