import type { Lead } from "@/lib/leads";

export const FOLLOWUP1_AFTER_DAYS = 4;
export const FOLLOWUP2_AFTER_DAYS = 7;
const UPCOMING_WINDOW_DAYS = 3;
const DAY = 86_400_000;

export type ReminderLead = Pick<
  Lead,
  "id" | "name" | "location" | "email" | "stage" | "sent_at" | "followup1_at" | "do_not_contact"
>;

export type Reminder = {
  lead: ReminderLead;
  kind: "followup_1" | "followup_2";
  /** Dzień, od którego należy wysłać follow-up */
  dueAt: Date;
  /** Ile dni minęło od poprzedniego maila */
  daysSince: number;
  /** >0 = tyle dni po terminie, <0 = za tyle dni */
  daysOverdue: number;
};

/** Follow-up 1: 4 dni po „Wysłano”. Follow-up 2: 7 dni po follow-upie 1. */
export function computeReminders(leads: ReminderLead[], now = new Date()) {
  const due: Reminder[] = [];
  const upcoming: Reminder[] = [];

  for (const lead of leads) {
    if (lead.do_not_contact) continue;
    let base: string | null = null;
    let kind: Reminder["kind"] | null = null;
    let wait = 0;
    if (lead.stage === "sent" && lead.sent_at) {
      base = lead.sent_at;
      kind = "followup_1";
      wait = FOLLOWUP1_AFTER_DAYS;
    } else if (lead.stage === "followup_1" && lead.followup1_at) {
      base = lead.followup1_at;
      kind = "followup_2";
      wait = FOLLOWUP2_AFTER_DAYS;
    }
    if (!base || !kind) continue;

    const baseDate = new Date(base);
    const dueAt = new Date(baseDate.getTime() + wait * DAY);
    const reminder: Reminder = {
      lead,
      kind,
      dueAt,
      daysSince: Math.floor((now.getTime() - baseDate.getTime()) / DAY),
      daysOverdue: Math.floor((now.getTime() - dueAt.getTime()) / DAY),
    };
    if (dueAt <= now) due.push(reminder);
    else if (dueAt.getTime() - now.getTime() <= UPCOMING_WINDOW_DAYS * DAY) upcoming.push(reminder);
  }

  due.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  upcoming.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  return { due, upcoming };
}

export const REMINDER_COLUMNS = "id,name,location,email,stage,sent_at,followup1_at,do_not_contact";
