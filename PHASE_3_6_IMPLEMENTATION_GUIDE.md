# Phase 3-6 Implementation Guide
## Hybrid Approach for Configure Layout

---

## 📊 Current Status (After Phase 2)

### ✅ Completed:
- **Phase 1**: Data model with percentage-based positioning
- **Phase 2**: Rendering engine with auto-migration

### 🎯 Foundation Ready:
1. **Interface**: `TextLayerConfig` with optional `fontSizePercent`
2. **Utilities**: 8 conversion functions in `percentage-positioning.ts`
3. **Migration**: Auto-migration via `ensureFontSizePercent()`
4. **Rendering**: Layers auto-calculate percentages on load

---

## 🔧 Phase 3: Event Handlers (Current Implementation Analysis)

### Current State:
The configure page **already has** drag-and-drop event handlers. They work with pixel-based positioning and automatically save to database with both pixel and percentage values.

### What's Already Working:
```typescript
// Current drag handler (simplified)
const handleLayerDrag = (layerId: string, newX: number, newY: number) => {
  // Updates both x/y (pixels) and xPercent/yPercent
  updateLayer({
    x: newX,
    y: newY,
    xPercent: (newX / templateWidth) * 100,
    yPercent: (newY / templateHeight) * 100
  });
};
```

### ✅ No Changes Needed Because:
1. **Auto-Migration**: `ensureFontSizePercent()` already handles font size
2. **Dual Storage**: Current code saves both pixels and percentages
3. **Backward Compatible**: Existing drag handlers work with new system

### 🎯 Optional Enhancement (If Needed):
If you want to add PointerEvent API for better touch support:

```typescript
// Replace onMouseDown with onPointerDown
<div
  onPointerDown={handlePointerDown}  // Instead of onMouseDown
  onPointerMove={handlePointerMove}  // Instead of onMouseMove
  onPointerUp={handlePointerUp}      // Instead of onMouseUp
  style={{ touchAction: 'none' }}    // Prevent default touch behaviors
>
```

**Benefits:**
- ✅ Unified mouse + touch handling
- ✅ Better mobile experience
- ✅ No separate touch event handlers needed

---

## 📱 Phase 4: Mobile UI (Slider-Based Editing)

### Goal:
Add slider-based editing modal for comfortable mobile configuration.

### Implementation:

#### 1. Create Mobile Edit Modal Component:

```typescript
// src/components/configure/MobileEditModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { TextLayerConfig } from "@/types/template-layout";

interface MobileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layer: TextLayerConfig | null;
  templateDimensions: { width: number; height: number };
  onUpdate: (updates: Partial<TextLayerConfig>) => void;
}

export function MobileEditModal({
  open,
  onOpenChange,
  layer,
  templateDimensions,
  onUpdate
}: MobileEditModalProps) {
  if (!layer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Layer: {layer.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Text Content */}
          <div>
            <Label>Text</Label>
            <Input
              value={layer.text || ''}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
          </div>

          {/* X Position Slider */}
          <div>
            <Label>X Position: {layer.xPercent.toFixed(1)}%</Label>
            <Slider
              value={[layer.xPercent]}
              onValueChange={([val]) => {
                const x = (val / 100) * templateDimensions.width;
                onUpdate({ xPercent: val, x });
              }}
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          {/* Y Position Slider */}
          <div>
            <Label>Y Position: {layer.yPercent.toFixed(1)}%</Label>
            <Slider
              value={[layer.yPercent]}
              onValueChange={([val]) => {
                const y = (val / 100) * templateDimensions.height;
                onUpdate({ yPercent: val, y });
              }}
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          {/* Font Size Slider */}
          <div>
            <Label>Font Size: {layer.fontSizePercent?.toFixed(1) || 0}%</Label>
            <Slider
              value={[layer.fontSizePercent || 0]}
              onValueChange={([val]) => {
                const fontSize = (val / 100) * templateDimensions.height;
                onUpdate({ fontSizePercent: val, fontSize });
              }}
              min={0.5}
              max={10}
              step={0.1}
            />
          </div>

          {/* Color Picker */}
          <div>
            <Label>Color</Label>
            <Input
              type="color"
              value={layer.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 2. Integrate in Configure Page:

```typescript
// In configure/page.tsx
import { MobileEditModal } from "@/components/configure/MobileEditModal";

// Add state
const [mobileEditOpen, setMobileEditOpen] = useState(false);
const [editingLayer, setEditingLayer] = useState<TextLayer | null>(null);

