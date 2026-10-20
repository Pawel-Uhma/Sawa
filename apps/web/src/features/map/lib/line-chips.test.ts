import { describe, expect, it } from "vitest";
import { type ChipLine, lineChipId, parseLineChipId } from "./line-chips";

describe("lineChipId", () => {
  it("reads back the lines of a transfer", () => {
    const lines: ChipLine[] = [
      { line: "122", mode: "bus", color: "#d62828" },
      { line: "15", mode: "tram", color: "#1d4ed8" },
    ];
    expect(parseLineChipId(lineChipId("dark", lines))).toEqual({ theme: "dark", lines });
  });

  it("keeps line numbers with letters and dashes", () => {
    const lines: ChipLine[] = [{ line: "N-44~", mode: "bus", color: "#7c3aed" }];
    expect(parseLineChipId(lineChipId("light", lines))?.lines).toEqual(lines);
  });

  it("reads back an exit chip with its language", () => {
    const lines: ChipLine[] = [{ line: "106", mode: "bus", color: "#d62828" }];
    expect(parseLineChipId(lineChipId("light", lines, { lang: "pl" }))).toEqual({
      theme: "light",
      lines,
      exit: { lang: "pl" },
    });
    expect(parseLineChipId(lineChipId("light", lines))?.exit).toBeUndefined();
  });

  it("does not take other images", () => {
    expect(parseLineChipId("sawa-timer-light-d62828-m5")).toBeNull();
  });
});
