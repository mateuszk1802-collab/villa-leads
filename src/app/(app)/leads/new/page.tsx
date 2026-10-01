import Link from "next/link";
import { createLead } from "@/app/actions";
import { LeadForm } from "@/components/LeadForm";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/leads" className="text-sm text-stone-500 hover:text-stone-900">
        ← Leady
      </Link>
      <h1 className="text-xl font-semibold">Nowy lead</h1>
      <div className="card p-4 sm:p-6">
        <LeadForm action={createLead} submitLabel="Dodaj lead" showStage />
      </div>
    </div>
  );
}
