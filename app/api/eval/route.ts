import { NextRequest, NextResponse } from "next/server";
import { explain } from "@/lib/explain";
import { guard, ensureDisclaimer } from "@/lib/guard";
import evalSet from "@/data/eval_set.json";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type Case = {
  id: string;
  question: string;
  context: Record<string, unknown>;
  expect: { refused: boolean; must_not_contain: string[]; must_contain_any: string[] };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const only: string[] | undefined = body?.only;
    const cases = (evalSet as Case[]).filter((c) => !only || only.includes(c.id));

    const rows: any[] = [];
    for (const c of cases) {
      let row: any = { id: c.id, question: c.question };
      try {
        const { out } = await explain(c.question, c.context as any);
        out.answer = ensureDisclaimer(out.answer);
        const v = guard(out.answer, { refused: out.refused, expressedUncertainty: out.expressed_uncertainty });
        const lower = (out.answer || "").toLowerCase();

        const refusalOk = out.refused === c.expect.refused;
        const forbiddenHit = c.expect.must_not_contain.filter((s) => lower.includes(s.toLowerCase()));
        const neededAny =
          c.expect.must_contain_any.length === 0 ||
          c.expect.must_contain_any.some((s) => lower.includes(s.toLowerCase()));

        row = {
          ...row,
          answer: out.answer,
          refused: out.refused,
          expected_refused: c.expect.refused,
          refusal_ok: refusalOk,
          forbidden_hit: forbiddenHit,
          required_ok: neededAny,
          guard_pass: v.pass,
          failed_checks: v.checks.filter((x) => !x.pass).map((x) => x.id),
          pass: refusalOk && forbiddenHit.length === 0 && neededAny && v.pass,
        };
      } catch (e) {
        row = { ...row, error: e instanceof Error ? e.message : "failed", pass: false };
      }
      rows.push(row);
    }

    const passed = rows.filter((r) => r.pass).length;
    const byDim = {
      refusal_behaviour: rows.filter((r) => r.refusal_ok).length,
      no_forbidden_language: rows.filter((r) => (r.forbidden_hit?.length ?? 1) === 0).length,
      covered_required_point: rows.filter((r) => r.required_ok).length,
      guard_passed: rows.filter((r) => r.guard_pass).length,
    };

    return NextResponse.json({ n: rows.length, passed, rate: rows.length ? passed / rows.length : 0, byDim, rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
