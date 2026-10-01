import { SettingsForm } from "@/components/SettingsForm";
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
      <SettingsForm settings={settings} />
    </div>
  );
}
