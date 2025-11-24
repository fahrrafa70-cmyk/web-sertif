# 🔄 Quick Migration Guide

## TL;DR

Migrate old certificates from UUID to XID for shorter URLs:

```bash
# 1. Check status
npm run migrate:xid:verify

# 2. Run migration
npm run migrate:xid

# 3. Verify success
npm run migrate:xid:verify
```

## What Changes?

### Before Migration
```
URL: https://your-domain.com/c/550e8400-e29b-41d4-a716-446655440000
     ↑ 36 characters (UUID)
```

### After Migration
```
URL: https://your-domain.com/c/m8n5p7q3r1s4t6u8
     ↑ 16-20 characters (XID)

Old URL still works! ✅
```

## Safety

✅ **Non-breaking** - Old URLs still work  
✅ **No data loss** - UUID preserved  
✅ **Backward compatible** - Existing links valid  
✅ **Idempotent** - Safe to run multiple times  

## Full Documentation

See [MIGRATION_UUID_TO_XID.md](../MIGRATION_UUID_TO_XID.md) for complete guide.

## Commands

| Command | Description |
|---------|-------------|
| `npm run migrate:xid` | Run migration |
| `npm run migrate:xid:verify` | Check status |

## Need Help?

1. Check `.env.local` has required variables
2. Verify database permissions
3. Read full documentation
