export function supabaseEnvOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Akceptujemy też nazwę ustawianą przez integrację Supabase w Vercel
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export const MISSING_ENV_MESSAGE =
  "Brak konfiguracji Supabase. W Vercel: Settings → Environment Variables dodaj " +
  "NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, a potem Deployments → … → Redeploy.";

export function supabaseEnv() {
  const env = supabaseEnvOrNull();
  if (!env) throw new Error(MISSING_ENV_MESSAGE);
  return env;
}
