"use client";

import { useState, useTransition } from "react";
import { enrichLead, type EnrichSummary } from "@/app/enrich-actions";
import { formatDate } from "@/lib/leads";

export function EnrichButton({
  id,
  enrichedAt,
  note,
}: {
  id: string;
  enrichedAt: string | null;
  note: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<EnrichSummary>();

  const shownNote = result?.note ?? note;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await enrichLead(id));
            })
          }
        >
          {pending ? "Sprawdzam stronę…" : "Sprawdź stronę (e-mail, wideo)"}
        </button>
        {enrichedAt && !pending && (
          <span className="text-xs text-stone-500">Ostatnio: {formatDate(enrichedAt)}</span>
        )}
      </div>
      {result?.error && <p className="text-sm text-rose-700">{result.error}</p>}
      {result && !result.error && (
        <p className="text-sm text-emerald-700">
          {result.emailUpdated
            ? `Dodano e-mail: ${result.email}.`
            : result.email
              ? `Znaleziony e-mail: ${result.email} (zostawiłem obecny).`
              : "Nie znaleziono e-maila."}
        </p>
      )}
      {shownNote && !pending && (
        <details className="text-xs text-stone-500">
          <summary className="cursor-pointer">Szczegóły sprawdzenia</summary>
          <pre className="mt-1 whitespace-pre-wrap">{shownNote}</pre>
        </details>
      )}
    </div>
  );
}
