"use server";

import { revalidatePath } from "next/cache";
import { isBlockedHost } from "@/lib/enrich/extract";
import { domainFromUrl, normalizeUrl } from "@/lib/leads";
import { searchPlaces, type PlaceResult } from "@/lib/places";
import { requireUser } from "@/lib/supabase/server";

export type SearchRow = PlaceResult & {
  domain: string | null;
  /** id istniejącego leada (ta sama domena albo to samo miejsce w Google) */
  existingId: string | null;
  /** strona to Airbnb/VRBO/Booking — nie nadaje się jako strona firmy */
  blockedWebsite: boolean;
};

export async function runPlacesSearch(
  region: string,
  query: string,
  pageToken?: string,
): Promise<{ rows: SearchRow[]; nextPageToken: string | null; error?: string }> {
  const { supabase } = await requireUser();
  const r = region.trim();
  const q = query.trim();
  if (!r || !q) return { rows: [], nextPageToken: null, error: "Podaj region i hasło." };
  if (r.length > 100 || q.length > 150)
    return { rows: [], nextPageToken: null, error: "Za długie hasło." };

  let found: Awaited<ReturnType<typeof searchPlaces>>;
  try {
    found = await searchPlaces(`${q} in ${r}`, pageToken);
  } catch (e) {
    return {
      rows: [],
      nextPageToken: null,
      error: e instanceof Error ? e.message : "Błąd wyszukiwania.",
    };
  }

  const rows: SearchRow[] = found.results.map((p) => {
    const website = normalizeUrl(p.website);
    const blockedWebsite = website ? isBlockedHost(new URL(website).hostname) : false;
    return {
      ...p,
      website: blockedWebsite ? null : website,
      domain: blockedWebsite ? null : domainFromUrl(website),
      existingId: null,
      blockedWebsite,
    };
  });

  const domains = rows.flatMap((x) => (x.domain ? [x.domain] : []));
  const placeIds = rows.map((x) => x.placeId);
  const [byDomain, byPlace] = await Promise.all([
    domains.length
      ? supabase.from("leads").select("id,domain").in("domain", domains)
      : Promise.resolve({ data: [] as { id: string; domain: string }[] }),
    supabase.from("leads").select("id,google_place_id").in("google_place_id", placeIds),
  ]);
  for (const row of rows) {
    row.existingId =
      byPlace.data?.find((l) => l.google_place_id === row.placeId)?.id ??
      (row.domain ? byDomain.data?.find((l) => l.domain === row.domain)?.id : undefined) ??
      null;
  }

  return { rows, nextPageToken: found.nextPageToken };
}

export async function addPlaces(
  items: PlaceResult[],
): Promise<{ created: { placeId: string; id: string; hasWebsite: boolean }[]; error?: string }> {
  const { supabase } = await requireUser();
  if (!Array.isArray(items) || items.length === 0) return { created: [], error: "Nic nie wybrano." };
  if (items.length > 60) return { created: [], error: "Maksymalnie 60 naraz." };

  const seen = new Set<string>();
  const rows = [];
  for (const p of items) {
    const website = normalizeUrl(p.website);
    const domain = website && !isBlockedHost(new URL(website).hostname) ? domainFromUrl(website) : null;
    const key = domain ?? `place:${p.placeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      name: String(p.name).slice(0, 200),
      lead_type: "management_company",
      location: p.location ? String(p.location).slice(0, 120) : null,
      website: domain ? website : null,
      domain,
      phone: p.phone ? String(p.phone).slice(0, 40) : null,
      google_place_id: String(p.placeId).slice(0, 300),
      google_rating: typeof p.rating === "number" ? p.rating : null,
      google_reviews: typeof p.reviews === "number" ? Math.round(p.reviews) : null,
    });
  }

  // Pomijamy to, co już jest w bazie (po domenie lub miejscu w Google)
  const domains = rows.flatMap((r) => (r.domain ? [r.domain] : []));
  const [byDomain, byPlace] = await Promise.all([
    domains.length
      ? supabase.from("leads").select("domain").in("domain", domains)
      : Promise.resolve({ data: [] as { domain: string }[] }),
    supabase
      .from("leads")
      .select("google_place_id")
      .in(
        "google_place_id",
        rows.map((r) => r.google_place_id),
      ),
  ]);
  const existingDomains = new Set((byDomain.data ?? []).map((r) => r.domain));
  const existingPlaces = new Set((byPlace.data ?? []).map((r) => r.google_place_id));
  const toInsert = rows.filter(
    (r) => !(r.domain && existingDomains.has(r.domain)) && !existingPlaces.has(r.google_place_id),
  );
  if (!toInsert.length) return { created: [], error: "Wszystkie wybrane firmy są już w bazie." };

  const { data, error } = await supabase
    .from("leads")
    .insert(toInsert)
    .select("id,google_place_id,website");
  if (error) return { created: [], error: `Błąd zapisu: ${error.message}` };

  revalidatePath("/", "layout");
  return {
    created: (data ?? []).map((d) => ({
      placeId: d.google_place_id as string,
      id: d.id as string,
      hasWebsite: Boolean(d.website),
    })),
  };
}
