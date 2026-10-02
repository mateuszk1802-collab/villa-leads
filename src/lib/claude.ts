import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-sonnet-5-5";

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const EMAIL_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Email subject line" },
    body: { type: "string", description: "Full email text including the footer" },
  },
  required: ["subject", "body"],
  additionalProperties: false,
} as const;

const SYSTEM =
  "You write short, personal cold emails in English for a freelance video creator. " +
  "Follow the user's requirements exactly. Never invent facts about the recipient.";

/** Pisze maila przez Claude API. Nic nie wysyła — zwraca tylko temat i treść. */
export async function writeEmailWithClaude(prompt: string): Promise<{ subject: string; body: string }> {
  const client = new Anthropic(); // klucz z ANTHROPIC_API_KEY

  let response;
  try {
    response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: EMAIL_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      throw new Error("Claude odrzucił klucz API — sprawdź ANTHROPIC_API_KEY w Vercel.");
    if (error instanceof Anthropic.PermissionDeniedError)
      throw new Error("Brak uprawnień do Claude API — sprawdź konto na console.anthropic.com.");
    if (error instanceof Anthropic.RateLimitError)
      throw new Error("Za dużo zapytań do Claude naraz — spróbuj za chwilę.");
    if (error instanceof Anthropic.BadRequestError && /credit|balance|billing/i.test(error.message))
      throw new Error("Brak środków na koncie Claude API — doładuj w console.anthropic.com → Billing.");
    if (error instanceof Anthropic.APIError)
      throw new Error(`Błąd Claude API (${error.status}): ${error.message}`);
    throw new Error("Nie udało się połączyć z Claude API.");
  }

  if (response.stop_reason === "refusal")
    throw new Error("Claude odmówił napisania tego maila. Zmień notatki i spróbuj ponownie.");
  if (response.stop_reason === "max_tokens")
    throw new Error("Odpowiedź Claude została ucięta — spróbuj ponownie.");

  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi Claude — spróbuj ponownie.");
  }
  const { subject, body } = parsed as { subject?: unknown; body?: unknown };
  if (typeof subject !== "string" || typeof body !== "string" || !body.trim())
    throw new Error("Claude zwrócił pustą odpowiedź — spróbuj ponownie.");
  return { subject: subject.trim(), body: body.trim() };
}
