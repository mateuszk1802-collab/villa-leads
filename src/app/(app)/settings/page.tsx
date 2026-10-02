import { SettingsForm } from "@/components/SettingsForm";
import { CLAUDE_MODEL, claudeConfigured } from "@/lib/claude";
import { loadSettings } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const { supabase } = await requireUser();
  const settings = await loadSettings(supabase);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ustawienia</h1>
        <p className="text-sm text-stone-500">
          Te dane trafiają do promptu dla Claude i do stopki każdego maila.
        </p>
      </div>
      <section className="card p-4 text-sm sm:p-6">
        <h2 className="mb-1 font-semibold">Claude (pisanie maili)</h2>
        {claudeConfigured() ? (
          <p className="text-emerald-700">
            Połączone ({CLAUDE_MODEL}). Przy leadzie użyj „✨ Napisz maila (Claude)”, a w zakładce
            „Dziś” — „Przygotuj wszystkie follow-upy”.
          </p>
        ) : (
          <p className="text-stone-600">
            Nie skonfigurowano — działa „Kopiuj prompt dla Claude”. Aby Claude pisał maile sam, dodaj w
            Vercel zmienną ANTHROPIC_API_KEY (typ Secret) i zrób Redeploy. Instrukcja w README.
          </p>
        )}
      </section>
      <SettingsForm settings={settings} />
    </div>
  );
}
