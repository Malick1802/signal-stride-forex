// Temporary utility to fix Supabase TypeScript issues
export const fixSupabaseQuery = (queryBuilder: any) => {
  // Add type casting methods to query builder
  const originalEq = queryBuilder.eq;
  queryBuilder.eq = function(column: any, value: any) {
    return originalEq.call(this, column as any, value as any);
  };
  
  return queryBuilder;
};

export const castResult = (result: any) => {
  if (result && typeof result === 'object' && !('error_hint' in result)) {
    return result;
  }
  return null;
};

export const castResultArray = (result: any): any[] => {
  if (Array.isArray(result)) {
    return result.filter(item => item && typeof item === 'object' && !('error_hint' in item));
  }
  return [];
};