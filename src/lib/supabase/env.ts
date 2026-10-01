export const MISSING_ENV_MESSAGE =
  "Brak konfiguracji Supabase. W Vercel: Settings → Environment Variables dodaj " +
  "NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, a potem Deployments → … → Redeploy.";

type EnvResult = { ok: true; url: string; key: string } | { ok: false; message: string };

export function checkSupabaseEnv(): EnvResult {
  // Usuwamy przypadkowe spacje i cudzysłowy wklejone razem z wartością
  const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "").trim() || undefined;
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  // Akceptujemy też nazwę ustawianą przez integrację Supabase w Vercel
  const key = clean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!url || !key) return { ok: false, message: MISSING_ENV_MESSAGE };

  let parsed: URL | null = null;
  try {
    parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {}
  if (!parsed || !/^https?:$/.test(parsed.protocol) || parsed.hostname === "supabase.com") {
    return {
      ok: false,
      message:
        `NEXT_PUBLIC_SUPABASE_URL ma zły format („${url.slice(0, 60)}”). ` +
        "Powinien wyglądać tak: https://abcdefgh.supabase.co (Supabase → Project Settings → Data API → Project URL). " +
        "Popraw w Vercel → Settings → Environment Variables i zrób Redeploy.",
    };
  }
  if (/\s/.test(key) || key.startsWith("sb_secret_")) {
    return {
      ok: false,
      message:
        "NEXT_PUBLIC_SUPABASE_ANON_KEY jest niepoprawny. Użyj klucza „Publishable key” (sb_publishable_…) " +
        "z Supabase → Project Settings → API Keys — nigdy klucza sekretnego. Potem Redeploy.",
    };
  }
  return { ok: true, url: parsed.origin, key };
}

export function supabaseEnv() {
  const env = checkSupabaseEnv();
  if (!env.ok) throw new Error(env.message);
  return env;
}
