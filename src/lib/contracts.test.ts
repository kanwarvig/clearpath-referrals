import { describe, expect, it } from "vitest";
import { workspaceSchema } from "./contracts";
import { createSeedState } from "./seed";

describe("persistence boundary", () => {
  it("accepts the versioned seed workspace", () => expect(workspaceSchema.safeParse(createSeedState()).success).toBe(true));
  it("rejects tampered confidence and unknown status", () => {
    const state = createSeedState();
    const tampered = structuredClone(state) as unknown as { referrals: Array<{ fields: Array<{ confidence: number }>; status: string }> };
    tampered.referrals[0].fields[0].confidence = 4;
    tampered.referrals[0].status = "MAGIC";
    expect(workspaceSchema.safeParse(tampered).success).toBe(false);
  });
  it("rejects a selected referral id that does not exist", () => {
    expect(workspaceSchema.safeParse({ ...createSeedState(), selectedReferralId: "REF-NOT-FOUND" }).success).toBe(false);
  });
});