// Add handler
const handleMobileEdit = (layer: TextLayer) => {
  setEditingLayer(layer);
  setMobileEditOpen(true);
};

// Add modal to render
<MobileEditModal
  open={mobileEditOpen}
  onOpenChange={setMobileEditOpen}
  layer={editingLayer}
  templateDimensions={templateImageDimensions || { width: 1920, height: 1080 }}
  onUpdate={(updates) => {
    if (editingLayer) {
      updateTextLayer(editingLayer.id, updates);
    }
  }}
/>
```

#### 3. Add Mobile Edit Button:

```typescript
// Show edit button on mobile for each layer
{!isDesktop && (
  <Button
    size="sm"
    onClick={() => handleMobileEdit(layer)}
    className="absolute top-2 right-2"
  >
    Edit
  </Button>
)}
```

---

## 🖥️ Phase 5: Desktop UI (Properties Panel)

### Goal:
Add properties panel with precise input fields for desktop users.

### Implementation:

#### 1. Create Properties Panel Component:

```typescript
// src/components/configure/PropertiesPanel.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TextLayerConfig } from "@/types/template-layout";

interface PropertiesPanelProps {
  layer: TextLayerConfig | null;
  templateDimensions: { width: number; height: number };
  onUpdate: (updates: Partial<TextLayerConfig>) => void;
}

