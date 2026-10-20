import { describe, expect, it } from "vitest";
import { isInsideScrolledContent, type ScrollNode } from "./gesture";

function node(parentElement: ScrollNode | null, scrollTop = 0): ScrollNode {
  return { scrollTop, parentElement };
}

describe("isInsideScrolledContent", () => {
  it("is false when nothing between the target and the sheet is scrolled", () => {
    const sheet = node(null);
    const list = node(sheet);
    expect(isInsideScrolledContent(node(list), sheet)).toBe(false);
  });

  it("is true for a scrolled nested transcript although the sheet is at the top", () => {
    const sheet = node(null);
    const transcript = node(node(sheet), 120);
    expect(isInsideScrolledContent(node(transcript), sheet)).toBe(true);
  });

  it("is true when the target itself is scrolled", () => {
    const sheet = node(null);
    expect(isInsideScrolledContent(node(sheet, 40), sheet)).toBe(true);
  });

  it("counts the sheet's own scroll", () => {
    const sheet = node(null, 10);
    expect(isInsideScrolledContent(node(sheet), sheet)).toBe(true);
  });

  it("ignores scrolled elements above the sheet", () => {
    const page = node(null, 500);
    const sheet = node(page);
    expect(isInsideScrolledContent(node(sheet), sheet)).toBe(false);
  });

  it("is false without a target", () => {
    expect(isInsideScrolledContent(null, node(null))).toBe(false);
  });
});
