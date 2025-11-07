# 🚀 Dual Excel Import Implementation Guide

## ✅ Completed Components

### 1. **Utility Functions** (`src/lib/utils/excel-column-mapping.ts`)
- ✅ `normalizeColumnName()` - Normalize column names for flexible matching
- ✅ `buildColumnMapping()` - Build mapping from Excel row
- ✅ `findSimilarColumn()` - Find similar columns for typo detection
- ✅ `detectExtraColumns()` - Detect unknown columns
- ✅ `matchExcelRows()` - Match certificate and score rows by identifier
- ✅ `extractScoreDataWithMapping()` - Extract score data using column mapping
- ✅ `getUserInputScoreLayers()` - Get layers that need user input

### 2. **Column Mapping UI Component** (`src/components/certificate/ColumnMappingUI.tsx`)
- ✅ Visual column mapping interface
- ✅ Dropdown for each score layer to select Excel column
- ✅ Sample value preview
- ✅ Mapping status indicator
- ✅ Validation feedback

### 3. **QuickGenerateModal Backend Logic** (`src/components/certificate/QuickGenerateModal.tsx`)
- ✅ Added `dual-excel` to data source types
- ✅ State management for:
  - `certificateExcelData`
  - `scoreExcelData`
  - `columnMapping`
  - `dualExcelStep` (1: Cert Excel, 2: Score Excel, 3: Mapping)
- ✅ File input refs: `certExcelInputRef`, `scoreExcelInputRef`
- ✅ Upload handlers:
  - `handleCertificateExcelUpload()`
  - `handleScoreExcelUpload()`
- ✅ Generation logic for dual-excel in `handleGenerate()`
- ✅ Reset logic for dual Excel states

---

## 🔨 TODO: Complete Implementation

### Step 1: Add UI for Dual Excel Tab (QuickGenerateModal.tsx)

You need to add a new tab in the data source tabs section. Find the `<Tabs>` component around line 430 and add:

```tsx
<TabsList className="grid w-full grid-cols-3"> {/* Changed from grid-cols-2 */}
  <TabsTrigger value="member" className="flex items-center gap-2">
    <Users className="w-4 h-4" />
    {t('quickGenerate.selectMember')}
  </TabsTrigger>
  <TabsTrigger value="excel" className="flex items-center gap-2">
    <FileSpreadsheet className="w-4 h-4" />
    {t('quickGenerate.uploadExcel')}
  </TabsTrigger>
  {/* NEW: Dual Excel Tab - Only show for dual templates */}
  {isDualTemplate && (
    <TabsTrigger value="dual-excel" className="flex items-center gap-2">
      <FileSpreadsheet className="w-4 h-4" />
      Dual Excel (Cert + Score)
    </TabsTrigger>
  )}
</TabsList>
```

Then add the TabsContent for dual-excel:

```tsx
{/* NEW: Dual Excel Tab Content */}
<TabsContent value="dual-excel" className="space-y-4">
  {dualExcelStep === 1 && (
    <div className="space-y-3">
      <Label className="font-semibold">Step 1: Upload Certificate Excel</Label>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Excel file containing certificate data (name, certificate_no, issue_date, description)
      </p>
      <input
        ref={certExcelInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleCertificateExcelUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => certExcelInputRef.current?.click()}
        className="w-full"
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Upload Certificate Excel
      </Button>
      {certificateExcelData.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          {certificateExcelData.length} rows loaded
        </div>
      )}
    </div>
  )}

  {dualExcelStep === 2 && (
    <div className="space-y-3">
      <Label className="font-semibold">Step 2: Upload Score Excel</Label>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Excel file containing score data for each participant
      </p>
      <input
        ref={scoreExcelInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleScoreExcelUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => scoreExcelInputRef.current?.click()}
        className="w-full"
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Upload Score Excel
      </Button>
      {scoreExcelData.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          {scoreExcelData.length} rows loaded
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setDualExcelStep(1);
          setCertificateExcelData([]);
        }}
        className="w-full"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Certificate Excel
      </Button>
    </div>
  )}

  {dualExcelStep === 3 && (
    <div className="space-y-4">
      <ColumnMappingUI
        scoreLayers={getUserInputScoreLayers(getScoreTextLayers())}
        availableColumns={Object.keys(scoreExcelData[0] || {})}
        columnMapping={columnMapping}
        sampleData={scoreExcelData[0]}
        onChange={(layerId, columnName) => {
          setColumnMapping(prev => ({ ...prev, [layerId]: columnName }));
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDualExcelStep(2);
            setScoreExcelData([]);
            setColumnMapping({});
          }}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  )}
</TabsContent>
```

