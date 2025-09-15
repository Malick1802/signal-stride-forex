// Utility functions for handling Supabase query results safely

export function isValidData<T>(data: any): data is T {
  return data && typeof data === 'object' && !('error_hint' in data) && !('hint' in data);
}

export function isValidArray<T>(data: any): data is T[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && !('error_hint' in item));
}

export function safeGetData<T>(result: { data: any; error: any }): T | null {
  if (result.error) {
    console.error('Supabase query error:', result.error);
    return null;
  }
  return isValidData<T>(result.data) ? result.data : null;
}

export function safeGetArray<T>(result: { data: any; error: any }): T[] {
  if (result.error) {
    console.error('Supabase query error:', result.error);
    return [];
  }
  return isValidArray<T>(result.data) ? result.data : [];
}