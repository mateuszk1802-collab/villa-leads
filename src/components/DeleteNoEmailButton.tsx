"use client";

import { useState, useTransition } from "react";
import { deleteLeadsWithoutEmail } from "@/app/actions";

export function DeleteNoEmailButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  if (count === 0 && !message) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {count > 0 && (
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                `Usunąć ${count} lead(y) bez e-maila? Dotyczy tylko leadów, do których jeszcze nic nie wysłałeś (etapy Nowy, Sprawdzony, Demo zrobione). Tego nie da się cofnąć.`,
              )
            )
              return;
            startTransition(async () => {
              const res = await deleteLeadsWithoutEmail();
              setMessage(res.error ?? `Usunięto: ${res.deleted}.`);
            });
          }}
        >
          {pending ? "Usuwam…" : `Usuń leady bez e-maila (${count})`}
        </button>
      )}
      {message && <span className="text-sm text-stone-600">{message}</span>}
    </div>
  );
}
