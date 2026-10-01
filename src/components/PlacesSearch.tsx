"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { enrichLead, type EnrichSummary } from "@/app/enrich-actions";
import { addPlaces, runPlacesSearch, type SearchRow } from "@/app/places-actions";
import { HAS_VIDEO_LABEL } from "@/lib/leads";

const DEFAULT_QUERIES = ["luxury vacation rental management", "luxury villa rentals"];
const REGION_KEY = "villa-leads:last-region";

type Added = { id: string; enrich?: "waiting" | "running" | EnrichSummary; hasWebsite: boolean };

export function PlacesSearch() {
  const [region, setRegion] = useState("");
  const [query, setQuery] = useState(DEFAULT_QUERIES[0]);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Record<string, Added>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<"search" | "more" | "add" | null>(null);
  const [searched, setSearched] = useState(false);

  // Ostatni region z pamięci przeglądarki — po załadowaniu, żeby nie psuć renderowania na serwerze
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setRegion(saved);
    } catch {}
  }, []);

  async function search(more = false) {
    setBusy(more ? "more" : "search");
    setError(undefined);
    try {
      localStorage.setItem(REGION_KEY, region);
    } catch {}
    try {
      const res = await runPlacesSearch(region, query, more ? (next ?? undefined) : undefined);
      if (res.error) setError(res.error);
      if (more) setRows((r) => [...r, ...res.rows.filter((x) => !r.some((y) => y.placeId === x.placeId))]);
      else {
        setRows(res.rows);
        setSelected(new Set());
        setAdded({});
      }
      setNext(res.nextPageToken);
      setSearched(true);
    } catch {
      setError("Błąd połączenia z aplikacją. Spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  }

  const selectable = (r: SearchRow) => !r.existingId && !added[r.placeId];

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function addSelected() {
    const items = rows.filter((r) => selected.has(r.placeId) && selectable(r));
    if (!items.length) return;
    setBusy("add");
    setError(undefined);
    try {
      const res = await addPlaces(items);
      if (res.error) setError(res.error);
      const map: Record<string, Added> = {};
      for (const c of res.created)
        map[c.placeId] = { id: c.id, hasWebsite: c.hasWebsite, enrich: c.hasWebsite ? "waiting" : undefined };
      setAdded((a) => ({ ...a, ...map }));
      setSelected(new Set());
      // Wzbogacanie po kolei (serwer trzyma odstęp 1 zapytania na sekundę)
      for (const c of res.created) {
        if (!c.hasWebsite) continue;
        setAdded((a) => ({ ...a, [c.placeId]: { ...a[c.placeId], enrich: "running" } }));
        let summary: EnrichSummary;
        try {
          summary = await enrichLead(c.id);
        } catch {
          summary = { error: "Błąd połączenia." };
        }
        setAdded((a) => ({ ...a, [c.placeId]: { ...a[c.placeId], enrich: summary } }));
      }
    } catch {
      setError("Nie udało się dodać. Spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  }

  const newWithWebsite = rows.filter((r) => selectable(r) && r.website);

  return (
    <div className="space-y-4">
      <form
        className="card space-y-3 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          search(false);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="region">
              Region
            </label>
            <input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="np. Scottsdale, AZ"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="query">
              Hasło
            </label>
            <input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuery(q)}
              className={`rounded-full border px-3 py-1 text-xs ${
                query === q ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy !== null} className="btn btn-primary w-full sm:w-auto">
          {busy === "search" ? "Szukam…" : "Szukaj w Google"}
        </button>
        <p className="text-xs text-stone-500">
          Każde kliknięcie „Szukaj” lub „Więcej wyników” to 1 zapytanie do Google (do 20 firm).
        </p>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      </form>

      {searched && rows.length === 0 && !error && (
        <div className="card p-6 text-center text-stone-500">Brak wyników. Zmień hasło lub region.</div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-stone-600">
              Wyników: {rows.length} · nowych z www: {newWithWebsite.length}
            </p>
            <button
              type="button"
              className="text-sm font-medium underline"
              onClick={() => setSelected(new Set(newWithWebsite.map((r) => r.placeId)))}
            >
              Zaznacz wszystkie nowe z www
            </button>
          </div>

          <ul className="card divide-y divide-stone-100">
            {rows.map((r) => {
              const a = added[r.placeId];
              const canSelect = selectable(r);
              return (
                <li key={r.placeId} className="flex gap-3 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    aria-label={`Wybierz ${r.name}`}
                    className="mt-1 h-5 w-5 shrink-0"
                    disabled={!canSelect}
                    checked={selected.has(r.placeId)}
                    onChange={() => toggle(r.placeId)}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {r.rating != null && (
                        <span className="text-xs text-stone-500">
                          ★ {r.rating.toFixed(1)} ({r.reviews ?? 0})
                        </span>
                      )}
                    </div>
                    <div className="truncate text-stone-500">{r.address}</div>
                    <div className="flex flex-wrap gap-x-3 text-xs">
                      {r.website ? (
                        <a href={r.website} target="_blank" rel="noopener noreferrer" className="underline">
                          {r.domain}
                        </a>
                      ) : (
                        <span className="text-amber-700">
                          {r.blockedWebsite ? "www to Airbnb/VRBO/Booking" : "brak strony www"}
                        </span>
                      )}
                      {r.mapsUrl && (
                        <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-stone-500 underline">
                          Mapy Google
                        </a>
                      )}
                    </div>
                    {r.existingId && (
                      <p className="text-xs text-stone-500">
                        Już w bazie —{" "}
                        <Link href={`/leads/${r.existingId}`} className="underline">
                          otwórz
                        </Link>
                      </p>
                    )}
                    {a && <AddedLine added={a} />}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-16 z-10 flex flex-wrap gap-2 md:bottom-4">
            <button
              type="button"
              className="btn btn-primary flex-1 shadow-lg sm:flex-none"
              disabled={busy !== null || selected.size === 0}
              onClick={addSelected}
            >
              {busy === "add" ? "Dodaję i sprawdzam strony…" : `Dodaj zaznaczone (${selected.size})`}
            </button>
            {next && (
              <button
                type="button"
                className="btn shadow-lg"
                disabled={busy !== null}
                onClick={() => search(true)}
              >
                {busy === "more" ? "Ładuję…" : "Więcej wyników"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddedLine({ added }: { added: Added }) {
  const e = added.enrich;
  return (
    <p className="text-xs text-emerald-700">
      ✓ Dodano —{" "}
      <Link href={`/leads/${added.id}`} className="underline">
        otwórz lead
      </Link>
      {!added.hasWebsite && " (bez www, nie sprawdzam strony)"}
      {e === "waiting" && " · czeka na sprawdzenie strony"}
      {e === "running" && " · sprawdzam stronę…"}
      {e && typeof e === "object" &&
        (e.error
          ? ` · ${e.error}`
          : ` · ${e.email ? `✉ ${e.email}` : "✉ nie znaleziono"} · wideo: ${
              e.hasVideo ? HAS_VIDEO_LABEL[e.hasVideo].toLowerCase() : "?"
            }`)}
    </p>
  );
}
