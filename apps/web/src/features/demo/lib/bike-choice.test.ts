import { describe, expect, it } from "vitest";
import { parseBike } from "./bike-choice";

describe("parseBike", () => {
  it("rides Veturilo by default, one's own bike only when picked", () => {
    expect(parseBike(null)).toBe("veturilo");
    expect(parseBike("veturilo")).toBe("veturilo");
    expect(parseBike("own")).toBe("own");
    expect(parseBike("x")).toBe("veturilo");
  });
});
