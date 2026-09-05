import type { PacketPage } from "./contracts";
import { assignReferral, deliverReferral, reviewExtraction } from "./engine";
import { extractPacket } from "./extractor";
import { createSeedState } from "./seed";

export interface BenchmarkResult {
  packets: number;
  fields: number;
  correctFields: number;
  correctionsRequired: number;
  extractionAccuracy: number;
  correctionRate: number;
  retryScenarios: number;
  duplicateDeliveryErrors: number;
}

function heldOutPacket(index: number): { pages: PacketPage[]; truth: string[] } {
  const truth = [`Synthetic Person ${index + 1}`, `198${index % 10}-01-15`, `SYN-${String(index).padStart(4, "0")}`, "Dr. Demo Clinician", "Specialist consultation requested", `416-555-${String(1000 + index)}`];
  const callbackLabel = index % 4 === 0 ? "Phone" : "Callback";
  return { truth, pages: [{ page: 1, heading: `Held-out packet ${index + 1}`, lines: [
    `Patient: ${truth[0]}`, `DOB: ${truth[1]}`, `Synthetic ID: ${truth[2]}`,
    `From: ${truth[3]}`, `Reason: ${truth[4]}`, `${callbackLabel}: ${truth[5]}`,
  ] }] };
}

export function runBenchmark(): BenchmarkResult {
  let correctFields = 0;
  const packets = 24;
  for (let index = 0; index < packets; index += 1) {
    const fixture = heldOutPacket(index);
    const actual = extractPacket(fixture.pages).map((field) => field.value);
    correctFields += actual.filter((value, fieldIndex) => value === fixture.truth[fieldIndex]).length;
  }
  const fields = packets * 6;
  let duplicateDeliveryErrors = 0;
  const retryScenarios = 8;
  for (let index = 0; index < retryScenarios; index += 1) {
    let state = createSeedState();
    state = { ...state, selectedReferralId: "REF-1043" };
    state = reviewExtraction(state, `2026-09-04T14:0${index}:01.000Z`).state;
    state = assignReferral(state, "Benchmark Coordinator", `2026-09-04T14:0${index}:02.000Z`).state;
    state = deliverReferral(state, "INTERRUPT", `2026-09-04T14:0${index}:03.000Z`).state;
    state = deliverReferral(state, "DELIVER", `2026-09-04T14:0${index}:04.000Z`).state;
    state = deliverReferral(state, "DELIVER", `2026-09-04T14:0${index}:05.000Z`).state;
    const attempts = state.referrals.find((referral) => referral.id === "REF-1043")!.deliveryAttempts;
    if (attempts.filter((attempt) => attempt.outcome === "DELIVERED").length !== 1 || attempts.filter((attempt) => attempt.outcome === "DUPLICATE_SUPPRESSED").length !== 1) duplicateDeliveryErrors += 1;
  }
  const correctionsRequired = fields - correctFields;
  return { packets, fields, correctFields, correctionsRequired, extractionAccuracy: correctFields / fields, correctionRate: correctionsRequired / fields, retryScenarios, duplicateDeliveryErrors };
}

export const BENCHMARK_RESULT = runBenchmark();

