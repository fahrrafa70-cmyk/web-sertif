# DEBUG: Tombol Delete Tidak Bisa Diinteraksi

## 🔍 **LANGKAH DEBUGGING:**

### **1. ✅ Cek Console Browser**
Buka Developer Tools (F12) dan jalankan perintah berikut di Console:

```javascript
// Cek role di localStorage
console.log("Role di localStorage:", localStorage.getItem("ecert-role"));

// Cek semua localStorage
console.log("Semua localStorage:", localStorage);

// Cek apakah ada error JavaScript
console.log("Ada error JavaScript?", window.onerror);
```

### **2. ✅ Cek State Component**
Di Console browser, jalankan:

```javascript
// Cek apakah component sudah mount
console.log("Component mounted:", document.querySelector('[data-testid="certificates-page"]'));

// Cek apakah ada button delete
const deleteButtons = document.querySelectorAll('button[class*="red-500"]');
console.log("Delete buttons found:", deleteButtons.length);
console.log("Delete buttons:", deleteButtons);

// Cek apakah button disabled
deleteButtons.forEach((btn, index) => {
  console.log(`Button ${index}:`, {
    disabled: btn.disabled,
    className: btn.className,
    onClick: btn.onclick,
    style: btn.style.cssText
  });
});
```

### **3. ✅ Test Click Event Manual**
Di Console browser, jalankan:

```javascript
// Test click event manual
const deleteButtons = document.querySelectorAll('button[class*="red-500"]');
if (deleteButtons.length > 0) {
  console.log("Testing click on first delete button...");
  deleteButtons[0].click();
} else {
  console.log("No delete buttons found!");
}
```

### **4. ✅ Cek CSS dan Styling**
Di Console browser, jalankan:

```javascript
// Cek CSS yang mungkin memblokir click
const deleteButtons = document.querySelectorAll('button[class*="red-500"]');
deleteButtons.forEach((btn, index) => {
  const styles = window.getComputedStyle(btn);
  console.log(`Button ${index} styles:`, {
    pointerEvents: styles.pointerEvents,
    cursor: styles.cursor,
    opacity: styles.opacity,
    zIndex: styles.zIndex,
    position: styles.position
  });
});
```

## 🎯 **KEMUNGKINAN PENYEBAB:**

### **1. ❌ Role Tidak Tersimpan dengan Benar**
- localStorage tidak menyimpan role sebagai "Admin"
- Role tersimpan dengan case yang salah
- Role di-reset oleh code lain

### **2. ❌ CSS/HTML Issue**
- Button ter-overlay oleh element lain
- CSS `pointer-events: none`
- Button berada di luar viewport
- Z-index issue

### **3. ❌ JavaScript Error**
- Error di event handler
- Function `requestDelete` tidak terdefinisi
- Hook `useCertificates` error

### **4. ❌ Component State Issue**
- `canDelete` selalu false
- `role` state tidak ter-update
- Component tidak re-render

## 🚀 **SOLUSI YANG DITERAPKAN:**

### **1. ✅ Debug Script untuk Role**
```javascript
// Jalankan di Console browser
console.log("=== DEBUG ROLE ===");
console.log("localStorage role:", localStorage.getItem("ecert-role"));
console.log("typeof role:", typeof localStorage.getItem("ecert-role"));

// Set role manual jika perlu
localStorage.setItem("ecert-role", "Admin");
console.log("Role set to Admin");

// Reload page
window.location.reload();
```

### **2. ✅ Debug Script untuk Button**
```javascript
// Jalankan di Console browser
console.log("=== DEBUG BUTTON ===");

// Cari semua button
const allButtons = document.querySelectorAll('button');
console.log("Total buttons:", allButtons.length);

// Cari button delete
const deleteButtons = Array.from(allButtons).filter(btn => 
  btn.textContent?.includes('Delete') || 
  btn.className.includes('red-500') ||
  btn.querySelector('svg[data-lucide="trash-2"]')
);

console.log("Delete buttons found:", deleteButtons.length);
deleteButtons.forEach((btn, index) => {
  console.log(`Delete button ${index}:`, {
    text: btn.textContent,
    className: btn.className,
    disabled: btn.disabled,
    onclick: btn.onclick,
    parentElement: btn.parentElement?.tagName
  });
});
```

### **3. ✅ Force Enable Delete Button**
```javascript
// Jalankan di Console browser - FORCE ENABLE
const deleteButtons = document.querySelectorAll('button[class*="red-500"]');
deleteButtons.forEach(btn => {
  btn.disabled = false;
  btn.style.pointerEvents = 'auto';
  btn.style.cursor = 'pointer';
  btn.style.opacity = '1';
  console.log("Button enabled:", btn);
});
```

### **4. ✅ Test Function Manual**
```javascript
// Jalankan di Console browser - TEST FUNCTION
// Ganti 'CERTIFICATE_ID' dengan ID sertifikat yang ada
const testDelete = async (certificateId) => {
  console.log("Testing delete function...");
  try {
    // Simulasi requestDelete function
    const confirmed = window.confirm("Test delete?");
    if (confirmed) {
      console.log("Delete confirmed for:", certificateId);
      // Di sini akan memanggil deleteCert function
    }
  } catch (error) {
    console.error("Delete error:", error);
  }
};

// Test dengan ID sertifikat yang ada
// testDelete('CERTIFICATE_ID_HERE');
```

## 🧪 **TESTING STEPS:**

### **Test 1: Role Check**
1. Buka Console (F12)
2. Jalankan: `console.log(localStorage.getItem("ecert-role"))`
3. Pastikan return "Admin"
4. Jika tidak, jalankan: `localStorage.setItem("ecert-role", "Admin")`

### **Test 2: Button Check**
1. Jalankan script debug button
2. Pastikan ada button delete yang ditemukan
3. Cek apakah button disabled atau tidak

### **Test 3: CSS Check**
1. Jalankan script debug CSS
2. Pastikan `pointer-events` bukan "none"
3. Pastikan `opacity` bukan "0"

### **Test 4: Click Test**
1. Jalankan script test click manual
2. Lihat apakah ada error di console
3. Cek apakah function dipanggil

## 🎉 **HASIL YANG DIHARAPKAN:**

Setelah debugging, kita akan tahu:
- ✅ **Role tersimpan dengan benar**
- ✅ **Button delete ditemukan dan enabled**
- ✅ **CSS tidak memblokir interaction**
- ✅ **Click event berfungsi**

**Jalankan script debugging di atas untuk mengidentifikasi masalah yang tepat!**
