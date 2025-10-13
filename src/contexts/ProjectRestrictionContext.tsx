import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectRestrictionState {
  isRestricted: boolean;
  restrictedUntil: number | null;
  restrictionReason: string | null;
  markAsRestricted: (reason: string, durationMinutes?: number) => void;
  clearRestriction: () => void;
  canRetryAuth: boolean;
}

const ProjectRestrictionContext = createContext<ProjectRestrictionState | undefined>(undefined);

const STORAGE_KEY = 'project_restriction_state';
const DEFAULT_RESTRICTION_DURATION = 60; // 60 minutes

export const ProjectRestrictionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedUntil, setRestrictedUntil] = useState<number | null>(null);
  const [restrictionReason, setRestrictionReason] = useState<string | null>(null);

  // Load restriction state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.restrictedUntil && Date.now() < parsed.restrictedUntil) {
          setIsRestricted(true);
          setRestrictedUntil(parsed.restrictedUntil);
          setRestrictionReason(parsed.restrictionReason || 'Project is temporarily restricted');
          console.warn('🚫 Project restriction active until', new Date(parsed.restrictedUntil));
        } else {
          // Expired, clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to parse restriction state:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Check periodically if restriction has expired
  useEffect(() => {
    if (!isRestricted || !restrictedUntil) return;

    const checkInterval = setInterval(() => {
      if (Date.now() >= restrictedUntil) {
        clearRestriction();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [isRestricted, restrictedUntil]);

  const markAsRestricted = (reason: string, durationMinutes = DEFAULT_RESTRICTION_DURATION) => {
    const until = Date.now() + (durationMinutes * 60 * 1000);
    const state = {
      restrictedUntil: until,
      restrictionReason: reason
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setIsRestricted(true);
    setRestrictedUntil(until);
    setRestrictionReason(reason);
    
    console.error(`🚫 Project marked as restricted: ${reason}. Restriction until ${new Date(until)}`);
  };

  const clearRestriction = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsRestricted(false);
    setRestrictedUntil(null);
    setRestrictionReason(null);
    console.log('✅ Project restriction cleared');
  };

  // Allow auth retry after 30 minutes or manual clear
  const canRetryAuth = !isRestricted || (restrictedUntil ? Date.now() > (restrictedUntil - 30 * 60 * 1000) : true);

  return (
    <ProjectRestrictionContext.Provider
      value={{
        isRestricted,
        restrictedUntil,
        restrictionReason,
        markAsRestricted,
        clearRestriction,
        canRetryAuth
      }}
    >
      {children}
    </ProjectRestrictionContext.Provider>
  );
};

export const useProjectRestriction = () => {
  const context = useContext(ProjectRestrictionContext);
  if (!context) {
    throw new Error('useProjectRestriction must be used within ProjectRestrictionProvider');
  }
  return context;
};
