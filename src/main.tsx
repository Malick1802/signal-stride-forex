import { createRoot } from 'react-dom/client'

const App = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
          ForexAlert Pro
        </h1>
        <p style={{ color: '#666' }}>
          Application is running successfully!
        </p>
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);