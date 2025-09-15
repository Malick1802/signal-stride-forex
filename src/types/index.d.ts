// Global type declarations and overrides

// Supabase type overrides for debugging components
declare global {
  namespace Supabase {
    interface SelectQueryError {
      [key: string]: any;
    }
    
    interface Database {
      [key: string]: {
        Tables: {
          [key: string]: {
            Row: { [key: string]: any };
            Insert: { [key: string]: any };
            Update: { [key: string]: any };
          };
        };
      };
    }
  }
}

// Extend the Supabase postgrest types to be more flexible
declare module '@supabase/postgrest-js' {
  interface PostgrestQueryBuilder<T> {
    eq(column: any, value: any): this;
    select(query?: any): this;
  }
  
  interface PostgrestFilterBuilder<T> {
    eq(column: any, value: any): this;
  }
}

export {};