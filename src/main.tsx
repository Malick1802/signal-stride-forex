import { createRoot } from 'react-dom/client'
// Temporarily removing CSS import to isolate TooltipProvider issue
// import './index.css'

// Completely bare minimum to test if TooltipProvider issue is resolved
console.log('🔍 Testing absolute minimum React app - no CSS, no other imports');

const TestApp = () => {
  console.log('✅ TestApp is rendering successfully');
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial', 
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>✅ React is Working</h1>
      <p>If you see this, the TooltipProvider issue has been resolved.</p>
      <p>Check the browser console for any remaining errors.</p>
      <p>Version: NO CSS IMPORT</p>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<TestApp />);
