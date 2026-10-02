/** Czyste funkcje do wyciągania danych z HTML (bez sieci). */

/** Serwisy, z których NIE pobieramy niczego. */
const BLOCKED_HOST = /(^|\.)(airbnb\.[a-z.]+|vrbo\.com|booking\.com|abnb\.me)$/i;

export function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOST.test(hostname.toLowerCase());
}

/** Nie pozwalamy pobierać adresów lokalnych / sieci prywatnych. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  if (/^[0-9.]+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (h.includes(":")) return true; // literały IPv6 — nie obsługujemy
  return false;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  "#64": "@",
  "#46": ".",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const lower = e.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return ENTITIES[lower] ?? m;
  });
}

/** Cloudflare „email protection”: data-cfemail="hex" (pierwszy bajt to klucz XOR). */
export function decodeCfEmail(hex: string): string | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 4 || hex.length % 2) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}/gi;
const JUNK_EMAIL =
  /(\.(png|jpe?g|gif|webp|svg|css|js|ico)$)|(@(example|domain|email|sentry|sentry-next|wixpress|godaddy|yourdomain|mysite)\.)|(^(name|email|your|you|user|test|someone|no-?reply|do-?not-?reply)@)|(@\d+x\.)/i;

export function extractEmails(html: string): string[] {
  const found = new Set<string>();
  const add = (raw: string) => {
    const e = decodeEntities(raw).trim().replace(/^mailto:/i, "").split("?")[0].toLowerCase();
    if (/^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(e) && !JUNK_EMAIL.test(e))
      found.add(e);
  };

  for (const m of html.matchAll(/href\s*=\s*["']mailto:([^"'?]+)/gi)) add(decodeURIComponent(m[1]));
  for (const m of html.matchAll(/data-cfemail\s*=\s*["']([0-9a-f]+)["']/gi)) {
    const e = decodeCfEmail(m[1]);
    if (e) add(e);
  }
  // Tekst strony (bez skryptów i stylów, encje zamienione)
  const text = decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "),
  );
  for (const m of text.matchAll(EMAIL_RE)) add(m[0]);
  return [...found];
}

const PREFERRED_LOCAL = [
  "info",
  "hello",
  "contact",
  "reservations",
  "booking",
  "bookings",
  "stay",
  "rentals",
  "sales",
  "inquiries",
  "office",
];

/** Wybiera najlepszy adres: z domeny firmy, potem ogólne skrzynki (info@, hello@…). */
export function pickBestEmail(emails: string[], domain: string | null): string | null {
  emails = emails.filter((e) => !JUNK_EMAIL.test(e));
  if (!emails.length) return null;
  const d = domain?.toLowerCase().replace(/^www\./, "");
  const score = (e: string) => {
    const [local, host] = e.split("@");
    let s = 0;
    if (d && (host === d || host.endsWith("." + d))) s += 100;
    const idx = PREFERRED_LOCAL.indexOf(local);
    if (idx !== -1) s += 50 - idx;
    if (/privacy|abuse|webmaster|careers|jobs/.test(local)) s -= 80;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a))[0];
}

export type VideoKind = "youtube" | "vimeo" | "video" | "wistia";

export function detectVideo(html: string): VideoKind[] {
  const kinds = new Set<VideoKind>();
  if (/(youtube(-nocookie)?\.com\/(embed|watch|shorts)|youtu\.be\/)/i.test(html)) kinds.add("youtube");
  if (/(player\.vimeo\.com\/video|vimeo\.com\/\d{5,})/i.test(html)) kinds.add("vimeo");
  if (/<video[\s>]/i.test(html)) kinds.add("video");
  if (/(fast\.wistia\.(com|net)|wistia_embed)/i.test(html)) kinds.add("wistia");
  return [...kinds];
}

/** Nazwa firmy: og:site_name, potem pierwszy człon <title>. */
export function extractSiteName(html: string): string | null {
  const og =
    html.match(/<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (og) return clean(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) return null;
  const first = decodeEntities(title[1]).split(/\s[|–—\-:·•]\s/)[0];
  return clean(first);

  function clean(s: string) {
    const t = decodeEntities(s).replace(/\s+/g, " ").trim();
    if (!t || /^(home|homepage|welcome)$/i.test(t)) return null;
    return t.slice(0, 80);
  }
}

/** Link do podstrony kontaktowej w obrębie tej samej strony. */
export function findContactUrl(html: string, baseUrl: string): string | null {
  const base = new URL(baseUrl);
  const candidates: { url: string; score: number }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeEntities(m[1]).trim();
    const text = m[2].replace(/<[^>]+>/g, " ").toLowerCase();
    if (/^(mailto|tel|javascript):/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const path = url.pathname.toLowerCase();
    let score = 0;
    if (/contact/.test(path)) score += 10;
    if (/contact/.test(text)) score += 8;
    if (/get-in-touch|reach-us|inquir/.test(path + " " + text)) score += 5;
    if (score > 0 && url.pathname !== base.pathname) candidates.push({ url: url.toString(), score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url ?? null;
}

/** Widoczny tekst strony (bez skryptów, stylów, menu i stopki), skrócony — kontekst dla Claude. */
export function extractVisibleText(html: string, maxChars = 1500): string {
  const text = decodeEntities(
    html
      .replace(/<(head|script|style|noscript|svg|nav|footer|header|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…" : text;
}
