# Steady — AI-native MVP

A plain-language explainer for people in their first year of a SIP. Two things it does:

1. **Ask about your SIP** — you give your own figures and ask in your own words; it
   explains what the numbers mean and what actually happens on a failed instalment.
2. **If money is tight** — the four options between "keep paying" and "quit", with what
   each does to your contributions and to whether the SIP is still alive.

## The eval gate

Every model answer is checked by **deterministic code** before it reaches the screen
(`lib/guard.ts`). The model is not asked whether it behaved — it is tested:

| Check | What it blocks |
|---|---|
| `no_fund_advice` | A fund/AMC name together with a recommending verb |
| `no_predictions` | "will give", "expected returns of", "%p.a." and similar |
| `no_pressure` | Urgency and fear language — explicitly forbidden by the brief |
| `disclaimed` | Answer must state it is not investment advice |

A failed check **replaces the answer with a safe fallback and shows which check failed**.
The user sees the verdict either way, pass or fail.

`/eval` runs 20 hand-written cases — written before the feature existed — each with the
behaviour it should produce (answer vs refuse, language it must not use, point it must
cover). Results are shown per-case with every failure printed in full.

## Where AI earns its place

The arithmetic in "If money is tight" is plain code, not a model — it is deterministic and
must be right. AI is used for exactly one thing: taking a question a beginner actually
asks, in their own words and often in Hinglish — *"profit kyu nahi dikh raha har mahine?
RD me to interest milta hai"* — and explaining their own numbers back to them.

A non-AI version would be an FAQ. It would answer "what is NAV" but not "my money is the
same since 3 months, is it broken", which is the question people actually have and the one
that precedes most quiet lapses.

## Run

```bash
npm install
cp .env.example .env.local     # add your key
npm run dev
```

## Deploy

Push to GitHub → import at vercel.com → add `ANTHROPIC_API_KEY` → deploy.

## Limits

Not affiliated with any platform. Never gives investment advice. Does not connect to a
real account — the user supplies their own figures. Pause and skip behaviour varies by
platform and scheme, and the app says so rather than pretending otherwise.