Don't forget to import CheckCircle2:
```tsx
import { FileSpreadsheet, Users, Calendar, Zap, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
```

---

### Step 2: Update certificates/page.tsx to Handle Dual Excel

Find the `handleQuickGenerate` function and add handling for `dual-excel`:

```tsx
} else if (params.dataSource === 'dual-excel' && params.certificateExcelData && params.scoreExcelData && params.columnMapping) {
  // Dual Excel: Certificate + Score separate files
  const total = params.certificateExcelData.length;
  let generated = 0;
  let currentToast = loadingToast;
  
  // Match certificate and score rows
  const { matched, unmatched } = matchExcelRows(params.certificateExcelData, params.scoreExcelData);
  
  if (unmatched.length > 0) {
    console.warn(`${unmatched.length} certificates have no matching score data`);
  }
  
  for (const { cert, score } of matched) {
    try {
      // Extract certificate data
      const name = String(cert.name || '');
      const description = String(cert.description || '');
      let issueDate = String(cert.issue_date || cert.date || '');
      
      if (!issueDate) {
        issueDate = new Date().toISOString().split('T')[0];
      }
      
      const certNo = String(cert.certificate_no || cert.cert_no || '');
      const expiredDate = String(cert.expired_date || cert.expiry || '');
      
      // Create temporary member
      const tempMember: Member = {
        id: `temp-${Date.now()}-${generated}`,
        name,
        email: String(cert.email || ''),
        organization: String(cert.organization || ''),
        phone: String(cert.phone || ''),
        job: String(cert.job || ''),
        date_of_birth: null,
        address: String(cert.address || ''),
        city: String(cert.city || ''),
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Extract score data using column mapping
      const scoreData = extractScoreDataWithMapping(score, params.columnMapping);
      
      console.log('🎯 Dual Excel generation:', {
        member: name,
        certNo,
        scoreFields: Object.keys(scoreData).length
      });
      
      // Generate with score data
      await generateSingleCertificate(
        params.template,
        tempMember,
        { certificate_no: certNo, description, issue_date: issueDate, expired_date: expiredDate },
        defaults,
        params.dateFormat,
        scoreData,
        params.template.layout_config as TemplateLayoutConfig
      );
      
      generated++;
      toast.dismiss(currentToast);
      currentToast = toast.loading(`${t('quickGenerate.generatingCertificates')} ${generated}/${matched.length}`);
    } catch (error) {
      console.error('Failed to generate certificate for:', cert.name, error);
    }
  }
  
  toast.dismiss(currentToast);
  toast.success(`${t('quickGenerate.successMultiple')} ${generated}/${matched.length} ${t('quickGenerate.certificatesGenerated')}`);
  
  if (unmatched.length > 0) {
    toast.warning(`${unmatched.length} certificates skipped (no matching score data)`);
  }
}
```

Don't forget to import the utilities at the top of the file:
```tsx
import { matchExcelRows, extractScoreDataWithMapping } from "@/lib/utils/excel-column-mapping";
```

---

## 📝 Testing Checklist

After completing the implementation, test:

1. **Select Dual Template**
   - [ ] Dual Excel tab appears
   - [ ] Regular Excel tab still works

2. **Upload Certificate Excel**
   - [ ] File upload works
   - [ ] Row count displayed
   - [ ] Moves to step 2 automatically

3. **Upload Score Excel**
   - [ ] File upload works
   - [ ] Row matching works
   - [ ] Warning if unmatched rows
   - [ ] Moves to mapping step

4. **Column Mapping**
   - [ ] All score layers listed
   - [ ] Dropdowns show Excel columns
   - [ ] Sample values preview
   - [ ] Can map/unmap columns

5. **Generation**
   - [ ] Validates both files uploaded
   - [ ] Generates certificates with score
   - [ ] Progress toast updates
   - [ ] Success message shows count

6. **Error Handling**
   - [ ] Invalid Excel format
   - [ ] Missing required columns
   - [ ] Unmatched rows warning
   - [ ] Empty files

---

## 🎯 Summary

**Completed:**
- ✅ All utility functions
- ✅ Column mapping UI component
- ✅ Backend state management
- ✅ File upload handlers
- ✅ Generation logic

**Remaining:**
- ⏳ Add dual-excel tab UI to QuickGenerateModal
- ⏳ Update certificates page to handle dual-excel
- ⏳ Import missing utilities
- ⏳ Test end-to-end

**Estimated Time to Complete:** ~30-45 minutes

The hardest parts (utility functions, column mapping, state management) are done. The remaining work is mostly UI integration which is straightforward copy-paste with minor adjustments.
