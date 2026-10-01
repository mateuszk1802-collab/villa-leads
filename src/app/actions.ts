"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { isMessageKind, kindInfo, type MessageKind } from "@/lib/messages";
import {
  STAGE_DATE_COLUMN,
  domainFromUrl,
  isHasVideo,
  isLeadType,
  isStage,
  normalizeUrl,
  type Stage,
} from "@/lib/leads";

export type FormState = { error?: string; duplicateId?: string; saved?: boolean } | undefined;

function text(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function parseLeadForm(formData: FormData) {
  const name = text(formData, "name");
  if (!name) return { error: "Podaj nazwę firmy lub obiektu." } as const;

  const websiteRaw = text(formData, "website");
  const website = normalizeUrl(websiteRaw);
  if (websiteRaw && !website) return { error: "Niepoprawny adres strony www." } as const;

  const listingRaw = text(formData, "listing_url");
  const listing_url = normalizeUrl(listingRaw);
  if (listingRaw && !listing_url) return { error: "Niepoprawny link do oferty." } as const;

  const demoRaw = text(formData, "demo_url");
  const demo_url = normalizeUrl(demoRaw);
  if (demoRaw && !demo_url) return { error: "Niepoprawny link do demo." } as const;

  const email = text(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Niepoprawny adres e-mail." } as const;

  const countRaw = text(formData, "property_count");
  let property_count: number | null = null;
  if (countRaw) {
    property_count = Number(countRaw);
    if (!Number.isInteger(property_count) || property_count < 0)
      return { error: "Liczba obiektów musi być liczbą całkowitą ≥ 0." } as const;
  }

  const lead_type = formData.get("lead_type");
  const has_video = formData.get("has_video");

  return {
    data: {
      name,
      lead_type: isLeadType(lead_type) ? lead_type : "management_company",
      location: text(formData, "location"),
      website,
      domain: domainFromUrl(website),
      email,
      phone: text(formData, "phone"),
      listing_url,
      demo_url,
      property_count,
      has_video: isHasVideo(has_video) ? has_video : "unknown",
      notes: text(formData, "notes"),
    },
  } as const;
}

async function findDuplicate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  domain: string | null,
  exceptId?: string,
) {
  if (!domain) return null;
  let q = supabase.from("leads").select("id").eq("domain", domain).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return data?.[0]?.id ?? null;
}

export async function createLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const parsed = parseLeadForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const dup = await findDuplicate(supabase, parsed.data.domain);
  if (dup) return { error: "Lead z tą domeną już istnieje.", duplicateId: dup };

  const stage = formData.get("stage");
  const insert: Record<string, unknown> = { ...parsed.data };
  if (isStage(stage)) {
    insert.stage = stage;
    const col = STAGE_DATE_COLUMN[stage];
    if (col) insert[col] = new Date().toISOString();
  }

  const { data, error } = await supabase.from("leads").insert(insert).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "Lead z tą domeną już istnieje." };
    return { error: `Błąd zapisu: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const parsed = parseLeadForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const dup = await findDuplicate(supabase, parsed.data.domain, id);
  if (dup) return { error: "Inny lead ma już tę domenę.", duplicateId: dup };

  const { error } = await supabase.from("leads").update(parsed.data).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Inny lead ma już tę domenę." };
    return { error: `Błąd zapisu: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { saved: true };
}

export async function setStage(id: string, stage: Stage): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  if (!isStage(stage)) return { error: "Nieznany etap." };

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { stage, stage_changed_at: now };
  const col = STAGE_DATE_COLUMN[stage];
  if (col) update[col] = now;

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) return { error: `Błąd zapisu: ${error.message}` };

  revalidatePath("/", "layout");
  return {};
}

export async function deleteLead(formData: FormData) {
  const { supabase } = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await supabase.from("leads").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/leads");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const demoRaw = text(formData, "demo_url");
  const demo_url = normalizeUrl(demoRaw);
  if (demoRaw && !demo_url) return { error: "Niepoprawny link do demo." } as const;

  const email = text(formData, "email");
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password)
    return { error: "Podaj e-mail i hasło." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return { error: "Nieprawidłowy e-mail lub hasło." };
    if (error.code === "email_not_confirmed")
      return { error: "E-mail niepotwierdzony — w Supabase zaznacz „Auto Confirm User”." };
    return { error: `Błąd logowania (sprawdź konfigurację Supabase): ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/leads");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const SETTINGS_FIELDS = [
  "sender_name",
  "company_name",
  "email",
  "phone",
  "website",
  "portfolio_url",
  "postal_address",
  "unsubscribe_text",
  "footer",
  "offer_text",
  "extra_instructions",
] as const;

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const row: Record<string, string | null> = {};
  for (const f of SETTINGS_FIELDS) row[f] = text(formData, f);

  const email = row.email;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Niepoprawny adres e-mail." };

  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: userId, ...row }, { onConflict: "user_id" });
  if (error) return { error: `Błąd zapisu: ${error.message}` };

  revalidatePath("/", "layout");
  return { saved: true };
}

async function assertContactAllowed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
) {
  const { data } = await supabase
    .from("leads")
    .select("id,do_not_contact")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return "Nie znaleziono leada.";
  if (data.do_not_contact) return "Ten lead jest na liście „Nie kontaktować”.";
  return null;
}

export async function saveMessage(
  leadId: string,
  kind: MessageKind,
  subject: string,
  body: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  if (!isMessageKind(kind)) return { error: "Nieznany typ wiadomości." };
  const blocked = await assertContactAllowed(supabase, leadId);
  if (blocked) return { error: blocked };

  const { error } = await supabase.from("lead_messages").upsert(
    {
      lead_id: leadId,
      kind,
      subject: subject.trim() || null,
      body: body.trim() || null,
    },
    { onConflict: "lead_id,kind" },
  );
  if (error) return { error: `Błąd zapisu: ${error.message}` };

  revalidatePath(`/leads/${leadId}`);
  return {};
}

/** „Wysłałem”: zapisuje datę wysłania i przesuwa lead na odpowiedni etap. Nic nie wysyła. */
export async function markSent(leadId: string, kind: MessageKind): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  if (!isMessageKind(kind)) return { error: "Nieznany typ wiadomości." };
  const blocked = await assertContactAllowed(supabase, leadId);
  if (blocked) return { error: blocked };

  const now = new Date().toISOString();
  const { error: msgError } = await supabase
    .from("lead_messages")
    .upsert({ lead_id: leadId, kind, sent_at: now }, { onConflict: "lead_id,kind" });
  if (msgError) return { error: `Błąd zapisu: ${msgError.message}` };

  const stage = kindInfo(kind).nextStage;
  const update: Record<string, unknown> = { stage, stage_changed_at: now };
  const col = STAGE_DATE_COLUMN[stage];
  if (col) update[col] = now;
  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) return { error: `Błąd zapisu: ${error.message}` };

  revalidatePath("/", "layout");
  return {};
}
