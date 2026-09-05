# ADR-001: Use a pure domain engine with validated browser persistence

- Status: accepted
- Date: 2026-09-04

## Context

The portfolio demonstration must execute real referral logic, recover after interruption, deploy on a free zero-secret Vercel project, and never invite real PHI. A hosted database would add credentials and could suggest a production data posture that this artifact does not have.

## Decision

Keep workflow commands in pure TypeScript functions and persist the versioned aggregate in browser storage. Validate persisted JSON with Zod at the boundary. Keep authored packet fixtures as inputs only, then compute extracted fields, source locations, FHIR resources, validation issues, transitions, delivery outcomes, and metrics.

The UI is an adapter: it cannot directly set lifecycle state. It invokes domain commands that guard transitions and return a complete next state plus a staff-facing message.

## Consequences

The complete success and recovery story is independently executable with no account or secret and can be tested through serialization/reload. It is also intentionally single-browser, single-user, and tamperable by the device owner. Audit history is attributable inside the demo but is not a server-enforced, immutable compliance record.

## Alternatives

- Hosted database: stronger multi-user persistence, but unnecessary credentials, operational surface, and accidental PHI expectations for this bounded demonstration.
- Static scripted screens: simpler, but unable to prove validation, invalid-transition blocking, retry recovery, or duplicate prevention.
- FHIR server: closer interoperability surface, but would expand the project beyond one controlled receiving clinic and require more deployment/security claims.

