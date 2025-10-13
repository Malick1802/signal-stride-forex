// Shared utility to check if project is restricted
export const isProjectRestricted = (): boolean => {
  try {
    const stored = localStorage.getItem('project_restriction_state');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed.restrictedUntil && Date.now() < parsed.restrictedUntil;
  } catch {
    return false;
  }
};
