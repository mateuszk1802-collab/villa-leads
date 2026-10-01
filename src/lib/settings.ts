import "server-only";
import { EMPTY_SETTINGS, type Settings } from "@/lib/messages";
import type { createClient } from "@/lib/supabase/server";

export async function loadSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Settings> {
  const { data } = await supabase.from("settings").select("*").maybeSingle();
  if (!data) return EMPTY_SETTINGS;
  const out = { ...EMPTY_SETTINGS };
  for (const k of Object.keys(EMPTY_SETTINGS) as (keyof Settings)[]) out[k] = data[k] ?? null;
  return out;
}
