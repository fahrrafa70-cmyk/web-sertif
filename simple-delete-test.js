// SIMPLE DELETE TEST: Test button interaction
// Jalankan script ini di Console browser (F12)

console.log("🧪 === SIMPLE DELETE BUTTON TEST ===");

// Step 1: Set Admin Role
console.log("1. Setting Admin role...");
localStorage.setItem("ecert-role", "Admin");
console.log("✅ Role set to Admin");

// Step 2: Wait for page to load
setTimeout(() => {
  console.log("2. Testing button interaction...");
  
  // Find delete buttons
  const buttons = document.querySelectorAll('button');
  console.log("Total buttons found:", buttons.length);
  
  // Look for delete buttons
  const deleteButtons = Array.from(buttons).filter(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    const className = btn.className || '';
    return text.includes('delete') || className.includes('red-500') || className.includes('red-600');
  });
  
  console.log("Delete buttons found:", deleteButtons.length);
  
  if (deleteButtons.length === 0) {
    console.log("❌ No delete buttons found!");
    console.log("Creating test delete button...");
    
    // Create a test delete button
    const testButton = document.createElement('button');
    testButton.textContent = 'TEST DELETE';
    testButton.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      z-index: 9999;
      background: red;
      color: white;
      padding: 15px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    `;
    
    testButton.onclick = function() {
      console.log("🎯 Test delete button clicked!");
      alert("Test delete button works! The issue might be with the original buttons.");
    };
    
    document.body.appendChild(testButton);
    console.log("✅ Test delete button created");
  } else {
    console.log("✅ Delete buttons found!");
    
    // Test each button
    deleteButtons.forEach((btn, index) => {
      console.log(`\nButton ${index + 1}:`, {
        text: btn.textContent?.trim(),
        disabled: btn.disabled,
        className: btn.className
      });
      
      // Force enable
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'pointer';
      btn.style.opacity = '1';
      
      // Add test click handler
      btn.addEventListener('click', (e) => {
        console.log(`🎯 Delete button ${index + 1} clicked!`, e);
        alert(`Delete button ${index + 1} clicked! Check console for details.`);
      });
      
      console.log(`✅ Button ${index + 1} enabled and click handler added`);
    });
  }
  
  // Step 3: Test click
  console.log("\n3. Testing click...");
  if (deleteButtons.length > 0) {
    console.log("Clicking first delete button...");
    deleteButtons[0].click();
  }
  
}, 1000);

console.log("⏳ Test in progress... Please wait.");