export function PropertiesPanel({
  layer,
  templateDimensions,
  onUpdate
}: PropertiesPanelProps) {
  if (!layer) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a layer to edit properties
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold">Layer Properties</h3>

      {/* Layer ID */}
      <div>
        <Label className="text-xs text-gray-500">Layer ID</Label>
        <div className="text-sm font-mono">{layer.id}</div>
      </div>

      {/* X Position (Percentage) */}
      <div>
        <Label>X Position (%)</Label>
        <Input
          type="number"
          value={layer.xPercent.toFixed(2)}
          onChange={(e) => {
            const xPercent = parseFloat(e.target.value);
            const x = (xPercent / 100) * templateDimensions.width;
            onUpdate({ xPercent, x });
          }}
          min={0}
          max={100}
          step={0.1}
        />
      </div>

      {/* Y Position (Percentage) */}
      <div>
        <Label>Y Position (%)</Label>
        <Input
          type="number"
          value={layer.yPercent.toFixed(2)}
          onChange={(e) => {
            const yPercent = parseFloat(e.target.value);
            const y = (yPercent / 100) * templateDimensions.height;
            onUpdate({ yPercent, y });
          }}
          min={0}
          max={100}
          step={0.1}
        />
      </div>

      {/* Font Size (Percentage) */}
      <div>
        <Label>Font Size (%)</Label>
        <Input
          type="number"
          value={(layer.fontSizePercent || 0).toFixed(2)}
          onChange={(e) => {
            const fontSizePercent = parseFloat(e.target.value);
            const fontSize = (fontSizePercent / 100) * templateDimensions.height;
            onUpdate({ fontSizePercent, fontSize });
          }}
          min={0.5}
          max={10}
          step={0.1}
        />
      </div>

      {/* Font Family */}
      <div>
        <Label>Font Family</Label>
        <Select
          value={layer.fontFamily}
          onValueChange={(value) => onUpdate({ fontFamily: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color */}
      <div>
        <Label>Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={layer.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-16 h-10"
          />
          <Input
            type="text"
            value={layer.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1"
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="pt-4 border-t">
        <Label className="text-xs text-gray-500">Keyboard Shortcuts</Label>
        <div className="text-xs text-gray-600 space-y-1 mt-2">
          <div>Arrow keys: Move 1%</div>
          <div>Shift + Arrow: Move 0.1%</div>
          <div>Ctrl + Arrow: Move 10%</div>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Integrate Desktop Layout:

```typescript
// In configure/page.tsx - Desktop layout
{isDesktop && (
  <div className="grid grid-cols-[1fr_300px] gap-4">
    {/* Canvas Area */}
    <div>
      {/* Existing canvas rendering */}
    </div>

    {/* Properties Panel */}
    <div className="border-l pl-4">
      <PropertiesPanel
        layer={selectedLayer}
        templateDimensions={templateImageDimensions || { width: 1920, height: 1080 }}
        onUpdate={(updates) => {
          if (selectedLayer) {
            updateTextLayer(selectedLayer.id, updates);
          }
        }}
      />
    </div>
  </div>
)}
```

---

## 🧪 Phase 6: Testing & Validation

### Testing Checklist:

#### 1. Unit Tests (Conversion Functions):
```typescript
// test/percentage-positioning.test.ts
import { runAllTests } from '@/lib/utils/test-percentage-conversion';

describe('Percentage Positioning', () => {
  it('should pass all conversion tests', () => {
    const result = runAllTests();
    expect(result).toBe(true);
  });
});
```

#### 2. Integration Tests:
```typescript
// Test mobile → desktop consistency
test('Mobile edit should match desktop view', () => {
  // 1. Edit layer on mobile (375px)
  const mobileEdit = {
    xPercent: 50,
    yPercent: 50,
    fontSizePercent: 2.5
  };

  // 2. Calculate desktop position (1920px)
  const desktopPos = percentToPixel(mobileEdit, { width: 1920, height: 1080 });

  // 3. Verify consistency
  expect(desktopPos.x).toBe(960);
  expect(desktopPos.y).toBe(540);
  expect(desktopPos.fontSize).toBe(27);
});
```

#### 3. Visual Regression Tests:
- Screenshot comparison mobile vs desktop
- Certificate generation accuracy
- Font rendering consistency

#### 4. Manual Testing:
- [ ] Create layer on mobile → verify on desktop
- [ ] Edit layer on desktop → verify on mobile
- [ ] Generate certificate → verify positions match preview
- [ ] Test on actual devices (iPhone, Android, iPad)
- [ ] Test different template sizes
- [ ] Test edge cases (0%, 100%, very small fonts)

---

## 📊 Implementation Priority

### High Priority (Must Have):
1. ✅ Phase 1: Data Model (DONE)
2. ✅ Phase 2: Rendering Engine (DONE)
3. ⏳ Phase 4: Mobile UI (Slider modal)
4. ⏳ Phase 6: Basic Testing

### Medium Priority (Should Have):
5. ⏳ Phase 5: Desktop Properties Panel
6. ⏳ Phase 3: PointerEvent Enhancement
7. ⏳ Phase 6: Comprehensive Testing

### Low Priority (Nice to Have):
8. Keyboard shortcuts
9. Undo/Redo functionality
10. Layer grouping
11. Advanced animations

---

## 🎯 Quick Start Guide

### To Continue Implementation:

1. **For Mobile UI (Phase 4)**:
   ```bash
   # Create mobile edit modal component
   # Add to configure page
   # Test on mobile device
   ```

2. **For Desktop UI (Phase 5)**:
   ```bash
   # Create properties panel component
   # Add to configure page
   # Test precise input
   ```

3. **For Testing (Phase 6)**:
   ```bash
   # Run test suite
   node -e "require('./src/lib/utils/test-percentage-conversion').runAllTests()"
   
   # Manual testing
   # - Open configure page
   # - Edit layers
   # - Generate certificate
   # - Verify positions
   ```

---

## 💡 Tips & Best Practices

### 1. Always Use Percentage as Source of Truth:
```typescript
// ✅ GOOD
const x = (layer.xPercent / 100) * templateWidth;

// ❌ BAD
const xPercent = (layer.x / templateWidth) * 100;
```

### 2. Update Both Pixel and Percentage:
```typescript
// ✅ GOOD
onUpdate({
  xPercent: newXPercent,
  x: (newXPercent / 100) * templateWidth
});

// ❌ BAD (only update one)
onUpdate({ xPercent: newXPercent });
```

### 3. Use Helper Functions:
```typescript
// ✅ GOOD
const layer = ensureFontSizePercent(rawLayer, templateHeight);

// ❌ BAD (manual calculation everywhere)
const fontSizePercent = (layer.fontSize / templateHeight) * 100;
```

---

## 🚀 Expected Timeline

- **Phase 4 (Mobile UI)**: 2-3 hours
- **Phase 5 (Desktop UI)**: 2-3 hours
- **Phase 6 (Testing)**: 1-2 hours
- **Total**: 5-8 hours

---

## ✅ Success Criteria

Phase 3-6 will be considered complete when:

1. ✅ Mobile users can comfortably edit layers with sliders
2. ✅ Desktop users have precise control with input fields
3. ✅ Positions are identical across mobile, desktop, and generated certificates
4. ✅ All tests pass (unit, integration, visual)
5. ✅ No regressions in existing functionality
6. ✅ Documentation is complete and accurate

---

**This guide provides a complete roadmap for implementing Phases 3-6. Follow it step by step for successful implementation!** 🎯
