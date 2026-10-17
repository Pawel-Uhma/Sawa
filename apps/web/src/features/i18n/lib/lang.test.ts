import { describe, expect, it } from "vitest";
import { parseLang, pick } from "./lang";

describe("parseLang", () => {
  it("defaults to Polish for anything but en", () => {
    expect(parseLang(null)).toBe("pl");
    expect(parseLang("de")).toBe("pl");
    expect(parseLang("en")).toBe("en");
  });
});

describe("pick", () => {
  it("returns the text for the language", () => {
    expect(pick("pl", "tak", "yes")).toBe("tak");
    expect(pick("en", "tak", "yes")).toBe("yes");
  });
});
