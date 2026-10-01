import "server-only";
import { BOT_TOKEN, isAllowed, parseRobots, type Robots } from "./robots";
import { isBlockedHost, isPrivateHost } from "./extract";

const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_TOKEN}/1.0; contact lookup for a single user)`;
const MIN_INTERVAL_MS = 1100; // maks. 1 zapytanie na sekundę (z zapasem)
const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;

// Wspólny dla całego procesu serwera — kolejne wywołania też trzymają odstęp.
let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export class FetchBlocked extends Error {}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

function assertFetchable(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new FetchBlocked(`Nieobsługiwany protokół: ${url.protocol}`);
  if (isBlockedHost(url.hostname))
    throw new FetchBlocked(`${url.hostname} — nie pobieramy danych z tego serwisu`);
  if (isPrivateHost(url.hostname)) throw new FetchBlocked(`${url.hostname} — adres prywatny`);
}

/** Uprzejmy pobieracz: robots.txt, 1 zapytanie/s, limity czasu i rozmiaru. */
export class PoliteFetcher {
  private robots = new Map<string, Robots | null>();
  requests = 0;

  /** Jedno zapytanie HTTP (z odstępem 1 s), bez podążania za przekierowaniami. */
  private async rawGet(url: URL): Promise<Response> {
    assertFetchable(url);
    await throttle();
    this.requests++;
    return fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
      cache: "no-store",
    });
  }

  private async robotsFor(origin: string): Promise<Robots | null> {
    if (this.robots.has(origin)) return this.robots.get(origin)!;
    let parsed: Robots | null = null;
    try {
      let url = new URL("/robots.txt", origin);
      for (let i = 0; i <= MAX_REDIRECTS; i++) {
        const res = await this.rawGet(url);
        const loc = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && loc) {
          url = new URL(loc, url);
          continue;
        }
        if (res.ok) parsed = parseRobots(await readLimited(res));
        // 4xx = brak robots.txt → wszystko dozwolone; 5xx = traktujemy jak zakaz
        else if (res.status >= 500) parsed = parseRobots("User-agent: *\nDisallow: /");
        break;
      }
    } catch (e) {
      if (e instanceof FetchBlocked) throw e;
      parsed = null; // nie udało się pobrać — przyjmujemy brak ograniczeń
    }
    this.robots.set(origin, parsed);
    return parsed;
  }

  async allowed(url: URL): Promise<boolean> {
    const robots = await this.robotsFor(url.origin);
    return robots ? isAllowed(robots, url.pathname + url.search) : true;
  }

  /** Pobiera stronę HTML; zwraca null, gdy robots.txt zabrania. */
  async getHtml(input: string): Promise<{ url: string; html: string } | null> {
    let url = new URL(input);
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      assertFetchable(url);
      if (!(await this.allowed(url))) return null;
      const res = await this.rawGet(url);
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        url = new URL(loc, url);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (type && !/html|xml|text\/plain/i.test(type)) throw new Error(`To nie jest strona HTML (${type})`);
      return { url: url.toString(), html: await readLimited(res) };
    }
    throw new Error("Za dużo przekierowań");
  }
}
