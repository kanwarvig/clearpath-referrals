# Clearpath Referrals

A substantial, deterministic healthcare referral and intake workbench built with Next.js, TypeScript, and FHIR R4-shaped resources. It demonstrates an incomplete synthetic referral moving through field-level provenance review, staff correction, R4 validation, assignment, interrupted delivery, persisted recovery, duplicate suppression, simulated receiving-clinic acknowledgement, and attributable closure.

> Synthetic records only. Administrative workflow only. No real PHI. No clinical diagnosis, urgency, or treatment decisions. This is not a hospital integration, medical device, or compliance/interoperability certification.

## Run it

Requires Node.js 20+.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`, choose `REF-1042`, and follow the single next-safe-action panel. Reset returns the browser to reproducible seed inputs.

The interface uses route-level information architecture so direct links, refresh, and browser navigation work as expected:

- `/` — guided product overview and one clear starting action
- `/intake` — searchable referral queue
- `/referrals/[id]` — focused, progressively disclosed review workspace
- `/handoffs` — receiver ledger and recovery pattern
- `/evidence` — computed benchmark evidence and claim boundaries
- `/system` — architecture and explicit scope boundaries

Quality commands:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run benchmark
npm run scan:secrets
npm run build
npx playwright install chromium
npm run test:e2e
```

## Measured demo evidence

`npm run benchmark` computes results rather than reading scripted outputs: 24 generated parser-conformance cases × 6 fields produce 138/144 exact matches (95.8%) and 6/144 staff corrections (4.2%). Eight configured receiver-accepted/response-lost recovery scenarios produce zero duplicate-delivery errors. This is a generated deterministic fixture suite—not a separately authored held-out dataset and not real-world clinical evidence.

## Requirement-to-evidence matrix

| Requirement | Implementation evidence | Automated/public interaction |
|---|---|---|
| Representative synthetic packets | `src/lib/seed.ts` authored `PacketPage[]` inputs | Queue shows incomplete, complete, and ambiguous-identity fixtures |
| Computed extraction + field provenance/confidence | `src/lib/extractor.ts` parses packet lines and creates source coordinates | `extractor.test.ts`; selecting a field highlights its exact source line |
| FHIR R4 ServiceRequest + Task validation | `projectFhirR4()` and `validateReferral()` | `engine.test.ts`; expandable resources and R4 status card |
| Missing-information correction | `reviewExtraction()` and `correctField()` | E2E holds `REF-1042`, adds callback, records page 2 provenance |
| Staff assignment + state machine | guarded pure commands plus explicit `AMBIGUOUS` identity state in `src/lib/engine.ts` | invalid-transition and identity-resolution unit/E2E tests |
| Simulated acknowledgement and closure | `acknowledgeReferral()` closes Task but not clinical ServiceRequest | unit + E2E closure assertions |
| Duplicate prevention | receiver record keyed by stable idempotency key | benchmark 8 scenarios; E2E proves exactly one receiver record and suppressed duplicate |
| Interrupted delivery recovery | receiver commits before response loss; serialized `DELIVERY_INTERRUPTED` aggregate | unit + E2E reload, lookup, and reconciliation without second receiver record |
| Attributable audit history | actor/timestamp/action/detail events | timeline visible after every accepted mutation |
| Measured demo metrics | `src/lib/benchmark.ts` computes results from configurable fixtures | `benchmark.test.ts`; Evidence page |
| Data-boundary validation | versioned `workspaceSchema` parses untrusted browser JSON | `contracts.test.ts` rejects tampered state |
| Architecture, ADR, runbook | `docs/ARCHITECTURE.md`, `docs/ADR-001-BROWSER-DOMAIN-DEMO.md`, `docs/RUNBOOK.md` | repository documentation |
| CI and release hygiene | `.github/workflows/ci.yml`, lockfile, zero-secret design | lint, typecheck, unit, build, and Chromium E2E on pushes/PRs |
| Public production proof | production artifact Playwright configuration + exact-alias override | `PLAYWRIGHT_BASE_URL=<public-alias> npm run test:e2e` after Vercel deployment |

## Architecture

The source-of-truth is a non-FHIR referral aggregate. Seed fixtures supply only synthetic packet inputs and failure configuration. The extractor, projection, validation, workflow, delivery outcomes, history, and benchmark results are computed. The UI cannot set status directly; it calls typed commands with transition guards.

See [architecture](docs/ARCHITECTURE.md), [ADR-001](docs/ADR-001-BROWSER-DOMAIN-DEMO.md), and the [demo/recovery runbook](docs/RUNBOOK.md).

## Persistence and limits

State is persisted only in the current browser and validated on reload. That choice provides a genuine restart-recovery demonstration on a zero-secret public deployment, not multi-user production durability. A real deployment would require authenticated roles, server-side immutable audit storage, encryption and governance, a formally validated implementation guide, receiver reconciliation, durable queues/outbox, monitoring, and organizational privacy/security approval.
