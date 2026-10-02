"use client";

import Link from "next/link";
import { useState } from "react";
import { generateEmail } from "@/app/ai-actions";
import type { MessageKind } from "@/lib/messages";

export type BatchItem = { leadId: string; name: string; kind: MessageKind; hasDraft: boolean };

type Status = "waiting" | "running" | "done" | { error: string };

export function TodayBatch({ items }: { items: BatchItem[] }) {
  const todo = items.filter((i) => !i.hasDraft);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setStatus(Object.fromEntries(todo.map((i) => [i.leadId, "waiting" as Status])));
    // Po kolei — żeby nie przekroczyć limitów API i widzieć postęp
    for (const item of todo) {
      setStatus((s) => ({ ...s, [item.leadId]: "running" }));
      let next: Status;
      try {
        const res = await generateEmail(item.leadId, item.kind);
        next = res.error ? { error: res.error } : "done";
      } catch {
        next = { error: "Błąd połączenia." };
      }
      setStatus((s) => ({ ...s, [item.leadId]: next }));
    }
    setRunning(false);
  }

  const started = Object.keys(status).length > 0;
  const done = Object.values(status).filter((s) => s === "done").length;

  return (
    <section className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          {todo.length
            ? `Szkice do przygotowania: ${todo.length} (pozostałe już mają zapisany szkic).`
            : "Wszystkie follow-upy na dziś mają już szkice."}
        </p>
        {todo.length > 0 && (
          <button type="button" className="btn btn-primary" disabled={running} onClick={run}>
            {running
              ? `Claude pisze… ${done}/${todo.length}`
              : started
                ? "Spróbuj ponownie dla pozostałych"
                : "✨ Przygotuj wszystkie follow-upy"}
          </button>
        )}
      </div>
      {started && (
        <ul className="space-y-1 text-sm">
          {todo.map((i) => {
            const s = status[i.leadId];
            return (
              <li key={i.leadId} className="flex flex-wrap justify-between gap-2">
                <Link href={`/leads/${i.leadId}`} className="underline">
                  {i.name}
                </Link>
                <span
                  className={
                    typeof s === "object" ? "text-rose-700" : s === "done" ? "text-emerald-700" : "text-stone-500"
                  }
                >
                  {s === "waiting" && "czeka"}
                  {s === "running" && "pisze…"}
                  {s === "done" && "✓ szkic gotowy"}
                  {typeof s === "object" && s.error}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-stone-500">
        Claude tylko pisze szkice. Przeczytaj każdy i wyślij sam ze swojej poczty, potem kliknij
        „Wysłałem”.
      </p>
    </section>
  );
}
