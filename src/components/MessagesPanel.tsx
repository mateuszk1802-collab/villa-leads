"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { markSent, saveMessage } from "@/app/actions";
import { formatDate, type Lead } from "@/lib/leads";
import {
  MESSAGE_KINDS,
  buildFooter,
  buildPrompt,
  footerProblems,
  hasFooter,
  kindInfo,
  mailtoHref,
  splitSubject,
  suggestedKind,
  type LeadMessage,
  type MessageKind,
  type Settings,
} from "@/lib/messages";
import { STAGE_LABEL } from "@/lib/leads";

type Draft = { subject: string; body: string };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Starsze przeglądarki / brak uprawnień — klasyczny sposób
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export function MessagesPanel({
  lead,
  settings,
  messages,
}: {
  lead: Lead;
  settings: Settings;
  messages: LeadMessage[];
}) {
  const [kind, setKind] = useState<MessageKind>(suggestedKind(lead.stage));
  const [drafts, setDrafts] = useState<Record<MessageKind, Draft>>(() => {
    const init = {} as Record<MessageKind, Draft>;
    for (const k of MESSAGE_KINDS) {
      const m = messages.find((x) => x.kind === k.key);
      init[k.key] = { subject: m?.subject ?? "", body: m?.body ?? "" };
    }
    return init;
  });
  const [flash, setFlash] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const saved = messages.find((m) => m.kind === kind);
  const draft = drafts[kind];
  const dirty = draft.subject !== (saved?.subject ?? "") || draft.body !== (saved?.body ?? "");
  const hasContent = draft.body.trim().length > 0;
  const footerMissing = hasContent && !hasFooter(draft.body, settings);
  const problems = footerProblems(settings);

  const prompt = useMemo(
    () => buildPrompt({ lead, settings, kind, previous: messages }),
    [lead, settings, kind, messages],
  );

  function notify(msg: string) {
    setFlash(msg);
    setError(undefined);
    window.setTimeout(() => setFlash((cur) => (cur === msg ? undefined : cur)), 2500);
  }

  function update(patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [kind]: { ...d[kind], ...patch } }));
  }

  function onBodyChange(value: string) {
    // Jeśli wklejono całą odpowiedź Claude z linią „Subject: …”, rozdzielamy ją
    const { subject, body } = splitSubject(value);
    if (subject) update({ subject, body });
    else update({ body: value });
  }

  async function onCopy(text: string, label: string) {
    if (await copyText(text)) notify(`Skopiowano: ${label}`);
    else setError("Nie udało się skopiować — zaznacz tekst ręcznie.");
  }

  function save(then?: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const res = await saveMessage(lead.id, kind, draft.subject, draft.body);
      if (res.error) return setError(res.error);
      if (then) {
        const res2 = await then();
        if (res2.error) return setError(res2.error);
        notify(`Zapisano wysłanie. Etap: ${STAGE_LABEL[kindInfo(kind).nextStage]}`);
      } else {
        notify("Zapisano maila.");
      }
    });
  }

  if (lead.do_not_contact) {
    return (
      <section className="card p-4 sm:p-6">
        <h2 className="mb-2 font-semibold">Wiadomości</h2>
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Ten lead jest na liście „Nie kontaktować” — przygotowanie wiadomości jest zablokowane.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-5 p-4 sm:p-6">
      <div className="space-y-3">
        <h2 className="font-semibold">Wiadomości</h2>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
          {MESSAGE_KINDS.map((k) => {
            const m = messages.find((x) => x.kind === k.key);
            return (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`rounded-md px-2 py-2 text-xs font-medium sm:text-sm ${
                  kind === k.key ? "bg-white shadow-sm" : "text-stone-600"
                }`}
              >
                {k.label}
                {m?.sent_at ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        {saved?.sent_at && (
          <p className="text-sm text-emerald-700">Wysłano {formatDate(saved.sent_at)}.</p>
        )}
        {!lead.email && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ten lead nie ma adresu e-mail — uzupełnij go w danych poniżej, żeby „Otwórz w poczcie”
            wpisało odbiorcę.
          </p>
        )}
        {problems.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Stopka niekompletna (brakuje: {problems.join(", ")}).{" "}
            <Link href="/settings" className="font-medium underline">
              Uzupełnij w Ustawieniach
            </Link>
          </p>
        )}
      </div>

      {/* Krok 1 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-stone-700">1. Poproś Claude o maila</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onCopy(prompt, "prompt dla Claude")}
          >
            Kopiuj prompt dla Claude
          </button>
          <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="btn">
            Otwórz Claude ↗
          </a>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-500">Pokaż prompt</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-stone-100 p-3 text-xs whitespace-pre-wrap">
            {prompt}
          </pre>
        </details>
      </div>

      {/* Krok 2 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700">2. Wklej gotowego maila</h3>
        <div>
          <label className="label" htmlFor="msg-body">
            Treść (możesz wkleić całą odpowiedź Claude — temat rozpoznam sam)
          </label>
          <textarea
            id="msg-body"
            rows={10}
            value={draft.body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="input font-mono text-sm"
            placeholder={"Subject: …\n\nHi …"}
          />
        </div>
        <div>
          <label className="label" htmlFor="msg-subject">
            Temat
          </label>
          <input
            id="msg-subject"
            value={draft.subject}
            onChange={(e) => update({ subject: e.target.value })}
            className="input"
          />
        </div>
        {footerMissing && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>W treści nie ma stopki ze zdaniem o wypisaniu się.</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => update({ body: `${draft.body.trimEnd()}\n\n${buildFooter(settings)}` })}
            >
              Dopisz stopkę
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn"
            disabled={pending || !dirty}
            onClick={() => save()}
          >
            {pending ? "Zapisuję…" : "Zapisz maila"}
          </button>
          {dirty && <span className="text-xs text-amber-700">Niezapisane zmiany</span>}
        </div>
      </div>

      {/* Krok 3 */}
      {hasContent && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-700">3. Wyślij ręcznie ze swojej poczty</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => onCopy(draft.body, "treść")}>
              Kopiuj treść
            </button>
            <button
              type="button"
              className="btn"
              disabled={!draft.subject}
              onClick={() => onCopy(draft.subject, "temat")}
            >
              Kopiuj temat
            </button>
            <a href={mailtoHref(lead.email, draft.subject, draft.body)} className="btn">
              Otwórz w poczcie
            </a>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() => save(() => markSent(lead.id, kind))}
            >
              Wysłałem
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Aplikacja nic nie wysyła sama. „Wysłałem” zapisuje datę i przesuwa lead na etap „
            {STAGE_LABEL[kindInfo(kind).nextStage]}”.
          </p>
        </div>
      )}

      {flash && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash}</p>
      )}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
    </section>
  );
}
