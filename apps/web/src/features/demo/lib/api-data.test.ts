import { describe, expect, it } from "vitest";
import { listenerOf } from "./api-data";
import { EMPTY_PROFILE } from "./onboarding";

describe("listenerOf", () => {
  it("sends who listens with the other onboarding answers", () => {
    const profile = { ...EMPTY_PROFILE, interests: ["nature"], audience: "kids" };
    expect(listenerOf(profile)).toMatchObject({ interests: ["nature"], audience: "kids" });
  });

  it("leaves the audience out when it was skipped or is unknown", () => {
    expect(listenerOf(EMPTY_PROFILE).audience).toBeUndefined();
    expect(listenerOf({ ...EMPTY_PROFILE, audience: "teens" }).audience).toBeUndefined();
  });
});
