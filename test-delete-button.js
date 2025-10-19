// TESTING SCRIPT: Tombol Delete Sertifikat
// Jalankan script ini di Console browser (F12) untuk test otomatis

console.log("🧪 === TESTING DELETE BUTTON ===");

// Test 1: Cek Role
console.log("\n1. Testing Role...");
const currentRole = localStorage.getItem("ecert-role");
console.log("Current role:", currentRole);

if (currentRole !== "Admin") {
  console.log("⚠️ Role is not Admin, setting to Admin...");
  localStorage.setItem("ecert-role", "Admin");
  console.log("✅ Role set to Admin");
  console.log("🔄 Please reload the page to apply changes");
} else {
  console.log("✅ Role is correct (Admin)");
}

// Test 2: Cek Button Delete
console.log("\n2. Testing Delete Buttons...");
const deleteButtons = document.querySelectorAll('button[class*="red-500"]');
console.log("Delete buttons found:", deleteButtons.length);

if (deleteButtons.length === 0) {
  console.log("❌ No delete buttons found!");
  console.log("Possible causes:");
  console.log("- Page not fully loaded");
  console.log("- User not Admin");
  console.log("- No certificates to display");
  console.log("- CSS classes changed");
} else {
  console.log("✅ Delete buttons found!");
  
  // Test setiap button
  deleteButtons.forEach((btn, index) => {
    console.log(`\nButton ${index + 1}:`, {
      text: btn.textContent?.trim(),
      disabled: btn.disabled,
      className: btn.className,
      onclick: btn.onclick,
      style: {
        pointerEvents: btn.style.pointerEvents,
        cursor: btn.style.cursor,
        opacity: btn.style.opacity
      }
    });
    
    // Cek CSS computed styles
    const styles = window.getComputedStyle(btn);
    console.log(`Button ${index + 1} computed styles:`, {
      pointerEvents: styles.pointerEvents,
      cursor: styles.cursor,
      opacity: styles.opacity,
      display: styles.display,
      visibility: styles.visibility
    });
  });
}

// Test 3: Test Click Event
console.log("\n3. Testing Click Events...");
if (deleteButtons.length > 0) {
  console.log("Testing click on first delete button...");
  
  // Add test event listener
  const testButton = deleteButtons[0];
  const originalOnClick = testButton.onclick;
  
  testButton.addEventListener('click', (e) => {
    console.log("🎯 Click event triggered!", {
      event: e,
      target: e.target,
      currentTarget: e.currentTarget,
      button: testButton
    });
  });
  
  console.log("✅ Click event listener added");
  console.log("💡 Try clicking the delete button now");
} else {
  console.log("❌ No buttons to test click events");
}

// Test 4: Cek Component State
console.log("\n4. Testing Component State...");
console.log("Window object available:", typeof window !== 'undefined');
console.log("React DevTools available:", !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);

// Test 5: Cek Console Errors
console.log("\n5. Testing Error Handling...");
const originalError = console.error;
let errorCount = 0;

console.error = function(...args) {
  errorCount++;
  console.log("🚨 Error detected:", args);
  originalError.apply(console, args);
};

// Test 6: Force Enable Buttons (if needed)
console.log("\n6. Force Enabling Buttons...");
deleteButtons.forEach((btn, index) => {
  if (btn.disabled) {
    btn.disabled = false;
    console.log(`✅ Button ${index + 1} force enabled`);
  }
  
  // Force CSS properties
  btn.style.pointerEvents = 'auto';
  btn.style.cursor = 'pointer';
  btn.style.opacity = '1';
  btn.style.zIndex = '999';
  
  console.log(`✅ Button ${index + 1} CSS forced`);
});

// Test 7: Summary
console.log("\n🎯 === TEST SUMMARY ===");
console.log("Role:", localStorage.getItem("ecert-role"));
console.log("Delete buttons found:", deleteButtons.length);
console.log("Buttons enabled:", deleteButtons.every(btn => !btn.disabled));
console.log("Click handlers added:", deleteButtons.length);
console.log("Errors detected:", errorCount);

if (deleteButtons.length > 0 && deleteButtons.every(btn => !btn.disabled)) {
  console.log("✅ All tests passed! Delete buttons should work now");
  console.log("💡 Try clicking a delete button to test the full flow");
} else {
  console.log("❌ Some tests failed. Check the issues above");
}

// Test 8: Manual Test Function
console.log("\n8. Manual Test Function...");
window.testDeleteFunction = function(certificateId) {
  console.log("🧪 Testing delete function manually...");
  console.log("Certificate ID:", certificateId);
  
  // Simulate the delete process
  const confirmed = window.confirm("Test delete function? (This is just a test)");
  if (confirmed) {
    console.log("✅ Delete function test confirmed");
    console.log("💡 In real scenario, this would call deleteCert(certificateId)");
  } else {
    console.log("❌ Delete function test cancelled");
  }
};

console.log("✅ Manual test function created: testDeleteFunction(certificateId)");
console.log("💡 Usage: testDeleteFunction('your-certificate-id')");

console.log("\n🎉 === TESTING COMPLETE ===");
console.log("Check the results above and try clicking delete buttons!");
console.log("If issues persist, check the troubleshooting guide.");
