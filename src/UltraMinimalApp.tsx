import React from 'react';

const UltraMinimalApp = () => {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      lineHeight: '1.6'
    }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
        ForexAlert Pro
      </h1>
      
      <div style={{ 
        background: '#f8fafc', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>
          🚀 Application Status
        </h2>
        <p style={{ margin: '0', color: '#64748b' }}>
          Running in minimal mode while dependency issues are resolved.
        </p>
      </div>

      <div style={{ 
        background: '#fef3c7', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #fbbf24'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#92400e' }}>
          ⚠️ Temporary Mode
        </h3>
        <p style={{ margin: '0', color: '#92400e' }}>
          The full trading platform will be restored once React dependency conflicts are resolved.
        </p>
      </div>
    </div>
  );
};

export default UltraMinimalApp;