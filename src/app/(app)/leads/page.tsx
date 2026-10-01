import Link from "next/link";
import { StageBadge } from "@/components/StageBadge";
import {
  HAS_VIDEO,
  HAS_VIDEO_LABEL,
  LEAD_TYPES,
  LEAD_TYPE_LABEL,
  STAGES,
  isHasVideo,
  isLeadType,
  isStage,
  type Lead,
  type Stage,
} from "@/lib/leads";
import { requireUser } from "@/lib/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim();
  const stage = one(sp.stage);
  const type = one(sp.type);
  const video = one(sp.video);

  const { supabase } = await requireUser();

  let query = supabase
    .from("leads")
    .select("id,name,lead_type,location,website,domain,email,phone,has_video,stage,property_count,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (isStage(stage)) query = query.eq("stage", stage);
  if (isLeadType(type)) query = query.eq("lead_type", type);
  if (isHasVideo(video)) query = query.eq("has_video", video);
  if (q) {
    // Znaki , ( ) * % mają specjalne znaczenie w filtrze PostgREST — usuwamy je
    const safe = q.replace(/[,()*%\\]/g, " ").trim();
    if (safe) {
      const p = `%${safe}%`;
      query = query.or(
        `name.ilike.${p},location.ilike.${p},domain.ilike.${p},email.ilike.${p},notes.ilike.${p}`,
      );
    }
  }

  const [{ data: leads, error }, { data: allStages }] = await Promise.all([
    query,
    supabase.from("leads").select("stage"),
  ]);

  const counts = new Map<Stage, number>();
  for (const row of allStages ?? []) {
    counts.set(row.stage as Stage, (counts.get(row.stage as Stage) ?? 0) + 1);
  }
  const total = allStages?.length ?? 0;

  function hrefWith(params: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = { q: q || undefined, stage, type, video, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/leads?${s}` : "/leads";
  }

  const rows = (leads ?? []) as Pick<
    Lead,
    | "id"
    | "name"
    | "lead_type"
    | "location"
    | "website"
    | "domain"
    | "email"
    | "phone"
    | "has_video"
    | "stage"
    | "property_count"
    | "updated_at"
  >[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Leady</h1>
        <Link href="/leads/new" className="btn btn-primary hidden sm:inline-flex">
          + Dodaj lead
        </Link>
      </div>

      {/* Etapy jako szybkie filtry */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip href={hrefWith({ stage: undefined })} active={!isStage(stage)}>
          Wszystkie <span className="opacity-60">{total}</span>
        </Chip>
        {STAGES.map((s) => (
          <Chip key={s.key} href={hrefWith({ stage: s.key })} active={stage === s.key}>
            {s.label} <span className="opacity-60">{counts.get(s.key) ?? 0}</span>
          </Chip>
        ))}
      </div>

      <form method="get" className="card grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto_auto]">
        {isStage(stage) && <input type="hidden" name="stage" value={stage} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj: nazwa, miasto, domena, e-mail, notatki"
          className="input"
          type="search"
        />
        <select name="type" defaultValue={isLeadType(type) ? type : ""} className="input">
          <option value="">Każdy typ</option>
          {LEAD_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <select name="video" defaultValue={isHasVideo(video) ? video : ""} className="input">
          <option value="">Wideo: obojętnie</option>
          {HAS_VIDEO.map((v) => (
            <option key={v.key} value={v.key}>
              Wideo: {v.label.toLowerCase()}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            Filtruj
          </button>
          <Link href="/leads" className="btn">
            Wyczyść
          </Link>
        </div>
      </form>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Błąd wczytywania: {error.message}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-stone-500">
          {total === 0 ? (
            <>
              Nie masz jeszcze żadnych leadów.{" "}
              <Link href="/leads/new" className="font-medium text-stone-900 underline">
                Dodaj pierwszy
              </Link>
              .
            </>
          ) : (
            "Brak leadów pasujących do filtrów."
          )}
        </div>
      ) : (
        <ul className="card divide-y divide-stone-100">
          {rows.map((l) => (
            <li key={l.id}>
              <Link
                href={`/leads/${l.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-stone-50 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{l.name}</span>
                    <span className="sm:hidden">
                      <StageBadge stage={l.stage} />
                    </span>
                  </div>
                  <div className="truncate text-sm text-stone-500">
                    {[LEAD_TYPE_LABEL[l.lead_type], l.location, l.domain]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                  <span title="E-mail">{l.email ? `✉ ${l.email}` : "✉ brak"}</span>
                  <span>Wideo: {HAS_VIDEO_LABEL[l.has_video].toLowerCase()}</span>
                  {l.property_count != null && <span>{l.property_count} obiekt.</span>}
                </div>
                <span className="hidden w-32 justify-end sm:flex">
                  <StageBadge stage={l.stage} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap ${
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
      }`}
    >
      {children}
    </Link>
  );
}
