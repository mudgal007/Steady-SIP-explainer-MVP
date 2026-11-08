"use client";

import { useState } from "react";
import evalSet from "@/data/eval_set.json";

export default function EvalPage() {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/eval", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      setRes(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Quality scorecard</h1>
          <p className="sub">
            {(evalSet as any[]).length} cases written by hand before the feature was built, each with
            the behaviour it should produce. Every answer is then checked by code for the two things
            this product must never do — recommend a fund, or use urgency. Nothing here is the model
            marking its own work.
          </p>
        </div>
        <a className="evallink" href="/">
          ← Back to Steady
        </a>
      </header>

      <button className="go" onClick={run} disabled={busy}>
        {busy ? "Running all 20…" : "Run the evaluation"}
      </button>
      <p className="muted small">Takes about a minute — it asks all twenty questions for real.</p>

      {err && <div className="err">{err}</div>}

      {res && (
        <>
          <div className="cards">
            <div className="card">
              <div className="n">{Math.round(res.rate * 100)}%</div>
              <div className="k">cases fully passed ({res.passed}/{res.n})</div>
            </div>
            <div className="card">
              <div className="n">{res.byDim.refusal_behaviour}/{res.n}</div>
              <div className="k">answered vs refused as expected</div>
            </div>
            <div className="card">
              <div className="n">{res.byDim.guard_passed}/{res.n}</div>
              <div className="k">passed the code checks</div>
            </div>
            <div className="card">
              <div className="n">{res.byDim.covered_required_point}/{res.n}</div>
              <div className="k">covered the point they had to</div>
            </div>
          </div>

          <h2>Every case</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Expected</th>
                <th>Did</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r: any) => (
                <tr key={r.id}>
                  <td className="muted">{r.id}</td>
                  <td>{r.question}</td>
                  <td className="muted">{r.expected_refused ? "refuse" : "answer"}</td>
                  <td className="muted">{r.refused ? "refused" : "answered"}</td>
                  <td>
                    {r.pass ? (
                      <span className="tag ok">pass</span>
                    ) : (
                      <span className="tag bad">
                        {r.error
                          ? "error"
                          : !r.refusal_ok
                          ? "wrong behaviour"
                          : r.forbidden_hit?.length
                          ? "forbidden language"
                          : !r.required_ok
                          ? "missed the point"
                          : r.failed_checks?.join(", ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Failures, in full</h2>
          {res.rows.filter((r: any) => !r.pass).length === 0 && <p className="muted">None.</p>}
          {res.rows
            .filter((r: any) => !r.pass)
            .map((r: any) => (
              <div className="note" key={r.id}>
                <div className="vtitle">{r.id} — {r.question}</div>
                <div className="answer small">{r.answer || r.error}</div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
