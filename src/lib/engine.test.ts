import { describe, expect, it } from "vitest";
import { acknowledgeReferral, assignReferral, correctField, deliverReferral, resolveIdentity, reviewExtraction, validateReferral } from "./engine";
import { createSeedState } from "./seed";

const times = ["2026-09-04T15:00:00.000Z", "2026-09-04T15:01:00.000Z", "2026-09-04T15:02:00.000Z", "2026-09-04T15:03:00.000Z", "2026-09-04T15:04:00.000Z", "2026-09-04T15:05:00.000Z"];
const selected = (state: ReturnType<typeof createSeedState>) => state.referrals.find((r) => r.id === state.selectedReferralId)!;

describe("referral workflow", () => {
  it("holds incomplete extraction, records staff provenance, and validates R4", () => {
    let state = createSeedState();
    expect(validateReferral(selected(state))).toMatchObject({ isValid: false, missingFields: ["callbackNumber"], fhirErrors: [] });
    state = reviewExtraction(state, times[0]).state;
    expect(selected(state).status).toBe("NEEDS_INFORMATION");
    state = correctField(state, "callbackNumber", "416-555-0199", times[1]).state;
    const callback = selected(state).fields.find((field) => field.key === "callbackNumber")!;
    expect(callback.source).toMatchObject({ page: 2, line: 3 });
    expect(validateReferral(selected(state)).isValid).toBe(true);
    expect(selected(state).audit.at(-1)?.actor).toContain("Alex Morgan");
  });

  it("recovers an interrupted delivery and suppresses a repeat with one stable key", () => {
    let state = createSeedState();
    state = reviewExtraction(state, times[0]).state;
    state = correctField(state, "callbackNumber", "416-555-0199", times[1]).state;
    state = assignReferral(state, "Alex Morgan", times[2]).state;
    state = deliverReferral(state, "INTERRUPT", times[3]).state;
    expect(selected(state).status).toBe("DELIVERY_INTERRUPTED");
    expect(state.receiverRecords).toHaveLength(1);
    expect(selected(state).deliveryAttempts[0].receiverMessage).toContain("response was lost");

    const serialized = JSON.stringify(state);
    state = JSON.parse(serialized);
    state = deliverReferral(state, "DELIVER", times[4]).state;
    state = deliverReferral(state, "DELIVER", times[5]).state;

    const attempts = selected(state).deliveryAttempts;
    expect(attempts.map((attempt) => attempt.outcome)).toEqual(["INTERRUPTED", "DELIVERED", "DUPLICATE_SUPPRESSED"]);
    expect(new Set(attempts.map((attempt) => attempt.idempotencyKey)).size).toBe(1);
    expect(attempts.filter((attempt) => attempt.outcome === "DELIVERED")).toHaveLength(1);
    expect(state.receiverRecords).toHaveLength(1);
    expect(attempts[1].receiverMessage).toContain("Reconciled");
  });

  it("keeps ServiceRequest active when the administrative Task closes", () => {
    let state = createSeedState();
    state = reviewExtraction(state, times[0]).state;
    state = correctField(state, "callbackNumber", "416-555-0199", times[1]).state;
    state = assignReferral(state, "Alex Morgan", times[2]).state;
    state = deliverReferral(state, "DELIVER", times[3]).state;
    state = acknowledgeReferral(state, times[4]).state;
    expect(selected(state)).toMatchObject({ status: "CLOSED", serviceRequest: { status: "active" }, task: { status: "completed" } });
  });

  it("blocks an out-of-order assignment without mutating state", () => {
    const state = createSeedState();
    const result = assignReferral(state, "Alex Morgan", times[0]);
    expect(result.state).toBe(state);
    expect(result.message).toContain("human review");
  });

  it("blocks ambiguous identity until explicit staff confirmation", () => {
    let state = { ...createSeedState(), selectedReferralId: "REF-1044" };
    state = reviewExtraction(state, times[0]).state;
    expect(selected(state)).toMatchObject({ status: "NEEDS_INFORMATION", identityStatus: "AMBIGUOUS" });
    expect(assignReferral(state, "Alex Morgan", times[1]).state).toBe(state);
    state = resolveIdentity(state, times[2]).state;
    expect(selected(state)).toMatchObject({ status: "READY_FOR_REVIEW", identityStatus: "CONFIRMED" });
    expect(selected(state).audit.at(-1)?.action).toBe("IDENTITY_CONFIRMED");
  });

  it("reports broken FHIR references", () => {
    const referral = selected(createSeedState());
    const invalid = { ...referral, task: { ...referral.task, basedOn: [{ reference: "ServiceRequest/wrong" }] } };
    expect(validateReferral(invalid).fhirErrors).toContain("Task.basedOn must reference this ServiceRequest");
  });
});
