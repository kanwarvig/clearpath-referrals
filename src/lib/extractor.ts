import type { ExtractedField, FieldKey, PacketPage, ServiceRequestR4, TaskR4 } from "./contracts";

const definitions: Array<{ key: FieldKey; label: string; prefix: string; confidence: number }> = [
  { key: "patientName", label: "Patient name", prefix: "Patient:", confidence: .99 },
  { key: "dateOfBirth", label: "Date of birth", prefix: "DOB:", confidence: .98 },
  { key: "healthNumber", label: "Synthetic health ID", prefix: "Synthetic ID:", confidence: .96 },
  { key: "referringClinician", label: "Referring clinician", prefix: "From:", confidence: .97 },
  { key: "reasonForReferral", label: "Administrative referral reason", prefix: "Reason:", confidence: .91 },
  { key: "callbackNumber", label: "Callback number", prefix: "Callback:", confidence: .95 },
];

export function extractPacket(pages: PacketPage[], lowConfidenceKeys: FieldKey[] = []): ExtractedField[] {
  return definitions.map((definition) => {
    for (const page of pages) {
      const index = page.lines.findIndex((line) => line.startsWith(definition.prefix));
      if (index >= 0) {
        const excerpt = page.lines[index];
        const raw = excerpt.slice(definition.prefix.length).trim();
        const missing = raw === "[not provided]" || raw === "";
        return {
          key: definition.key, label: definition.label, value: missing ? "" : raw,
          confidence: missing ? 0 : lowConfidenceKeys.includes(definition.key) ? .63 : definition.confidence,
          source: missing ? null : { page: page.page, line: index + 1, excerpt }, required: true, reviewed: false,
        };
      }
    }
    return { key: definition.key, label: definition.label, value: "", confidence: 0, source: null, required: true, reviewed: false };
  });
}

function value(fields: ExtractedField[], key: FieldKey) { return fields.find((field) => field.key === key)?.value ?? ""; }

export function projectFhirR4(referralId: string, fields: ExtractedField[], authoredOn: string): { serviceRequest: ServiceRequestR4; task: TaskR4 } {
  const patient = value(fields, "patientName");
  const clinician = value(fields, "referringClinician").split(",")[0];
  const serviceRequest: ServiceRequestR4 = {
    resourceType: "ServiceRequest", id: `sr-${referralId}`, status: "active", intent: "order",
    code: { text: value(fields, "reasonForReferral") || "Specialist consultation" },
    subject: { reference: `Patient/${referralId}`, display: patient },
    requester: { reference: "Practitioner/practitioner-07", display: clinician }, authoredOn,
  };
  const task: TaskR4 = {
    resourceType: "Task", id: `task-${referralId}`, status: "requested", intent: "order",
    basedOn: [{ reference: `ServiceRequest/${serviceRequest.id}` }], for: { reference: `Patient/${referralId}`, display: patient },
  };
  return { serviceRequest, task };
}
