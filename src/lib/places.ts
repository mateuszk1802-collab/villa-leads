import "server-only";

// Text Search (New). Pola websiteUri / rating / telefon należą do SKU „Text Search Enterprise”
// (1000 darmowych zapytań miesięcznie). Pobieramy tylko to, czego potrzebujemy.
const ENDPOINT = process.env.PLACES_API_URL ?? "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviews: number | null;
  mapsUrl: string | null;
};

type ApiPlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

export function placesApiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

/** "123 Main St, Scottsdale, AZ 85251, USA" → "Scottsdale, AZ" */
export function cityFromAddress(address: string | undefined): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 3 && /^(USA|United States)$/i.test(parts[parts.length - 1])) {
    const state = parts[parts.length - 2].split(" ")[0];
    const city = parts[parts.length - 3];
    return `${city}, ${state}`;
  }
  return parts.slice(-2).join(", ") || null;
}

export async function searchPlaces(
  textQuery: string,
  pageToken?: string,
): Promise<{ results: PlaceResult[]; nextPageToken: string | null }> {
  const key = placesApiKey();
  if (!key) throw new Error("Brak klucza GOOGLE_PLACES_API_KEY.");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 20,
      languageCode: "en",
      regionCode: "US",
      ...(pageToken ? { pageToken } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string; status?: string } };
      if (body.error?.message) message = body.error.message;
      if (res.status === 429 || body.error?.status === "RESOURCE_EXHAUSTED")
        message = "Wyczerpany dzienny limit zapytań (ustawiony w Google Cloud). Spróbuj jutro.";
      else if (res.status === 403)
        message = `Google odrzucił klucz API: ${message}. Sprawdź, czy „Places API (New)” jest włączone i podpięte jest rozliczenie.`;
    } catch {}
    throw new Error(message);
  }

  const data = (await res.json()) as { places?: ApiPlace[]; nextPageToken?: string };
  const results = (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "(bez nazwy)",
      address: p.formattedAddress ?? null,
      location: cityFromAddress(p.formattedAddress),
      website: p.websiteUri ?? null,
      phone: p.nationalPhoneNumber ?? null,
      rating: p.rating ?? null,
      reviews: p.userRatingCount ?? null,
      mapsUrl: p.googleMapsUri ?? null,
    }));
  return { results, nextPageToken: data.nextPageToken ?? null };
}
