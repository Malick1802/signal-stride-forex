import React from 'react';
import { createRoot } from 'react-dom/client';

// Completely clean app with no external dependencies that could cause cache issues
const CleanApp: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      backgroundColor: '#f8fafc',
      margin: 0,
      padding: '1rem'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>
          📈
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '1rem',
          color: '#1e293b',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          ForexAlert Pro
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: '#64748b',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          ✅ Application is now running successfully!
        </p>
        
        <div style={{
          padding: '1rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#475569'
          }}>
            🚀 Ready to build your trading signals platform
          </p>
        </div>
      </div>
    </div>
  );
};

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<CleanApp />);
} else {
  console.error('Root element not found');
}