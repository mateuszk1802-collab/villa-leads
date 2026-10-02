import Link from "next/link";
import { TodayBatch } from "@/components/TodayBatch";
import { claudeConfigured } from "@/lib/claude";
import { formatDate } from "@/lib/leads";
import {
  FOLLOWUP1_AFTER_DAYS,
  FOLLOWUP2_AFTER_DAYS,
  REMINDER_COLUMNS,
  computeReminders,
  type Reminder,
  type ReminderLead,
} from "@/lib/reminders";
import { requireUser } from "@/lib/supabase/server";

export default async function TodayPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("leads")
    .select(REMINDER_COLUMNS)
    .in("stage", ["sent", "followup_1"])
    .eq("do_not_contact", false);

  const { due, upcoming } = computeReminders((data ?? []) as ReminderLead[]);

  // Które follow-upy mają już zapisany szkic (żeby nie pisać ich drugi raz)
  const aiEnabled = claudeConfigured();
  let drafted = new Set<string>();
  if (aiEnabled && due.length) {
    const { data: msgs } = await supabase
      .from("lead_messages")
      .select("lead_id,kind,body")
      .in(
        "lead_id",
        due.map((r) => r.lead.id),
      );
    drafted = new Set(
      (msgs ?? []).filter((m) => m.body?.trim()).map((m) => `${m.lead_id}:${m.kind}`),
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Do zrobienia dziś</h1>
        <p className="text-sm text-stone-500">
          Follow-up 1: {FOLLOWUP1_AFTER_DAYS} dni po wysłaniu. Follow-up 2: {FOLLOWUP2_AFTER_DAYS} dni
          po follow-upie 1. Leady z listy „Nie kontaktować” są pomijane.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Błąd wczytywania: {error.message}
        </p>
      )}

      {aiEnabled && due.length > 0 && (
        <TodayBatch
          items={due.map((r) => ({
            leadId: r.lead.id,
            name: r.lead.name,
            kind: r.kind,
            hasDraft: drafted.has(`${r.lead.id}:${r.kind}`),
          }))}
        />
      )}

      {due.length === 0 ? (
        <div className="card p-8 text-center text-stone-500">
          Na dziś nic do wysłania. 🎉{" "}
          <Link href="/leads?stage=demo_done" className="font-medium text-stone-900 underline">
            Zobacz leady z gotowym demo
          </Link>
        </div>
      ) : (
        <ReminderList items={due} />
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-600">W najbliższych dniach</h2>
          <ReminderList items={upcoming} />
        </section>
      )}
    </div>
  );
}

function ReminderList({ items }: { items: Reminder[] }) {
  return (
    <ul className="card divide-y divide-stone-100">
      {items.map((r) => (
        <li key={r.lead.id}>
          <Link
            href={`/leads/${r.lead.id}`}
            className="flex flex-col gap-1 px-4 py-3 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{r.lead.name}</div>
              <div className="text-sm text-stone-500">
                {r.kind === "followup_1" ? "Wysłano" : "Follow-up 1 wysłany"} {daysAgo(r.daysSince)}
                {r.lead.location ? ` · ${r.lead.location}` : ""}
                {!r.lead.email ? " · brak e-maila" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.kind === "followup_1"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-orange-200 text-orange-900"
                }`}
              >
                {r.kind === "followup_1" ? "Follow-up 1" : "Follow-up 2"}
              </span>
              <span className="text-xs text-stone-500">
                {r.daysOverdue > 0
                  ? `${days(r.daysOverdue)} po terminie`
                  : r.dueAt <= new Date()
                    ? "dziś"
                    : `od ${formatDate(r.dueAt.toISOString())}`}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function days(n: number) {
  return n === 1 ? "1 dzień" : `${n} dni`;
}

function daysAgo(n: number) {
  if (n <= 0) return "dziś";
  if (n === 1) return "wczoraj";
  return `${n} dni temu`;
}
