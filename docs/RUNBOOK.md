# Demo and recovery runbook

## Guided path

1. Open Workbench and select `REF-1042`.
2. Review extraction. The missing callback number moves the record to `NEEDS_INFORMATION`.
3. Enter a synthetic callback number. Clearpath creates page 2 provenance and reruns validation.
4. Assign the referral. This validates ServiceRequest + Task and sets a Task owner.
5. Send with outage simulation. The receiver commits `NORTHSTAR-2901`, its response is lost, and the sender marks the referral `DELIVERY_INTERRUPTED` with an unknown outcome.
6. Reload the page. Validated browser persistence restores the interrupted referral and reserved idempotency key.
7. Retry safely. Clearpath looks up the stable key in the simulated receiver ledger, finds the existing record, and reconciles without a second receiver write.
8. Prove duplicate prevention. A second delivery command is recorded as suppressed without sending a second payload.
9. Simulate acknowledgement. The administrative Task closes while ServiceRequest stays active.
10. Open Handoffs and Evidence for the attempt ledger and measured benchmark.

## Operator recovery

- Interrupted/unknown delivery: reload if needed, inspect the Handoff ledger, and use Retry safely. Do not reset because reset intentionally clears local state.
- Invalid saved state: the app removes data that fails `workspaceSchema` and returns to reproducible seeds.
- Unexpected UI state: use Reset demo; this is destructive only to this browser's synthetic demo data.
- Test a public deployment: set `PLAYWRIGHT_BASE_URL=https://exact-alias.example` and run `npm run test:e2e`.

## Verification commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run benchmark
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=high
```

## Known limits

No real receiver reconciliation query, dead-letter queue, authorization, or centralized audit store exists. The receiver is a deterministic local simulation. This artifact must never receive real patient data.
