import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLead, updateLead } from "@/app/actions";
import { LeadForm } from "@/components/LeadForm";
import { MessagesPanel } from "@/components/MessagesPanel";
import { StageBadge } from "@/components/StageBadge";
import { StageSelect } from "@/components/StageSelect";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { DoNotContactToggle } from "@/components/DoNotContactToggle";
import { EnrichButton } from "@/components/EnrichButton";
import { LEAD_TYPE_LABEL, formatDate, type Lead } from "@/lib/leads";
import type { LeadMessage } from "@/lib/messages";
import { claudeConfigured } from "@/lib/claude";
import { loadSettings } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";

// „Sprawdź stronę” pobiera kilka stron z odstępem 1 s
export const maxDuration = 60;

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await requireUser();
  const [{ data }, settings, { data: msgs }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    loadSettings(supabase),
    supabase
      .from("lead_messages")
      .select("id,lead_id,kind,subject,body,sent_at,updated_at")
      .eq("lead_id", id),
  ]);
  if (!data) notFound();
  const lead = data as Lead;
  const messages = (msgs ?? []) as LeadMessage[];

  const update = updateLead.bind(null, lead.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-900">
        ← Leady
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words">{lead.name}</h1>
          <p className="text-sm text-stone-500">
            {[
              LEAD_TYPE_LABEL[lead.lead_type],
              lead.location,
              lead.google_rating != null
                ? `★ ${Number(lead.google_rating).toFixed(1)} (${lead.google_reviews ?? 0}) w Google`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {lead.do_not_contact && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-medium text-white">
              Nie kontaktować
            </span>
          )}
          <StageBadge stage={lead.stage} />
        </div>
      </div>

      <section className="card space-y-3 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <span className="label">Etap</span>
            <StageSelect key={lead.stage} id={lead.id} stage={lead.stage} />
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="btn">
                Strona www ↗
              </a>
            )}
            {lead.demo_url && (
              <a href={lead.demo_url} target="_blank" rel="noopener noreferrer" className="btn">
                Demo ↗
              </a>
            )}
            {lead.listing_url && (
              <a href={lead.listing_url} target="_blank" rel="noopener noreferrer" className="btn">
                Oferta ↗
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="btn">
                Zadzwoń
              </a>
            )}
          </div>
        </div>
        {lead.website && (
          <EnrichButton id={lead.id} enrichedAt={lead.enriched_at} note={lead.enrich_note} />
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Info label="Dodano" value={formatDate(lead.created_at)} />
          <Info label="Wysłano" value={formatDate(lead.sent_at)} />
          <Info label="Follow-up 1" value={formatDate(lead.followup1_at)} />
          <Info label="Follow-up 2" value={formatDate(lead.followup2_at)} />
        </dl>
      </section>

      <MessagesPanel
        lead={lead}
        settings={settings}
        messages={messages}
        aiEnabled={claudeConfigured()}
      />

      <DoNotContactToggle
        id={lead.id}
        name={lead.name}
        value={lead.do_not_contact}
        since={lead.do_not_contact_at}
      />

      <section className="card p-4 sm:p-6">
        <h2 className="mb-4 font-semibold">Dane leada</h2>
        <LeadForm action={update} lead={lead} submitLabel="Zapisz zmiany" />
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
        <p className="text-sm text-stone-500">Usunięcie leada jest nieodwracalne.</p>
        <form action={deleteLead}>
          <input type="hidden" name="id" value={lead.id} />
          <ConfirmSubmit
            className="btn btn-danger"
            pendingText="Usuwam…"
            confirmText={`Na pewno usunąć lead „${lead.name}”?`}
          >
            Usuń lead
          </ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
