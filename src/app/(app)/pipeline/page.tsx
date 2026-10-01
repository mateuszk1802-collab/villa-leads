import { KanbanBoard, type KanbanLead } from "@/components/KanbanBoard";
import { requireUser } from "@/lib/supabase/server";

export default async function PipelinePage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("leads")
    .select("id,name,location,domain,email,stage,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1000);

  const leads = (data ?? []) as KanbanLead[];
  // key wymusza odświeżenie stanu tablicy po zmianach z serwera
  const key = leads.map((l) => `${l.id}:${l.stage}`).join("|");

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">Pipeline</h1>
        <p className="text-sm text-stone-500">
          Przeciągnij kartę do innej kolumny albo wybierz etap z listy na karcie.
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Błąd wczytywania: {error.message}
        </p>
      )}
      <KanbanBoard key={key} leads={leads} />
    </div>
  );
}
