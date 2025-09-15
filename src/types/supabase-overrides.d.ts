// Temporary type overrides to fix Supabase query type issues

declare global {
  namespace Supabase {
    interface Database {
      [key: string]: any;
    }
  }
}

// Extend Window interface for any additional global types
declare global {
  interface Window {
    supabaseOverrides?: boolean;
  }
}

export {};