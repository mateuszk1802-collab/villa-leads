import "server-only";
import {
  detectVideo,
  extractEmails,
  extractSiteName,
  findContactUrl,
  pickBestEmail,
  type VideoKind,
} from "./extract";
import { FetchBlocked, PoliteFetcher } from "./fetcher";

export type EnrichResult = {
  ok: boolean;
  email: string | null;
  emails: string[];
  /** null = nie udało się sprawdzić żadnej strony */
  video: VideoKind[] | null;
  siteName: string | null;
  notes: string[];
};

/** Sprawdza stronę główną i podstronę kontaktową firmy. */
export async function enrichSite(website: string, domain: string | null): Promise<EnrichResult> {
  const fetcher = new PoliteFetcher();
  const notes: string[] = [];
  const emails = new Set<string>();
  const video = new Set<VideoKind>();
  let siteName: string | null = null;
  let pagesChecked = 0;

  let home: { url: string; html: string } | null = null;
  try {
    home = await fetcher.getHtml(website);
    if (!home) notes.push("robots.txt nie pozwala pobrać strony głównej");
  } catch (e) {
    if (e instanceof FetchBlocked) {
      return { ok: false, email: null, emails: [], video: null, siteName: null, notes: [e.message] };
    }
    notes.push(`Strona główna: ${e instanceof Error ? describe(e) : "błąd"}`);
  }

  if (home) {
    pagesChecked++;
    extractEmails(home.html).forEach((e) => emails.add(e));
    detectVideo(home.html).forEach((v) => video.add(v));
    siteName = extractSiteName(home.html);

    const contactUrl = findContactUrl(home.html, home.url) ?? new URL("/contact", home.url).toString();
    try {
      const contact = await fetcher.getHtml(contactUrl);
      if (contact) {
        pagesChecked++;
        extractEmails(contact.html).forEach((e) => emails.add(e));
        detectVideo(contact.html).forEach((v) => video.add(v));
      } else {
        notes.push("robots.txt nie pozwala pobrać strony kontaktowej");
      }
    } catch (e) {
      notes.push(`Kontakt (${new URL(contactUrl).pathname}): ${e instanceof Error ? describe(e) : "błąd"}`);
    }
  }

  const list = [...emails];
  const email = pickBestEmail(list, domain);
  notes.unshift(
    `Sprawdzono stron: ${pagesChecked}, zapytań: ${fetcher.requests}. ` +
      (email ? `E-mail: ${email}.` : "Nie znaleziono e-maila.") +
      (pagesChecked ? ` Wideo: ${video.size ? [...video].join(", ") : "brak"}.` : ""),
  );

  return {
    ok: pagesChecked > 0,
    email,
    emails: list,
    video: pagesChecked ? [...video] : null,
    siteName,
    notes,
  };
}

function describe(e: Error): string {
  if (e.name === "TimeoutError" || e.name === "AbortError") return "przekroczono czas";
  const cause = (e as Error & { cause?: { code?: string } }).cause;
  if (cause?.code === "ENOTFOUND") return "domena nie istnieje";
  if (cause?.code) return `błąd połączenia (${cause.code})`;
  return e.message;
}
