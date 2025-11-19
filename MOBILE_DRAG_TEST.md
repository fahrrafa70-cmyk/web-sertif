# Mobile Drag Testing Guide

## 🧪 Test Checklist:

### 1. **Basic Touch Drag** (Should Work)
- [ ] Buka configure page di mobile browser
- [ ] Tap dan hold pada text layer
- [ ] Drag ke posisi baru
- [ ] Release
- [ ] **Expected**: Layer pindah ke posisi baru

### 2. **Precision Test** (Might Be Difficult)
- [ ] Coba geser layer dengan presisi tinggi
- [ ] Coba tap layer yang sangat kecil
- [ ] **Expected**: Sulit karena jari lebih besar dari mouse cursor

### 3. **Scroll Conflict** (Potential Issue)
- [ ] Coba drag layer sambil page bisa scroll
- [ ] **Expected**: Mungkin page ikut scroll (conflict)

---

## 🔍 How to Test:

### Option 1: Chrome DevTools Mobile Emulation
```
1. Buka Chrome
2. F12 (DevTools)
3. Ctrl+Shift+M (Toggle device toolbar)
4. Pilih device (iPhone, Android)
5. Test drag layer
```

### Option 2: Actual Mobile Device
```
1. Buka http://localhost:3000/templates/configure?template=<id>
2. Tap layer
3. Drag layer
4. Verify position saved
```

---

## 📊 Expected Results:

### ✅ Should Work:
- Touch drag layer
- Position updates
- Saves to database
- Percentage calculated correctly

### ⚠️ Might Be Problematic:
- Small layers hard to tap
- Precision dragging difficult
- Scroll conflict
- No visual feedback

---

## 🚀 Recommended Improvements (Phase 4):

If mobile dragging is too difficult, implement:

1. **Slider-based editing** (easier than drag)
2. **Larger touch targets** (easier to tap)
3. **Lock scroll** when dragging (prevent conflict)
4. **Visual grid** (easier alignment)

See: PHASE_3_6_IMPLEMENTATION_GUIDE.md for implementation details.
