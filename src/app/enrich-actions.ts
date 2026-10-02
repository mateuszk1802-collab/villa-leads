"use server";

import { revalidatePath } from "next/cache";
import { enrichSite } from "@/lib/enrich/enrich";
import { isBlockedHost, isPrivateHost } from "@/lib/enrich/extract";
import { domainFromUrl, normalizeUrl, type HasVideo } from "@/lib/leads";
import { requireUser } from "@/lib/supabase/server";

const MAX_PER_IMPORT = 50;

export type ImportRow =
  | { input: string; status: "created"; id: string; domain: string }
  | { input: string; status: "duplicate"; id?: string; domain: string }
  | { input: string; status: "skipped"; reason: string };

export async function importUrls(text: string): Promise<{ rows: ImportRow[]; error?: string }> {
  const { supabase } = await requireUser();

  const inputs = text
    .split(/[\r\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!inputs.length) return { rows: [], error: "Wklej przynajmniej jeden adres www." };
  if (inputs.length > MAX_PER_IMPORT)
    return { rows: [], error: `Maksymalnie ${MAX_PER_IMPORT} adresów naraz.` };

  const rows: ImportRow[] = [];
  const toCreate = new Map<string, { input: string; website: string }>();

  for (const input of inputs) {
    const url = normalizeUrl(input);
    const domain = domainFromUrl(url);
    if (!url || !domain) {
      rows.push({ input, status: "skipped", reason: "Niepoprawny adres" });
      continue;
    }
    const host = new URL(url).hostname;
    if (isBlockedHost(host)) {
      rows.push({
        input,
        status: "skipped",
        reason: "Airbnb / VRBO / Booking — wklej taki link ręcznie jako „link do oferty” leada",
      });
      continue;
    }
    if (isPrivateHost(host)) {
      rows.push({ input, status: "skipped", reason: "Adres prywatny" });
      continue;
    }
    if (toCreate.has(domain)) {
      rows.push({ input, status: "duplicate", domain });
      continue;
    }
    toCreate.set(domain, { input, website: new URL(url).origin + "/" });
  }

  const domains = [...toCreate.keys()];
  if (domains.length) {
    const { data: existing, error } = await supabase
      .from("leads")
      .select("id,domain")
      .in("domain", domains);
    if (error) return { rows, error: `Błąd bazy: ${error.message}` };
    for (const e of existing ?? []) {
      const item = toCreate.get(e.domain);
      if (item) {
        rows.push({ input: item.input, status: "duplicate", id: e.id, domain: e.domain });
        toCreate.delete(e.domain);
      }
    }
  }

  if (toCreate.size) {
    const insert = [...toCreate.entries()].map(([domain, { website }]) => ({
      name: domain, // zastąpimy nazwą ze strony po wzbogaceniu
      website,
      domain,
    }));
    const { data, error } = await supabase.from("leads").insert(insert).select("id,domain");
    if (error) return { rows, error: `Błąd zapisu: ${error.message}` };
    for (const created of data ?? []) {
      rows.push({
        input: toCreate.get(created.domain)!.input,
        status: "created",
        id: created.id,
        domain: created.domain,
      });
    }
  }

  // Zachowujemy kolejność z wklejonej listy
  rows.sort((a, b) => inputs.indexOf(a.input) - inputs.indexOf(b.input));
  revalidatePath("/", "layout");
  return { rows };
}

export type EnrichSummary = {
  error?: string;
  name?: string;
  email?: string | null;
  emailUpdated?: boolean;
  hasVideo?: HasVideo;
  note?: string;
};

/** Wzbogaca jednego leada: pobiera publiczną stronę główną i kontaktową firmy. */
export async function enrichLead(id: string): Promise<EnrichSummary> {
  const { supabase } = await requireUser();
  const { data: lead } = await supabase
    .from("leads")
    .select("id,name,website,domain,email,has_video")
    .eq("id", id)
    .maybeSingle();
  if (!lead) return { error: "Nie znaleziono leada." };
  if (!lead.website) return { error: "Lead nie ma adresu strony www." };

  let result;
  try {
    result = await enrichSite(lead.website, lead.domain);
  } catch (e) {
    return { error: `Błąd wzbogacania: ${e instanceof Error ? e.message : String(e)}` };
  }

  const update: Record<string, unknown> = {
    enriched_at: new Date().toISOString(),
    enrich_note: result.notes.join("\n"),
  };
  if (result.excerpt) update.site_excerpt = result.excerpt;
  const emailUpdated = Boolean(result.email && !lead.email);
  if (emailUpdated) update.email = result.email;
  // Nie nadpisujemy tego, co ustawiłeś ręcznie — tylko „nie wiem”
  let hasVideo = lead.has_video as HasVideo;
  if (result.video !== null && hasVideo === "unknown") {
    hasVideo = result.video.length ? "yes" : "no";
    update.has_video = hasVideo;
  }
  let name = lead.name as string;
  if (result.siteName && lead.name === lead.domain) {
    name = result.siteName;
    update.name = name;
  }

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) return { error: `Błąd zapisu: ${error.message}` };

  revalidatePath("/", "layout");
  return {
    name,
    email: result.email,
    emailUpdated,
    hasVideo,
    note: result.notes.join("\n"),
  };
}
