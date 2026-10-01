"use client";

import Link from "next/link";
import { useState } from "react";
import { enrichLead, importUrls, type EnrichSummary, type ImportRow } from "@/app/enrich-actions";
import { HAS_VIDEO_LABEL } from "@/lib/leads";

type EnrichState = { status: "waiting" | "running" | "done"; summary?: EnrichSummary };

export function ImportForm() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [enrich, setEnrich] = useState<Record<string, EnrichState>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const created = rows.filter((r): r is Extract<ImportRow, { status: "created" }> => r.status === "created");
  const doneCount = created.filter((r) => enrich[r.id]?.status === "done").length;

  async function run() {
    setBusy(true);
    setError(undefined);
    setRows([]);
    setEnrich({});
    try {
      const res = await importUrls(text);
      if (res.error) setError(res.error);
      setRows(res.rows);
      const ids = res.rows.flatMap((r) => (r.status === "created" ? [r.id] : []));
      setEnrich(Object.fromEntries(ids.map((id) => [id, { status: "waiting" }])));
      // Po kolei — serwer i tak trzyma odstęp 1 zapytania na sekundę
      for (const id of ids) {
        setEnrich((s) => ({ ...s, [id]: { status: "running" } }));
        let summary: EnrichSummary;
        try {
          summary = await enrichLead(id);
        } catch {
          summary = { error: "Błąd połączenia z aplikacją." };
        }
        setEnrich((s) => ({ ...s, [id]: { status: "done", summary } }));
      }
      if (ids.length) setText("");
    } catch {
      setError("Nie udało się dodać adresów. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4 sm:p-6">
        <label className="label" htmlFor="urls">
          Adresy www (każdy w nowej linii, maks. 50)
        </label>
        <textarea
          id="urls"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"desertluxevillas.com\nhttps://www.malibuluxuryrentals.com\n…"}
          className="input font-mono text-sm"
          disabled={busy}
        />
        <p className="text-xs text-stone-500">
          Dla każdego nowego adresu aplikacja pobierze publiczną stronę główną i podstronę kontaktową:
          szuka e-maila i sprawdza, czy jest wideo (YouTube, Vimeo, &lt;video&gt;). Szanuje robots.txt,
          maks. 1 zapytanie na sekundę, nic nie pobiera z Airbnb, VRBO ani Booking.
        </p>
        <button
          type="button"
          onClick={run}
          disabled={busy || !text.trim()}
          className="btn btn-primary w-full sm:w-auto"
        >
          {busy
            ? created.length
              ? `Sprawdzam strony… ${doneCount}/${created.length}`
              : "Dodaję…"
            : "Dodaj i sprawdź strony"}
        </button>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      </div>

      {rows.length > 0 && (
        <ul className="card divide-y divide-stone-100">
          {rows.map((r, i) => (
            <li key={i} className="space-y-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono break-all">{r.input}</span>
                <RowBadge row={r} state={r.status === "created" ? enrich[r.id] : undefined} />
              </div>
              {r.status === "skipped" && <p className="text-stone-500">{r.reason}</p>}
              {r.status === "duplicate" && (
                <p className="text-stone-500">
                  {r.id ? (
                    <>
                      Już jest w bazie —{" "}
                      <Link href={`/leads/${r.id}`} className="underline">
                        otwórz lead
                      </Link>
                    </>
                  ) : (
                    "Powtórzony na liście"
                  )}
                </p>
              )}
              {r.status === "created" && <EnrichLine id={r.id} state={enrich[r.id]} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RowBadge({ row, state }: { row: ImportRow; state?: EnrichState }) {
  const map = {
    created: "bg-emerald-100 text-emerald-800",
    duplicate: "bg-stone-100 text-stone-700",
    skipped: "bg-amber-100 text-amber-800",
  } as const;
  const label =
    row.status === "created"
      ? state?.status === "running"
        ? "Sprawdzam…"
        : state?.status === "done"
          ? "Dodano"
          : "Dodano · czeka"
      : row.status === "duplicate"
        ? "Duplikat"
        : "Pominięto";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[row.status]}`}>{label}</span>;
}

function EnrichLine({ id, state }: { id: string; state?: EnrichState }) {
  const s = state?.summary;
  if (!s) return null;
  if (s.error) return <p className="text-rose-700">{s.error}</p>;
  return (
    <p className="text-stone-600">
      <Link href={`/leads/${id}`} className="font-medium text-stone-900 underline">
        {s.name}
      </Link>{" "}
      · {s.email ? `✉ ${s.email}` : "✉ nie znaleziono"} · Wideo:{" "}
      {s.hasVideo ? HAS_VIDEO_LABEL[s.hasVideo].toLowerCase() : "?"}
    </p>
  );
}
