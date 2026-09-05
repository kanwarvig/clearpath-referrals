# Architecture

Clearpath Referrals is a zero-secret Next.js demonstration of one administrative referral workflow. Synthetic packet text enters a deterministic extractor, staff review resolves blocking gaps, typed domain commands enforce transitions, FHIR R4 projections are checked, and a simulated receiver records idempotent delivery outcomes.

```text
authored synthetic PacketPage[]
  -> extractPacket() + source spans
  -> Referral aggregate + review gates
  -> ServiceRequest R4 + Task R4 projection
  -> stable delivery idempotency key
  -> simulated acknowledgement + attributable audit
```

## Module boundaries

- `src/lib/contracts.ts`: public TypeScript contracts and the Zod persistence boundary.
- `src/lib/extractor.ts`: deterministic parsing and FHIR projection. It computes outputs from packet text; packet fixtures do not contain scripted extraction outputs.
- `src/lib/engine.ts`: pure transition, validation, correction, assignment, delivery, retry, duplicate-prevention, acknowledgement, and audit functions.
- `src/lib/seed.ts`: synthetic input packets and initial browser workspace only.
- `src/lib/benchmark.ts`: reproducible held-out fixture runner and measured results.
- `src/components/referral-workbench.tsx`: browser client, persistence adapter, accessible workflow UI, and system/evidence views.

## Data and trust boundaries

All source records are authored synthetic text. Browser `localStorage` is an explicitly labeled demo persistence layer; its payload is untrusted and validated by `workspaceSchema` before use. Invalid or unknown-version state is discarded. The app has no backend, secrets, authentication, hospital system, or real receiver.

The referral aggregate is the workflow source of truth. FHIR R4 (4.0.1) `ServiceRequest` and `Task` are projections used at the interoperability boundary. Closing the administrative `Task` leaves `ServiceRequest.status` active because the demo does not know whether a clinical service was fulfilled.

## Reliability properties

- Delivery is gated on review, required data, FHIR validity, and assignment.
- The receiver key is deterministic: `delivery:{referralId}:northstar-v1`.
- The simulated receiver commits its own record before an injected response loss. After reload, recovery queries that receiver ledger by the same key and reconciles without another receiver record.
- Once a delivered attempt exists, later send commands append `DUPLICATE_SUPPRESSED` and never append another `DELIVERED` outcome.
- The interrupted state is serialized. The browser E2E test reloads before retrying, proving recovery from persisted state rather than one in-memory call chain.
- Each accepted mutation appends actor, timestamp, action, and detail to an immutable event history.

## Deliberate limits

This is not a hospital integration, clinical device, privacy/compliance certification, or production-ready medical system. It makes no diagnosis, urgency, or treatment decision. A production design would require identity, authorization, server-side immutable storage, encryption/key management, formal R4 profile validation, a durable outbox, reconciliation, monitoring, and organizational security/privacy review.
