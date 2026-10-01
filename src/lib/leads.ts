export const STAGES = [
  { key: "new", label: "Nowy" },
  { key: "verified", label: "Sprawdzony" },
  { key: "demo_done", label: "Demo zrobione" },
  { key: "sent", label: "Wysłano" },
  { key: "followup_1", label: "Follow-up 1" },
  { key: "followup_2", label: "Follow-up 2" },
  { key: "replied", label: "Odpowiedź" },
  { key: "client", label: "Klient" },
  { key: "rejected", label: "Odmowa" },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<
  Stage,
  string
>;

export const STAGE_COLOR: Record<Stage, string> = {
  new: "bg-slate-100 text-slate-700",
  verified: "bg-sky-100 text-sky-800",
  demo_done: "bg-violet-100 text-violet-800",
  sent: "bg-amber-100 text-amber-800",
  followup_1: "bg-orange-100 text-orange-800",
  followup_2: "bg-orange-200 text-orange-900",
  replied: "bg-teal-100 text-teal-800",
  client: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export const LEAD_TYPES = [
  { key: "management_company", label: "Firma zarządzająca" },
  { key: "owner", label: "Właściciel" },
] as const;

export type LeadType = (typeof LEAD_TYPES)[number]["key"];

export const LEAD_TYPE_LABEL = Object.fromEntries(
  LEAD_TYPES.map((t) => [t.key, t.label]),
) as Record<LeadType, string>;

export const HAS_VIDEO = [
  { key: "unknown", label: "Nie wiem" },
  { key: "yes", label: "Tak" },
  { key: "no", label: "Nie" },
] as const;

export type HasVideo = (typeof HAS_VIDEO)[number]["key"];

export const HAS_VIDEO_LABEL = Object.fromEntries(
  HAS_VIDEO.map((v) => [v.key, v.label]),
) as Record<HasVideo, string>;

export type Lead = {
  id: string;
  name: string;
  lead_type: LeadType;
  location: string | null;
  website: string | null;
  domain: string | null;
  email: string | null;
  phone: string | null;
  listing_url: string | null;
  property_count: number | null;
  has_video: HasVideo;
  notes: string | null;
  stage: Stage;
  stage_changed_at: string;
  sent_at: string | null;
  followup1_at: string | null;
  followup2_at: string | null;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
};

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && STAGES.some((s) => s.key === v);
}
export function isLeadType(v: unknown): v is LeadType {
  return typeof v === "string" && LEAD_TYPES.some((t) => t.key === v);
}
export function isHasVideo(v: unknown): v is HasVideo {
  return typeof v === "string" && HAS_VIDEO.some((t) => t.key === v);
}

/** Dodaje https:// jeśli brak protokołu. Zwraca null dla pustych / niepoprawnych adresów. */
export function normalizeUrl(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** "https://www.Example.com/contact" → "example.com" */
export function domainFromUrl(input: string | null | undefined): string | null {
  const url = normalizeUrl(input);
  if (!url) return null;
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

/** Kolumny z datą, które ustawiamy przy wejściu w dany etap (potrzebne do przypomnień). */
export const STAGE_DATE_COLUMN: Partial<Record<Stage, "sent_at" | "followup1_at" | "followup2_at">> =
  {
    sent: "sent_at",
    followup_1: "followup1_at",
    followup_2: "followup2_at",
  };

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
