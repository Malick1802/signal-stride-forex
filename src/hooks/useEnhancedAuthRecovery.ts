import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useEnhancedAuthRecovery = () => {
  const { user, session } = useAuth();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSuccessfulCallRef = useRef<number>(0);

  // Enhanced session refresh with exponential backoff
  const refreshSessionWithRetry = useCallback(async (retryCount = 0): Promise<boolean> => {
    try {
      console.log(`🔄 Attempting session refresh (attempt ${retryCount + 1})`);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        
        // Exponential backoff for retries
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Retrying session refresh in ${delay}ms...`);
          
          retryTimeoutRef.current = setTimeout(() => {
            refreshSessionWithRetry(retryCount + 1);
          }, delay);
        } else {
          console.error('❌ Session refresh failed after all retries');
          return false;
        }
      } else {
        console.log('✅ Session refreshed successfully');
        lastSuccessfulCallRef.current = Date.now();
        return true;
      }
    } catch (error) {
      console.error('❌ Session refresh exception:', error);
      return false;
    }
    
    return false;
  }, []);

  // Monitor for auth state changes and network issues
  useEffect(() => {
    if (!user) return;

    const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed automatically');
        lastSuccessfulCallRef.current = Date.now();
      } else if (event === 'SIGNED_OUT') {
        console.log('⚠️ User signed out unexpectedly');
        // Could trigger a re-login flow here if needed
      }
    });

    // Periodic session validation
    const validateSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          console.warn('⚠️ No active session found');
          return;
        }

        // Check if token is close to expiring (within 5 minutes)
        const expiresAt = currentSession.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
        
        if (timeUntilExpiry < 300) { // Less than 5 minutes
          console.log('⏰ Token expiring soon, refreshing proactively');
          await refreshSessionWithRetry();
        }
        
        // Test connection with a simple query
        const { error } = await supabase.from('trading_signals').select('id').limit(1);
        
        if (error && error.message.includes('No API key found')) {
          console.warn('🔧 API key issue detected, attempting session refresh');
          await refreshSessionWithRetry();
        } else if (!error) {
          lastSuccessfulCallRef.current = Date.now();
        }
        
      } catch (error) {
        console.error('❌ Session validation failed:', error);
        await refreshSessionWithRetry();
      }
    };

    // Validate session every 2 minutes
    const validationInterval = setInterval(validateSession, 2 * 60 * 1000);
    
    // Initial validation
    validateSession();

    return () => {
      clearInterval(validationInterval);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      authListener.data.subscription.unsubscribe();
    };
  }, [user, refreshSessionWithRetry]);

  // Enhanced Supabase client wrapper with automatic retry
  const createReliableSupabaseCall = useCallback(
    <T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> => {
      return new Promise(async (resolve, reject) => {
        let lastError: any;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await operation();
            lastSuccessfulCallRef.current = Date.now();
            resolve(result);
            return;
          } catch (error: any) {
            lastError = error;
            
            // Check if it's an auth-related error
            if (error?.message?.includes('No API key') || 
                error?.message?.includes('Invalid JWT') ||
                error?.message?.includes('JWT expired')) {
              
              console.warn(`🔧 Auth error on attempt ${attempt + 1}, refreshing session...`);
              
              if (attempt < maxRetries) {
                const refreshed = await refreshSessionWithRetry();
                if (refreshed) {
                  // Wait a bit before retry
                  await new Promise(resolve => setTimeout(resolve, 500));
                  continue;
                }
              }
            }
            
            // For non-auth errors or if we've exhausted retries
            if (attempt === maxRetries) {
              reject(lastError);
              return;
            }
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      });
    },
    [refreshSessionWithRetry]
  );

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSuccess = now - lastSuccessfulCallRef.current;
    
    return {
      healthy: timeSinceLastSuccess < 5 * 60 * 1000, // 5 minutes
      lastSuccessful: lastSuccessfulCallRef.current,
      timeSinceLastSuccess
    };
  }, []);

  return {
    refreshSessionWithRetry,
    createReliableSupabaseCall,
    getConnectionStatus
  };
};