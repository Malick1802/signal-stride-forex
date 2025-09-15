// Type utilities to handle Supabase query results safely

export function castToAny<T = any>(value: unknown): T {
  return value as T;
}

export function safeAccess<T>(obj: any, key: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  return obj[key] as T;
}

export function isValidQueryResult(result: any): boolean {
  return result && typeof result === 'object' && !('error_hint' in result) && !('hint' in result);
}

export function handleSupabaseResult<T>(result: { data: any; error: any }): T[] {
  if (result.error) {
    console.error('Supabase query error:', result.error);
    return [];
  }
  
  if (!result.data) {
    return [];
  }
  
  if (Array.isArray(result.data)) {
    return result.data.filter(isValidQueryResult) as T[];
  }
  
  return isValidQueryResult(result.data) ? [result.data as T] : [];
}