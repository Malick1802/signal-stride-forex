import React from 'react';

interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  onRetry?: () => void;
}

const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({ 
  error, 
  errorInfo, 
  onRetry 
}) => {
  const isExtensionError = error.message.includes('useState') || 
                          error.message.includes('React') ||
                          error.message.includes('extension');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #1e40af 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '600px' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          marginBottom: '1rem', 
          color: isExtensionError ? '#fbbf24' : '#ef4444' 
        }}>
          {isExtensionError ? '🔌 Extension Conflict' : '⚠️ Application Error'}
        </h1>
        
        <p style={{ 
          marginBottom: '2rem', 
          fontSize: '1.1rem', 
          lineHeight: '1.6' 
        }}>
          {isExtensionError 
            ? 'A browser extension is interfering with the application. This is a common issue with shopping or coupon extensions.'
            : 'The application encountered an unexpected error.'
          }
        </p>

        {isExtensionError && (
          <div style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '8px',
            padding: '20px',
            margin: '20px 0',
            textAlign: 'left'
          }}>
            <h3 style={{ color: '#fbbf24', margin: '0 0 12px 0' }}>
              🛠️ Quick Solutions:
            </h3>
            <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li><strong>Disable browser extensions</strong> (especially Honey, Capital One Shopping, etc.)</li>
              <li><strong>Use incognito/private browsing mode</strong> to automatically disable extensions</li>
              <li><strong>Try a different browser</strong> (Chrome, Firefox, Safari, Edge)</li>
              <li><strong>Clear browser cache and cookies</strong> for this site</li>
            </ul>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px'
        }}>
          {onRetry && (
            <button 
              onClick={onRetry}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              🔄 Try Again
            </button>
          )}
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            🔄 Reload Page
          </button>
          
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            style={{
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            🔗 New Tab
          </button>
        </div>

        <details style={{
          textAlign: 'left',
          background: 'rgba(0,0,0,0.2)',
          padding: '16px',
          borderRadius: '6px',
          marginTop: '20px'
        }}>
          <summary style={{ 
            cursor: 'pointer', 
            color: '#94a3b8',
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            🐛 Technical Details
          </summary>
          <div style={{
            fontSize: '0.9rem',
            color: '#e2e8f0',
            marginTop: '12px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Error:</strong> {error.message}
            </div>
            {error.stack && (
              <div style={{ marginBottom: '8px' }}>
                <strong>Stack:</strong>
                <pre style={{
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}>
                  {error.stack}
                </pre>
              </div>
            )}
            {errorInfo?.componentStack && (
              <div>
                <strong>Component Stack:</strong>
                <pre style={{
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}>
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

export default ErrorBoundaryFallback;