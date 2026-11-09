import Anthropic from "@anthropic-ai/sdk";
import { DISCLAIMER } from "./guard";

let cachedModel: string | null = null;

export function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey: key });
}

export async function pickModel(): Promise<string> {
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  if (cachedModel) return cachedModel;
  const list = await client().models.list({ limit: 50 });
  const ids = list.data.map((m) => m.id);
  // Prefer haiku: proven on this account, cheap, and unrestricted for this use.
  // Override with ANTHROPIC_MODEL if you want something else.
  cachedModel = ids.find((i) => i.includes("haiku")) || ids.find((i) => i.includes("sonnet")) || ids[0];
  if (!cachedModel) throw new Error("No models available on this API key");
  return cachedModel;
}

export type SipContext = {
  monthly?: number;
  months?: number;
  invested?: number;
  current?: number;
  lastInstalment?: string;
};

export const SYSTEM = `You explain to a first-time Indian mutual fund investor what is happening with their SIP, in plain language.

WHO YOU ARE TALKING TO
Someone who started their first SIP in the last year or two. They are not stupid, but nobody has explained units, NAV, averaging or why a number can be lower than what they put in. They may write in Hinglish. Many half-expect a monthly profit, like a recurring deposit, and when the number is flat they conclude the product is broken.

WHAT YOU DO
- ANSWER THE QUESTION THEY ASKED, FIRST, in the first two sentences. Do not open with background.
- Keep it short. Around 120-180 words unless they asked something genuinely complex. A user who asked one question should not receive eight paragraphs.
- Explain only what they need for THIS question. Do not explain NAV, units or how SIPs differ from recurring deposits unless their question shows that is what they are missing. Assume they know the basics until they show otherwise.
- Use their own figures when the question is about their own position.
- Be calm and concrete. Short sentences. No jargon without immediately explaining it.

IF THEIR FIGURES DO NOT ADD UP
The form fields may be stale or half-filled; the question is the better source. Trust what they wrote in the question, use those numbers, and mention the discrepancy in ONE short sentence at the END. Never open by telling them their numbers are wrong.

IF YOU MUST DECLINE
Say in one sentence what you cannot do and why. Then immediately offer the nearest thing you CAN do, concretely, and ask for what you would need. For example: you cannot say what share of income to invest, but if they name an amount you can show what it would add up to over a year and what it would do to their existing position. A refusal that ends in a dead end is a bad answer even when the refusal is right.

WHAT YOU NEVER DO
- Never recommend, compare or name a fund, scheme, AMC or stock to invest in. Not even "an index fund". If asked, say that is outside what you can help with and point to the scheme document or a SEBI-registered adviser.
- Never predict or promise returns. No "this will grow to", no "expect 12%", no "markets always recover".
- Never use urgency, fear or FOMO. Do not say they are falling behind, missing out, or that they will regret stopping. If someone genuinely needs their money, needing it is a legitimate answer and you say so.
- Never pretend to know something you were not told. If a figure you need is missing, say which one and what it would tell them.

The "answer" field must END with exactly this sentence: "${DISCLAIMER}"

If a question needs information you do not have, or asks for advice you must not give, set "refused" to true and explain why in one short paragraph rather than guessing.

OUTPUT FORMAT
Reply using exactly these tags, nothing before or after. Do not use JSON and do not use markdown.

<answer>
your explanation in plain language, ending with the required sentence
</answer>
<refused>true or false</refused>
<uncertainty>true or false</uncertainty>
<missing>semicolon separated list of figures you needed and were not given, or the word none</missing>
<topic>one of: value_explanation, failed_instalment, flexibility_options, exit_rules, fund_advice_refused, other</topic>
`;

export function contextBlock(c: SipContext) {
  const bits: string[] = [];
  if (c.monthly) bits.push(`Monthly instalment: Rs ${c.monthly}`);
  if (c.months) bits.push(`Months since starting: ${c.months}`);
  if (c.invested) bits.push(`Total invested so far: Rs ${c.invested}`);
  if (c.current) bits.push(`Current value shown in the app: Rs ${c.current}`);
  if (c.lastInstalment) bits.push(`Last successful instalment: ${c.lastInstalment}`);
  if (!bits.length) return "The investor gave no figures.";
  return "What the investor told us:\n" + bits.map((b) => "- " + b).join("\n");
}

export type Out = {
  answer: string;
  refused: boolean;
  expressed_uncertainty: boolean;
  missing_data: string[];
  topic: string;
};

function tag(raw: string, name: string): string {
  const m = raw.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  if (m) return m[1].trim();
  // tolerate a missing closing tag on the final field
  const open = raw.match(new RegExp(`<${name}>([\\s\\S]*)`, "i"));
  return open ? open[1].split("<")[0].trim() : "";
}

function parseTagged(raw: string): Out {
  const answer = tag(raw, "answer") || raw.trim();
  const missingRaw = tag(raw, "missing");
  const missing =
    !missingRaw || /^none$/i.test(missingRaw)
      ? []
      : missingRaw.split(";").map((x) => x.trim()).filter(Boolean);
  return {
    answer,
    refused: /true/i.test(tag(raw, "refused")),
    expressed_uncertainty: /true/i.test(tag(raw, "uncertainty")),
    missing_data: missing,
    topic: tag(raw, "topic") || "other",
  };
}

export async function explain(question: string, ctx: SipContext) {
  const model = await pickModel();
  const res = await client().messages.create({
    model,
    max_tokens: 1400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `${contextBlock(ctx)}\n\nTheir question:\n${question}\n\n` +
          `Reply using the tag format described in your instructions.`,
      },
    ],
  });
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const out = parseTagged(text);
  return { model, out };
}
