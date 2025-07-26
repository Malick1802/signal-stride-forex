import { createRoot } from 'react-dom/client'
import './index.css'

// Minimal test component to isolate the TooltipProvider issue
const MinimalApp = () => {
  return (
    <div className="p-4">
      <h1>Minimal App Test</h1>
      <p>If you see this, React is working without TooltipProvider issues.</p>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<MinimalApp />);