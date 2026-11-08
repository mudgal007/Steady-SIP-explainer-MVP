import { NextRequest, NextResponse } from "next/server";
import { explain, SipContext } from "@/lib/explain";
import { guard, FALLBACK, ensureDisclaimer } from "@/lib/guard";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { question, context } = (await req.json()) as { question: string; context: SipContext };
    if (!question || question.trim().length < 3) {
      return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
    }
    const { model, out } = await explain(question, context || {});
    out.answer = ensureDisclaimer(out.answer);
    const verdict = guard(out.answer, {
      refused: out.refused,
      expressedUncertainty: out.expressed_uncertainty,
    });
    return NextResponse.json({
      model,
      shown: verdict.pass ? out.answer : FALLBACK,
      blocked: !verdict.pass,
      verdict,
      meta: {
        refused: out.refused,
        expressed_uncertainty: out.expressed_uncertainty,
        missing_data: out.missing_data,
        topic: out.topic,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
