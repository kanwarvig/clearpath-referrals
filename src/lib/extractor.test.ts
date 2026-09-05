import { describe, expect, it } from "vitest";
import { extractPacket, projectFhirR4 } from "./extractor";

describe("deterministic packet extraction", () => {
  const pages = [{ page: 3, heading: "Input", lines: ["Patient: Sam Demo", "DOB: 1990-02-03", "Synthetic ID: SYN-42", "From: Dr. Example", "Reason: Consultation", "Callback: 905-555-0100"] }];

  it("computes values and line-level provenance from packet text", () => {
    const fields = extractPacket(pages);
    expect(fields.find((field) => field.key === "patientName")).toMatchObject({ value: "Sam Demo", source: { page: 3, line: 1, excerpt: "Patient: Sam Demo" } });
    expect(fields.every((field) => field.source !== null)).toBe(true);
  });

  it("returns explicit missing output for an unsupported input label", () => {
    const fields = extractPacket([{ ...pages[0], lines: pages[0].lines.map((line) => line.replace("Callback:", "Telephone:")) }]);
    expect(fields.find((field) => field.key === "callbackNumber")).toMatchObject({ value: "", confidence: 0, source: null });
  });

  it("projects FHIR resources from extraction output", () => {
    const result = projectFhirR4("REF-T1", extractPacket(pages), "2026-09-04");
    expect(result.serviceRequest.subject.display).toBe("Sam Demo");
    expect(result.serviceRequest.code.text).toBe("Consultation");
    expect(result.task.basedOn[0].reference).toBe("ServiceRequest/sr-REF-T1");
  });
});

