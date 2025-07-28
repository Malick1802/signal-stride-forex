import { createRoot } from 'react-dom/client'
import './index.css'

// Completely bare minimum to test if TooltipProvider issue is resolved
console.log('🔍 Testing bare minimum React app - no other components');

const TestApp = () => {
  console.log('✅ TestApp is rendering successfully');
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>✅ React is Working</h1>
      <p>If you see this, the TooltipProvider issue has been resolved.</p>
      <p>Check the browser console for any remaining errors.</p>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<TestApp />);
