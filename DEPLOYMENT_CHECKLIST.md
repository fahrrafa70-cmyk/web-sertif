# 🚀 Public Certificate Link - Deployment Checklist

## ⚡ Quick Deploy (5 Minutes)

### ✅ Step 1: Database Migration (2 min)

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Copy content from `migrations/001_add_public_certificate_link.sql`
4. Paste and click **Run**
5. Wait for success message

### ✅ Step 2: Verify Migration (1 min)

Run this query in SQL Editor:

```sql
-- Should return 3 rows (public_id, is_public, created_at)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'certificates' 
AND column_name IN ('public_id', 'is_public', 'created_at');
```

### ✅ Step 3: Deploy Application (2 min)

```bash
npm run build
npm run start
```

Or deploy to your hosting platform.

### ✅ Step 4: Test (1 min)

1. Create a test certificate
2. Click "Generate Certificate Link"
3. Open link in incognito window
4. Should see certificate without login ✅

---

## 📋 Detailed Checklist

### Pre-Deployment

- [ ] Backup database
- [ ] Review migration script
- [ ] Ensure no breaking changes
- [ ] Test in development environment

### Database Migration

- [ ] Run migration SQL script
- [ ] Verify new columns exist
- [ ] Check RLS policies are active
- [ ] Confirm existing certificates have public_id

### Application Deployment

- [ ] Update code to latest version
- [ ] Run `npm install` (if dependencies changed)
- [ ] Build application (`npm run build`)
- [ ] Deploy to production
- [ ] Verify deployment success

### Post-Deployment Testing

- [ ] Create new certificate
- [ ] Verify public_id is auto-generated
- [ ] Test "Generate Certificate Link" button
- [ ] Open public link in incognito mode
- [ ] Test Download PDF button
- [ ] Test Copy Link button
- [ ] Test Share button
- [ ] Verify 404 page for invalid public_id

### Security Verification

- [ ] Confirm anonymous users can READ public certificates
- [ ] Confirm anonymous users CANNOT write certificates
- [ ] Test `is_public = false` certificates are hidden
- [ ] Verify authenticated users can still access all features

---

## 🔍 Verification Queries

### Check Migration Success

```sql
-- 1. Check columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'certificates' 
AND column_name IN ('public_id', 'is_public', 'created_at');

-- 2. Check all certificates have public_id
SELECT 
  COUNT(*) as total_certificates,
  COUNT(public_id) as with_public_id,
  COUNT(*) - COUNT(public_id) as missing_public_id
FROM certificates;

-- 3. Check RLS policies
SELECT 
  policyname, 
  cmd, 
  roles, 
  qual 
FROM pg_policies 
WHERE tablename = 'certificates';

-- 4. Test public access (should work)
SELECT certificate_no, name, public_id, is_public 
FROM certificates 
WHERE is_public = true 
LIMIT 5;
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Migration fails with "column already exists"

**Solution:** Migration is idempotent, safe to re-run. Or manually check:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'certificates' AND column_name = 'public_id';
```

### Issue 2: Existing certificates don't have public_id

**Solution:** Run this update:
```sql
UPDATE certificates 
SET public_id = gen_random_uuid()::text 
WHERE public_id IS NULL;
```

### Issue 3: Public link returns "Certificate not found"

**Solution:** Check if certificate is public:
```sql
SELECT certificate_no, public_id, is_public 
FROM certificates 
WHERE public_id = 'your-public-id-here';

-- Make it public if needed
UPDATE certificates 
SET is_public = true 
WHERE public_id = 'your-public-id-here';
```

### Issue 4: "Permission denied" error

**Solution:** RLS policy not active. Re-run migration script.

---

## 📊 Success Metrics

After deployment, verify:

- ✅ All new certificates have `public_id`
- ✅ Public links are accessible without login
- ✅ Download PDF works on public page
- ✅ Copy link works correctly
- ✅ Share button functions properly
- ✅ 404 page shows for invalid links
- ✅ Private certificates (`is_public = false`) are hidden

---

## 🔄 Rollback Plan (If Needed)

**CAUTION:** Only use if critical issues occur!

```sql
-- Disable public access
DROP POLICY IF EXISTS "Public users can read public certificates" ON certificates;

-- Remove new columns (CAREFUL!)
-- ALTER TABLE certificates DROP COLUMN IF EXISTS public_id;
-- ALTER TABLE certificates DROP COLUMN IF EXISTS is_public;

-- Note: created_at might be used elsewhere, don't drop it!
```

---

## 📞 Support

If issues persist:

1. Check logs in Supabase Dashboard
2. Review browser console for errors
3. Verify RLS policies are active
4. Check database connection
5. Review migration script execution

---

## ✅ Final Checklist

Before marking as complete:

- [ ] Database migration successful
- [ ] Application deployed
- [ ] Public links working
- [ ] All buttons functional
- [ ] Security verified
- [ ] Team notified
- [ ] Documentation updated
- [ ] Monitoring in place

---

**Status:** Ready for Production ✅  
**Last Updated:** 21 Oktober 2025  
**Version:** 1.0
