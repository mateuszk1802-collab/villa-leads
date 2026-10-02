"use server";

import { revalidatePath } from "next/cache";
import { claudeConfigured, writeEmailWithClaude } from "@/lib/claude";
import type { Lead } from "@/lib/leads";
import {
  buildFooter,
  buildPrompt,
  hasFooter,
  isMessageKind,
  type LeadMessage,
  type MessageKind,
} from "@/lib/messages";
import { loadSettings } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";

export type GeneratedEmail = { subject?: string; body?: string; error?: string };

/**
 * Pisze maila przez Claude i zapisuje go jako szkic przy leadzie.
 * Aplikacja niczego nie wysyła — wysyłasz sam ze swojej poczty.
 */
export async function generateEmail(leadId: string, kind: MessageKind): Promise<GeneratedEmail> {
  const { supabase } = await requireUser();
  if (!claudeConfigured()) return { error: "Brak klucza ANTHROPIC_API_KEY w Vercel." };
  if (!isMessageKind(kind)) return { error: "Nieznany typ wiadomości." };

  const [{ data: lead }, settings, { data: msgs }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
    loadSettings(supabase),
    supabase
      .from("lead_messages")
      .select("id,lead_id,kind,subject,body,sent_at,updated_at")
      .eq("lead_id", leadId),
  ]);
  if (!lead) return { error: "Nie znaleziono leada." };
  if (lead.do_not_contact) return { error: "Ten lead jest na liście „Nie kontaktować”." };
  if ((msgs ?? []).some((m) => m.kind === kind && m.sent_at))
    return { error: "Ten mail został już wysłany — nie nadpisuję go." };

  const prompt = buildPrompt({
    lead: lead as Lead,
    settings,
    kind,
    previous: (msgs ?? []) as LeadMessage[],
    mode: "api",
  });

  let email: { subject: string; body: string };
  try {
    email = await writeEmailWithClaude(prompt);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Błąd Claude API." };
  }

  // Stopka CAN-SPAM musi być zawsze — dopisujemy, jeśli Claude ją pominął
  const body = hasFooter(email.body, settings)
    ? email.body
    : `${email.body.trimEnd()}\n\n${buildFooter(settings)}`;

  const { error } = await supabase
    .from("lead_messages")
    .upsert({ lead_id: leadId, kind, subject: email.subject, body }, { onConflict: "lead_id,kind" });
  if (error) return { error: `Mail napisany, ale nie udało się go zapisać: ${error.message}` };

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/today");
  return { subject: email.subject, body };
}
