# Template Management Setup Guide

This guide will help you set up the Template Management feature with full CRUD functionality using Supabase.

## 🚀 Quick Setup

### 1. Database Setup

Run the following SQL scripts in your Supabase SQL Editor in this order:

1. **Update Templates Table** (if not already done):
   ```sql
   -- Run: database/update_templates.sql
   ```

2. **Setup Storage Bucket**:
   ```sql
   -- Run: database/setup_storage.sql
   ```

### 2. Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
```

### 3. Storage Bucket Configuration

In your Supabase Dashboard:

1. Go to **Storage** → **Buckets**
2. Create a new bucket named `template`
3. Set it to **Public**
4. Configure file size limit (recommended: 5MB)
5. Set allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`

## 📋 Features Implemented

### ✅ Create Template
- Upload image files to Supabase Storage
- Store template metadata in database
- Real-time UI updates without page reload
- Form validation and error handling

### ✅ Read Templates
- Fetch all templates from Supabase
- Display with images and metadata
- Search and filter functionality
- Loading and error states

### ✅ Update Template
- Edit existing template details
- Replace template images
- Automatic cleanup of old images
- Real-time UI updates

### ✅ Delete Template
- Remove template from database
- Delete associated image from storage
- Confirmation dialog
- Real-time UI updates

### ✅ Preview Template
- Full-screen template preview
- Smooth animations and transitions
- Display actual uploaded images
- "Use This Template" functionality

## 🎨 UI Features

- **Responsive Design**: Works on all screen sizes
- **Smooth Animations**: Framer Motion powered transitions
- **Loading States**: Professional loading indicators
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback
- **Image Previews**: Real-time image preview in forms
- **Role-based Access**: Admin/Team/Public permissions

## 🔧 Technical Implementation

### File Structure
```
src/
├── lib/supabase/
│   └── templates.ts          # Template CRUD functions
├── hooks/
│   └── use-templates.ts      # React hook for template state
├── app/templates/
│   ├── page.tsx              # Main templates page
│   └── generate/
│       └── page.tsx          # Certificate generator
└── components/
    └── page-transition.tsx   # Animation variants
```

### Key Components

1. **Template CRUD Functions** (`src/lib/supabase/templates.ts`)
   - Upload/delete images from Supabase Storage
   - Database operations for templates
   - Error handling and validation

2. **useTemplates Hook** (`src/hooks/use-templates.ts`)
   - React state management
   - Loading and error states
   - CRUD operations with UI updates

3. **Templates Page** (`src/app/templates/page.tsx`)
   - Complete UI implementation
   - Image upload with preview
   - Real-time updates
   - Role-based permissions

## 🚨 Important Notes

### Database Schema Changes
The templates table has been updated to include:
- `image_url` (text): URL of uploaded image
- `category` (text): Template category (instead of foreign key)

### Storage Configuration
- Bucket name: `template`
- Public access enabled
- File size limit: 5MB
- Allowed types: Images only

### Role Permissions
- **Admin**: Full CRUD access
- **Team**: Create, Read, Update (no delete)
- **Public**: Read only

## 🧪 Testing

To test the functionality:

1. **Create Template**:
   - Click "Create Template" button
   - Fill in name, category, orientation
   - Upload an image file
   - Submit and verify it appears in the list

2. **Edit Template**:
   - Click "Edit" on any template
   - Modify details and/or upload new image
   - Save and verify changes

3. **Delete Template**:
   - Click "Delete" on any template (Admin only)
   - Confirm deletion
   - Verify template is removed

4. **Preview Template**:
   - Click "Preview" on any template
   - Verify image displays correctly
   - Test "Use This Template" button

## 🔍 Troubleshooting

### Common Issues

1. **Images not displaying**:
   - Check if storage bucket is public
   - Verify image URLs in database
   - Check browser console for CORS errors

2. **Upload failures**:
   - Verify file size is under 5MB
   - Check file type is supported
   - Ensure user has proper permissions

3. **Database errors**:
   - Verify RLS policies are correct
   - Check user authentication
   - Ensure all required fields are provided

### Debug Mode

Enable debug logging by adding to your environment:
```env
NEXT_PUBLIC_DEBUG=true
```

## 🎉 Success!

Your Template Management system is now fully functional with:
- ✅ Complete CRUD operations
- ✅ Image upload and storage
- ✅ Real-time UI updates
- ✅ Professional animations
- ✅ Role-based access control
- ✅ Error handling and validation

The system is ready for production use!

