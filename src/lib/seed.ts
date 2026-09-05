import type { FieldKey, PacketPage, Referral, WorkspaceState } from "./contracts";
import { extractPacket, projectFhirR4 } from "./extractor";

const at = "2026-09-04T14:00:00.000Z";

function packet(patientName: string, dateOfBirth: string, healthNumber: string, callback: string): PacketPage[] {
  return [{ page: 1, heading: "Referral cover sheet", lines: [
    "CLEARPATH SYNTHETIC DEMO — NOT A CLINICAL RECORD", `Patient: ${patientName}`, `DOB: ${dateOfBirth}`,
    `Synthetic ID: ${healthNumber}`, "", "Referral details", "From: Dr. Noor Patel, Lakeshore Family Practice",
    `Callback: ${callback || "[not provided]"}`, "To: Northstar Specialty Clinic (simulated)",
    "Reason: Specialist consultation requested", "Administrative routing only. No urgency or treatment recommendation.",
  ] }];
}

function buildReferral(id: string, packetName: string, scenario: Referral["scenario"], pages: PacketPage[], lowConfidenceKeys: FieldKey[] = []): Referral {
  const fields = extractPacket(pages, lowConfidenceKeys);
  const fhir = projectFhirR4(id, fields, "2026-09-04");
  return {
    id, packetName, scenario, identityStatus: scenario === "AMBIGUOUS_IDENTITY" ? "AMBIGUOUS" : "CONFIRMED", status: "NEW", fields, pages, assignee: null, createdAt: at, updatedAt: at,
    ...fhir, deliveryAttempts: [],
    audit: [{ id: `${id}-event-1`, at, actor: "Clearpath extractor v1", action: "PACKET_EXTRACTED", detail: "Deterministic field extraction completed from packet text; staff review required." }],
    benchmarkStartedAt: at,
  };
}

export function createSeedState(): WorkspaceState {
  const referrals = [
    buildReferral("REF-1042", "chen-referral-incomplete.txt", "INCOMPLETE", packet("Maya Chen", "1986-04-18", "SYN-4829-113", "")),
    buildReferral("REF-1043", "rivera-referral-complete.txt", "COMPLETE", packet("Luis Rivera", "1979-11-02", "SYN-7721-904", "416-555-0142")),
    buildReferral("REF-1044", "singh-identity-review.txt", "AMBIGUOUS_IDENTITY", packet("Avery Singh", "1992-06-27", "SYN-1183-220", "647-555-0188"), ["healthNumber"]),
  ];
  return { version: 1, referrals, selectedReferralId: referrals[0].id, actor: "Alex Morgan · Referral coordinator", receiverRecords: [] };
}
