"use client";

import { useState, useTransition } from "react";
import { setDoNotContact } from "@/app/actions";
import { formatDate } from "@/lib/leads";

export function DoNotContactToggle({
  id,
  name,
  value,
  since,
}: {
  id: string;
  name: string;
  value: boolean;
  since: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function toggle(next: boolean) {
    const question = next
      ? `Dodać „${name}” do listy „Nie kontaktować”? Przygotowanie wiadomości do tego leada zostanie zablokowane.`
      : `Usunąć „${name}” z listy „Nie kontaktować”? Upewnij się, że ta osoba nie prosiła o wypisanie.`;
    if (!window.confirm(question)) return;
    setError(undefined);
    startTransition(async () => {
      const res = await setDoNotContact(id, next);
      if (res.error) setError(res.error);
    });
  }

  return (
    <section
      className={`card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 ${
        value ? "border-rose-300 bg-rose-50" : ""
      }`}
    >
      <div className="text-sm">
        {value ? (
          <>
            <p className="font-semibold text-rose-800">Nie kontaktować</p>
            <p className="text-rose-700">
              Na liście od {formatDate(since)}. Wiadomości są zablokowane.
            </p>
          </>
        ) : (
          <p className="text-stone-500">
            Ktoś poprosił o wypisanie? Oznacz go — aplikacja zablokuje wiadomości do niego.
          </p>
        )}
        {error && <p className="mt-1 text-rose-700">{error}</p>}
      </div>
      {value ? (
        <button type="button" className="btn" disabled={pending} onClick={() => toggle(false)}>
          {pending ? "Zapisuję…" : "Usuń z listy"}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() => toggle(true)}
        >
          {pending ? "Zapisuję…" : "Wypisał się — nie kontaktować"}
        </button>
      )}
    </section>
  );
}
