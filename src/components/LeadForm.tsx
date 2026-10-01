"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions";
import { HAS_VIDEO, LEAD_TYPES, STAGES, type Lead } from "@/lib/leads";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  lead?: Lead;
  submitLabel: string;
  showStage?: boolean;
};

export function LeadForm({ action, lead, submitLabel, showStage }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Wywołujemy akcję ręcznie (zamiast <form action>), żeby React nie czyścił pól
  // formularza, gdy zapis się nie uda.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nazwa firmy / obiektu *" htmlFor="name">
        <input id="name" name="name" required defaultValue={lead?.name} className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typ" htmlFor="lead_type">
          <select id="lead_type" name="lead_type" defaultValue={lead?.lead_type} className="input">
            {LEAD_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lokalizacja" htmlFor="location">
          <input
            id="location"
            name="location"
            placeholder="np. Scottsdale, AZ"
            defaultValue={lead?.location ?? ""}
            className="input"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Strona www" htmlFor="website">
          <input
            id="website"
            name="website"
            inputMode="url"
            placeholder="example.com"
            defaultValue={lead?.website ?? ""}
            className="input"
          />
        </Field>
        <Field label="Link do oferty (np. Airbnb)" htmlFor="listing_url">
          <input
            id="listing_url"
            name="listing_url"
            inputMode="url"
            placeholder="https://www.airbnb.com/rooms/…"
            defaultValue={lead?.listing_url ?? ""}
            className="input"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={lead?.email ?? ""}
            className="input"
          />
        </Field>
        <Field label="Telefon" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={lead?.phone ?? ""}
            className="input"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Liczba obiektów (jeśli znana)" htmlFor="property_count">
          <input
            id="property_count"
            name="property_count"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={lead?.property_count ?? ""}
            className="input"
          />
        </Field>
        <Field label="Mają już wideo na stronie?" htmlFor="has_video">
          <select id="has_video" name="has_video" defaultValue={lead?.has_video} className="input">
            {HAS_VIDEO.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Link do demo wideo (jeśli już zrobione)" htmlFor="demo_url">
        <input
          id="demo_url"
          name="demo_url"
          inputMode="url"
          placeholder="https://youtu.be/… albo link do Dysku"
          defaultValue={lead?.demo_url ?? ""}
          className="input"
        />
      </Field>

      {showStage && (
        <Field label="Etap" htmlFor="stage">
          <select id="stage" name="stage" defaultValue="new" className="input">
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Notatki (np. co widać na ich zdjęciach)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={5}
          defaultValue={lead?.notes ?? ""}
          className="input"
        />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.error}{" "}
          {state.duplicateId && (
            <Link href={`/leads/${state.duplicateId}`} className="font-medium underline">
              Otwórz istniejący lead
            </Link>
          )}
        </p>
      )}
      {state?.saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Zapisano.</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Zapisuję…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
