console.log('Testing minimal setup...');

// Test basic imports
try {
  const { createElement } = require('react');
  console.log('✅ React import works');
} catch (e) {
  console.log('❌ React import failed:', e.message);
}

try {
  const { Outlet } = require('react-router');
  console.log('✅ React Router import works');
} catch (e) {
  console.log('❌ React Router import failed:', e.message);
}

console.log('Minimal test complete'); 