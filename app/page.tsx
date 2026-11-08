"use client";

import { useMemo, useState } from "react";

type Check = { id: string; label: string; pass: boolean; detail?: string };

const SUGGESTED = [
  "I have put in 30000 but app shows 28500. Why is my money less than what I invested?",
  "Money is tight this month. What are my options other than stopping?",
  "How would I know if my SIP has stopped without me doing it?",
  "Profit kyu nahi dikh raha har mahine? RD me to interest milta hai",
  "Which fund should I invest in for best returns?",
];

export default function Page() {
  const [tab, setTab] = useState<"ask" | "options">("ask");
  const [monthly, setMonthly] = useState("5000");
  const [months, setMonths] = useState("6");
  const [invested, setInvested] = useState("30000");
  const [current, setCurrent] = useState("28500");
  const [last, setLast] = useState("");

  const ctx = {
    monthly: Number(monthly) || undefined,
    months: Number(months) || undefined,
    invested: Number(invested) || undefined,
    current: Number(current) || undefined,
    lastInstalment: last || undefined,
  };

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Steady</h1>
          <p className="sub">
            A plain-language explainer for people in their first year of a SIP. It tells you what your
            numbers mean and what your options are. It will not tell you what to buy.
          </p>
        </div>
        <a className="evallink" href="/eval">
          Quality scorecard →
        </a>
      </header>

      <section className="facts">
        <div className="factgrid">
          <L label="Monthly instalment ₹" v={monthly} set={setMonthly} />
          <L label="Months since starting" v={months} set={setMonths} />
          <L label="Total invested ₹" v={invested} set={setInvested} />
          <L label="Value shown in app ₹" v={current} set={setCurrent} />
          <L label="Last instalment (optional)" v={last} set={setLast} ph="e.g. July 2026" />
        </div>
        <p className="muted small">
          Nothing is stored and nothing is sent anywhere except to answer your question. Do not enter
          account numbers or PAN — they are not needed and not wanted.
        </p>
      </section>

      <div className="tabs">
        <button className="tab" data-on={tab === "ask"} onClick={() => setTab("ask")}>
          Ask about your SIP
        </button>
        <button className="tab" data-on={tab === "options"} onClick={() => setTab("options")}>
          If money is tight
        </button>
      </div>

      {tab === "ask" ? <Ask ctx={ctx} /> : <Options ctx={ctx} />}

      <footer>
        Built for a product-management case study. Not affiliated with any investing platform. Not
        investment advice.
      </footer>
    </div>
  );
}

function L({ label, v, set, ph }: { label: string; v: string; set: (s: string) => void; ph?: string }) {
  return (
    <label>
      <span>{label}</span>
      <input value={v} placeholder={ph} onChange={(e) => set(e.target.value)} />
    </label>
  );
}

/* ─────────────────────────────── ask ─────────────────────────────────── */

function Ask({ ctx }: { ctx: any }) {
  const [q, setQ] = useState(SUGGESTED[0]);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go(question?: string) {
    const text = question ?? q;
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, context: ctx }),
      });
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
    <>
      <textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask in your own words…" />
      <div className="row">
        <button className="go" onClick={() => go()} disabled={busy}>
          {busy ? "Thinking…" : "Explain it to me"}
        </button>
      </div>

      <div className="chips">
        {SUGGESTED.map((s) => (
          <button key={s} className="chip" onClick={() => { setQ(s); go(s); }}>
            {s.length > 54 ? s.slice(0, 54) + "…" : s}
          </button>
        ))}
      </div>

      {err && <div className="err">{err}</div>}

      {res && (
        <>
          {res.blocked && (
            <div className="blocked">
              <strong>Answer blocked by the quality check.</strong> The model produced something that
              failed one of the rules below, so it was not shown. This is the fallback instead.
            </div>
          )}
          <div className="answer">{res.shown}</div>

          <div className="verdict">
            <div className="vtitle">
              Quality check {res.verdict.pass ? <span className="ok">passed</span> : <span className="bad">failed</span>}
            </div>
            {res.verdict.checks.map((c: Check) => (
              <div className="vrow" key={c.id}>
                <span className={c.pass ? "dot ok" : "dot bad"} />
                <span>{c.label}</span>
                {c.detail && <em className="muted"> — {c.detail}</em>}
              </div>
            ))}
            {res.meta.missing_data?.length > 0 && (
              <div className="vrow missing">
                <span className="dot warn" />
                <span>
                  Said it could not know without: {res.meta.missing_data.join(", ")}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

/* ───────────────────────────── options ───────────────────────────────── */

function Options({ ctx }: { ctx: any }) {
  const m = ctx.monthly || 0;
  const [reduceTo, setReduceTo] = useState(String(Math.max(500, Math.round((m || 5000) / 2 / 500) * 500)));
  const [pauseMonths, setPauseMonths] = useState("3");

  const rows = useMemo(() => {
    const r = Number(reduceTo) || 0;
    const p = Math.min(12, Math.max(0, Number(pauseMonths) || 0));
    return [
      {
        name: "Keep going as now",
        next12: m * 12,
        mandate: "Stays active",
        note: "Nothing changes.",
      },
      {
        name: "Skip one instalment",
        next12: m * 11,
        mandate: "Stays active",
        note: "One month not contributed. The SIP itself is still running.",
      },
      {
        name: `Reduce to ₹${r}`,
        next12: r * 12,
        mandate: "Stays active",
        note: `₹${(m - r) * 12} less contributed over a year, and it keeps running.`,
      },
      {
        name: `Pause for ${p} month${p === 1 ? "" : "s"}`,
        next12: m * (12 - p),
        mandate: "Stays active, resumes automatically",
        note: "Units you already hold stay invested. Nothing is sold.",
      },
      {
        name: "Stop the SIP",
        next12: 0,
        mandate: "Ends — restarting means setting it up again",
        note: "Units you already hold stay invested unless you also redeem.",
      },
      {
        name: "Stop and redeem",
        next12: 0,
        mandate: "Ends",
        note: "Money comes out. Exit load and tax may apply — check the scheme document.",
      },
    ];
  }, [m, reduceTo, pauseMonths]);

  return (
    <>
      <p className="lead">
        Most people only see two choices: keep paying, or quit. There are four more in between, and
        the difference between them is whether your SIP is still alive next month.
      </p>

      <div className="row">
        <label className="inline">
          Reduce to ₹<input className="sm" value={reduceTo} onChange={(e) => setReduceTo(e.target.value)} />
        </label>
        <label className="inline">
          Pause for <input className="sm" value={pauseMonths} onChange={(e) => setPauseMonths(e.target.value)} /> months
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th className="num">You contribute over 12 months</th>
            <th>Your SIP</th>
            <th>What happens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td><strong>{r.name}</strong></td>
              <td className="num">₹{r.next12.toLocaleString("en-IN")}</td>
              <td className={r.mandate.startsWith("Ends") ? "bad" : "ok"}>{r.mandate}</td>
              <td className="muted">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted small">
        These are arithmetic, not predictions — they show what you would contribute, not what it
        would be worth. Exact pause and skip behaviour differs by platform and by scheme; check yours
        before relying on it. If you genuinely need the money, needing it is a good enough reason.
      </p>
    </>
  );
}
