interface Env {
  OPENROUTER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export const env: Env = {
  OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
}; 