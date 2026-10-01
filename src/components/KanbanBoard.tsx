"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setStage } from "@/app/actions";
import { STAGES, STAGE_COLOR, type Lead, type Stage } from "@/lib/leads";

export type KanbanLead = Pick<Lead, "id" | "name" | "location" | "domain" | "email" | "stage" | "do_not_contact">;

export function KanbanBoard({ leads: initial }: { leads: KanbanLead[] }) {
  const [leads, setLeads] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  function move(id: string, stage: Stage) {
    const prev = leads;
    const lead = prev.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    setError(undefined);
    setLeads(prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    startTransition(async () => {
      const res = await setStage(id, stage);
      if (res.error) {
        setLeads(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
        {STAGES.map((s) => {
          const items = leads.filter((l) => l.stage === s.key);
          return (
            <section
              key={s.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(s.key);
              }}
              onDragLeave={() => setOverStage((cur) => (cur === s.key ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                if (id) move(id, s.key);
                setDragId(null);
                setOverStage(null);
              }}
              className={`flex w-[80vw] max-w-72 shrink-0 snap-start flex-col rounded-xl border bg-stone-100/70 sm:w-64 ${
                overStage === s.key ? "border-stone-500" : "border-stone-200"
              }`}
            >
              <header className="flex items-center justify-between px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLOR[s.key]}`}>
                  {s.label}
                </span>
                <span className="text-xs text-stone-500">{items.length}</span>
              </header>
              <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {items.map((l) => (
                  <li
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", l.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(l.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    className={`card cursor-grab p-3 active:cursor-grabbing ${
                      dragId === l.id ? "opacity-50" : ""
                    }`}
                  >
                    <Link href={`/leads/${l.id}`} className="block font-medium hover:underline">
                      {l.name}
                    </Link>
                    <p className="truncate text-xs text-stone-500">
                      {[l.location, l.domain].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {l.do_not_contact ? (
                      <p className="text-xs font-medium text-rose-700">Nie kontaktować</p>
                    ) : (
                      !l.email && <p className="text-xs text-amber-700">Brak e-maila</p>
                    )}
                    <select
                      aria-label="Przenieś do etapu"
                      value={l.stage}
                      onChange={(e) => move(l.id, e.target.value as Stage)}
                      className="mt-2 w-full rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs"
                    >
                      {STAGES.map((o) => (
                        <option key={o.key} value={o.key}>
                          → {o.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
