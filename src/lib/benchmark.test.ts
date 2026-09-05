import { describe, expect, it } from "vitest";
import { runBenchmark } from "./benchmark";

describe("reproducible synthetic conformance benchmark", () => {
  it("computes extraction and safe-retry measurements from configurable fixtures", () => {
    const result = runBenchmark();
    expect(result).toMatchObject({ packets: 24, fields: 144, correctFields: 138, correctionsRequired: 6, retryScenarios: 8, duplicateDeliveryErrors: 0 });
    expect(result.extractionAccuracy).toBeCloseTo(.9583, 3);
    expect(result.correctionRate).toBeCloseTo(.0417, 3);
  });
});
