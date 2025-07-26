import { createRoot } from 'react-dom/client'
import './index.css'

// Temporarily use minimal app to test for TooltipProvider issues
// import App from './App.tsx'

const MinimalApp = () => {
  console.log('MinimalApp rendering - checking for TooltipProvider conflicts');
  return (
    <div className="p-4">
      <h1>Minimal App Test</h1>
      <p>If you see this, React is working without TooltipProvider issues.</p>
      <p>Check console for any remaining errors.</p>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<MinimalApp />);
