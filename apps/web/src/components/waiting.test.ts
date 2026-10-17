import { describe, expect, it } from "vitest";
import { waitStepText } from "./waiting";

const STEPS = [
  { afterSec: 0, text: "rozkład" },
  { afterSec: 3, text: "miejsca" },
  { afterSec: 14, text: "jeszcze chwila" },
];

describe("waitStepText", () => {
  it("starts with the first step", () => {
    expect(waitStepText(STEPS, 0)).toBe("rozkład");
  });

  it("moves on once a step's time has passed", () => {
    expect(waitStepText(STEPS, 3)).toBe("miejsca");
    expect(waitStepText(STEPS, 13)).toBe("miejsca");
  });

  it("stays on the last step however long it takes", () => {
    expect(waitStepText(STEPS, 600)).toBe("jeszcze chwila");
  });

  it("is null without steps", () => {
    expect(waitStepText([], 5)).toBeNull();
  });
});
