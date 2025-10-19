// DEBUG SCRIPT: Tombol Delete Tidak Bisa Diinteraksi
// Jalankan script ini di Console browser (F12)

console.log("🔍 === DEBUG DELETE BUTTON ===");

// 1. Cek Role di localStorage
console.log("1. Checking role in localStorage...");
const currentRole = localStorage.getItem("ecert-role");
console.log("Current role:", currentRole);
console.log("Role type:", typeof currentRole);

if (currentRole !== "Admin") {
  console.log("⚠️ Role is not Admin, setting to Admin...");
  localStorage.setItem("ecert-role", "Admin");
  console.log("✅ Role set to Admin");
  console.log("🔄 Please reload the page to apply changes");
}

// 2. Cek Semua Button
console.log("\n2. Checking all buttons...");
const allButtons = document.querySelectorAll('button');
console.log("Total buttons found:", allButtons.length);

// 3. Cari Button Delete
console.log("\n3. Looking for delete buttons...");
const deleteButtons = Array.from(allButtons).filter(btn => {
  const text = btn.textContent?.toLowerCase() || '';
  const className = btn.className || '';
  const hasTrashIcon = btn.querySelector('svg[data-lucide="trash-2"]') || 
                      btn.querySelector('svg[data-lucide="trash"]') ||
                      className.includes('trash');
  
  return text.includes('delete') || 
         className.includes('red-500') || 
         className.includes('red-600') ||
         hasTrashIcon;
});

console.log("Delete buttons found:", deleteButtons.length);

// 4. Debug Setiap Button Delete
deleteButtons.forEach((btn, index) => {
  console.log(`\nDelete button ${index + 1}:`, {
    text: btn.textContent?.trim(),
    className: btn.className,
    disabled: btn.disabled,
    onclick: btn.onclick,
    parentElement: btn.parentElement?.tagName,
    grandParent: btn.parentElement?.parentElement?.tagName
  });
  
  // Cek CSS styles
  const styles = window.getComputedStyle(btn);
  console.log(`Button ${index + 1} CSS:`, {
    pointerEvents: styles.pointerEvents,
    cursor: styles.cursor,
    opacity: styles.opacity,
    zIndex: styles.zIndex,
    position: styles.position,
    display: styles.display,
    visibility: styles.visibility
  });
});

// 5. Force Enable Button Delete
console.log("\n4. Force enabling delete buttons...");
deleteButtons.forEach((btn, index) => {
  // Remove disabled attribute
  btn.disabled = false;
  
  // Force CSS styles
  btn.style.pointerEvents = 'auto';
  btn.style.cursor = 'pointer';
  btn.style.opacity = '1';
  btn.style.zIndex = '999';
  
  // Remove any blocking classes
  btn.classList.remove('opacity-50', 'cursor-not-allowed');
  
  console.log(`✅ Button ${index + 1} force enabled`);
});

// 6. Test Click Event
console.log("\n5. Testing click events...");
deleteButtons.forEach((btn, index) => {
  // Add test click handler
  const originalOnClick = btn.onclick;
  
  btn.addEventListener('click', (e) => {
    console.log(`🎯 Delete button ${index + 1} clicked!`, {
      event: e,
      target: e.target,
      currentTarget: e.currentTarget
    });
    
    // Call original handler if exists
    if (originalOnClick) {
      console.log("Calling original onClick handler...");
      originalOnClick.call(btn, e);
    }
  });
  
  console.log(`✅ Click handler added to button ${index + 1}`);
});

// 7. Cek Component State
console.log("\n6. Checking component state...");
console.log("Window object:", typeof window);
console.log("React DevTools available:", !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);

// 8. Cek Error di Console
console.log("\n7. Checking for JavaScript errors...");
const originalError = console.error;
console.error = function(...args) {
  console.log("🚨 JavaScript Error detected:", args);
  originalError.apply(console, args);
};

// 9. Summary
console.log("\n🎯 === SUMMARY ===");
console.log("Role:", localStorage.getItem("ecert-role"));
console.log("Delete buttons found:", deleteButtons.length);
console.log("All buttons enabled:", deleteButtons.every(btn => !btn.disabled));
console.log("Click handlers added:", deleteButtons.length);

if (deleteButtons.length === 0) {
  console.log("❌ No delete buttons found! Check if:");
  console.log("   - Page is fully loaded");
  console.log("   - User has Admin role");
  console.log("   - Certificates are loaded");
} else {
  console.log("✅ Delete buttons found and enabled!");
  console.log("💡 Try clicking a delete button now");
}

console.log("\n🔄 If role was changed, please reload the page");
console.log("🔍 Check console for any errors when clicking delete button");
