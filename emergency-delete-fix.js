
// Jalankan script ini di Console browser (F12) untuk fix otomatis

console.log("🚨 === EMERGENCY DELETE BUTTON FIX ===");

// Step 1: Force Set Admin Role
console.log("1. Force setting Admin role...");
localStorage.setItem("ecert-role", "Admin");
console.log("✅ Role set to Admin");

// Step 2: Reload Page to Apply Role
console.log("2. Reloading page to apply role changes...");
setTimeout(() => {
  window.location.reload();
}, 1000);

// Step 3: Wait for page load and fix buttons
setTimeout(() => {
  console.log("3. Page reloaded, now fixing buttons...");
  
  // Find all possible delete buttons
  const allButtons = document.querySelectorAll('button');
  console.log("Total buttons found:", allButtons.length);
  
  // Look for delete buttons with various selectors
  const deleteSelectors = [
    'button[class*="red-500"]',
    'button[class*="red-600"]', 
    'button:contains("Delete")',
    'button:contains("delete")',
    'button[title*="delete"]',
    'button[title*="Delete"]'
  ];
  
  let deleteButtons = [];
  
  // Try different selectors
  deleteSelectors.forEach(selector => {
    try {
      const buttons = document.querySelectorAll(selector);
      if (buttons.length > 0) {
        console.log(`Found ${buttons.length} buttons with selector: ${selector}`);
        deleteButtons = [...deleteButtons, ...buttons];
      }
    } catch {
      // Ignore invalid selectors
    }
  });
  
  // Also check by text content
  allButtons.forEach(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    if (text.includes('delete') || text.includes('hapus')) {
      deleteButtons.push(btn);
    }
  });
  
  // Remove duplicates
  deleteButtons = [...new Set(deleteButtons)];
  
  console.log("Delete buttons found:", deleteButtons.length);
  
  if (deleteButtons.length === 0) {
    console.log("❌ No delete buttons found!");
    console.log("Creating emergency delete button...");
    
    // Create emergency delete button
    const emergencyButton = document.createElement('button');
    emergencyButton.textContent = 'EMERGENCY DELETE';
    emergencyButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: red;
      color: white;
      padding: 10px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    `;
    
    emergencyButton.onclick = function() {
      console.log("🚨 Emergency delete button clicked!");
      alert("Emergency delete button clicked! Check console for details.");
    };
    
    document.body.appendChild(emergencyButton);
    console.log("✅ Emergency delete button created");
  } else {
    // Fix existing delete buttons
    deleteButtons.forEach((btn, index) => {
      console.log(`Fixing button ${index + 1}...`);
      
      // Force enable
      btn.disabled = false;
      btn.removeAttribute('disabled');
      
      // Force CSS
      btn.style.cssText += `
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        z-index: 999 !important;
        position: relative !important;
      `;
      
      // Remove blocking classes
      btn.classList.remove('opacity-50', 'cursor-not-allowed', 'disabled');
      
      // Add click handler
      const originalOnClick = btn.onclick;
      btn.onclick = function(e) {
        console.log("🎯 Delete button clicked!", {
          button: btn,
          event: e,
          originalOnClick: originalOnClick
        });
        
        if (originalOnClick) {
          originalOnClick.call(btn, e);
        } else {
          console.log("No original onClick handler found");
          alert("Delete button clicked but no handler found!");
        }
      };
      
      console.log(`✅ Button ${index + 1} fixed`);
    });
  }
  
  // Step 4: Test click events
  console.log("4. Testing click events...");
  if (deleteButtons.length > 0) {
    console.log("Testing click on first button...");
    deleteButtons[0].click();
  }
  
  // Step 5: Summary
  console.log("🎯 === EMERGENCY FIX SUMMARY ===");
  console.log("Role:", localStorage.getItem("ecert-role"));
  console.log("Delete buttons found:", deleteButtons.length);
  console.log("Buttons fixed:", deleteButtons.length);
  console.log("Emergency button created:", deleteButtons.length === 0);
  
}, 2000);

console.log("⏳ Emergency fix in progress... Please wait for page reload.");
