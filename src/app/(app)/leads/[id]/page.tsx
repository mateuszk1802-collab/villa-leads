import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLead, updateLead } from "@/app/actions";
import { LeadForm } from "@/components/LeadForm";
import { StageBadge } from "@/components/StageBadge";
import { StageSelect } from "@/components/StageSelect";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { LEAD_TYPE_LABEL, formatDate, type Lead } from "@/lib/leads";
import { requireUser } from "@/lib/supabase/server";

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await requireUser();
  const { data } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const lead = data as Lead;

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
            {[LEAD_TYPE_LABEL[lead.lead_type], lead.location].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StageBadge stage={lead.stage} />
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
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Info label="Dodano" value={formatDate(lead.created_at)} />
          <Info label="Wysłano" value={formatDate(lead.sent_at)} />
          <Info label="Follow-up 1" value={formatDate(lead.followup1_at)} />
          <Info label="Follow-up 2" value={formatDate(lead.followup2_at)} />
        </dl>
      </section>

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
