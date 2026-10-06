"use client";

import { startTransition, useActionState, useState } from "react";
import { saveSettings } from "@/app/actions";
import {
  DEFAULT_PILOT_OFFER,
  DEFAULT_UNSUBSCRIBE,
  buildFooter,
  footerProblems,
  type Settings,
} from "@/lib/messages";

type Field = {
  name: keyof Settings;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  type?: string;
};

const IDENTITY: Field[] = [
  { name: "sender_name", label: "Imię i nazwisko", placeholder: "Jan Kowalski" },
  { name: "company_name", label: "Nazwa firmy / marki", placeholder: "Villa Motion Studio" },
  { name: "email", label: "E-mail do odpowiedzi", type: "email" },
  { name: "phone", label: "Telefon", type: "tel" },
  { name: "website", label: "Strona www", placeholder: "villamotion.com" },
  { name: "portfolio_url", label: "Link do portfolio / przykładowego wideo" },
  {
    name: "postal_address",
    label: "Adres pocztowy *",
    multiline: true,
    hint: "Wymagany przez CAN-SPAM (może być skrytka pocztowa lub adres firmy).",
  },
];

const FOOTER: Field[] = [
  {
    name: "unsubscribe_text",
    label: "Zdanie o wypisaniu się (po angielsku)",
    placeholder: DEFAULT_UNSUBSCRIBE,
    multiline: true,
    hint: "Puste = zdanie domyślne (podpowiedź w polu).",
  },
  {
    name: "footer",
    label: "Własna stopka (opcjonalnie)",
    multiline: true,
    hint: "Jeśli wpiszesz tu stopkę, zastąpi ona stopkę budowaną automatycznie z danych powyżej. Pamiętaj o adresie i zdaniu o wypisaniu się.",
  },
];

const CLAUDE: Field[] = [
  {
    name: "pilot_offer",
    label: "Cena dla pierwszych klientów (po angielsku)",
    placeholder: DEFAULT_PILOT_OFFER,
    hint: "Puste = „$250 dla pierwszych klientów (zwykła cena $500)”. Pierwszy mail zawsze proponuje darmowe demo bez ceny; cena pojawia się dopiero w follow-upie.",
  },
  {
    name: "offer_text",
    label: "Dodatkowy opis oferty (po angielsku, opcjonalnie)",
    multiline: true,
    placeholder: "e.g. 30–60 second vertical + horizontal versions, delivered in 3 days, one round of revisions.",
  },
  {
    name: "extra_instructions",
    label: "Dodatkowe wskazówki dla Claude (opcjonalnie)",
    multiline: true,
    placeholder: "e.g. Sign off with my first name only. Avoid the word 'stunning'.",
  },
];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const [values, setValues] = useState<Settings>(settings);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  const problems = footerProblems(values);

  function renderField(f: Field) {
    const common = {
      id: f.name,
      name: f.name,
      placeholder: f.placeholder,
      value: values[f.name] ?? "",
      className: "input",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [f.name]: e.target.value })),
    };
    return (
      <div key={f.name}>
        <label className="label" htmlFor={f.name}>
          {f.label}
        </label>
        {f.multiline ? <textarea rows={3} {...common} /> : <input type={f.type ?? "text"} {...common} />}
        {f.hint && <p className="mt-1 text-xs text-stone-500">{f.hint}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="card space-y-4 p-4 sm:p-6">
        <h2 className="font-semibold">Moje dane</h2>
        <div className="grid gap-4 sm:grid-cols-2">{IDENTITY.map(renderField)}</div>
      </section>

      <section className="card space-y-4 p-4 sm:p-6">
        <h2 className="font-semibold">Stopka maila (CAN-SPAM)</h2>
        {FOOTER.map(renderField)}
        <div>
          <span className="label">Podgląd stopki</span>
          <pre className="rounded-lg bg-stone-100 p-3 text-sm whitespace-pre-wrap">
            {buildFooter(values)}
          </pre>
          {problems.length > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Uzupełnij: {problems.join(", ")}.
            </p>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-6">
        <h2 className="font-semibold">Wskazówki dla Claude</h2>
        {CLAUDE.map(renderField)}
      </section>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</p>
      )}
      {state?.saved && !pending && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Zapisano.</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Zapisuję…" : "Zapisz ustawienia"}
      </button>
    </form>
  );
}
