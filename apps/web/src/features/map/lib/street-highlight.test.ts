import { describe, expect, it } from "vitest";
import { isStreetPlace, streetLineFilter, streetNameKeys } from "./street-highlight";

describe("streetNameKeys", () => {
  it("drops the street prefix OSM does not use", () => {
    expect(streetNameKeys("Chłodna")).toEqual(["chłodna"]);
    expect(streetNameKeys("Ulica Kacza")).toEqual(["ulica kacza", "kacza"]);
    expect(streetNameKeys("ul. Działdowska")).toEqual(["ul. działdowska", "działdowska"]);
    expect(streetNameKeys("ulica Jana Długosza")).toContain("jana długosza");
  });

  it("keeps 'aleja', as OSM does", () => {
    expect(streetNameKeys("Aleja „Solidarności”")).toContain("aleja „solidarności”");
    expect(streetNameKeys("al. Jana Pawła II")).toContain("aleja jana pawła ii");
  });

  it("ignores a trailing note in parentheses", () => {
    expect(streetNameKeys("Leszno (zachodni odcinek)")).toEqual(["leszno"]);
  });
});

describe("streetLineFilter", () => {
  it("matches nothing without a street", () => {
    expect(streetLineFilter(null)).toEqual([
      "in",
      ["downcase", ["coalesce", ["get", "name"], ""]],
      ["literal", []],
    ]);
  });
});

describe("isStreetPlace", () => {
  it("reads kind and subkind", () => {
    expect(isStreetPlace({ kind: "street" })).toBe(true);
    expect(isStreetPlace({ kind: "site", subkind: "street" })).toBe(true);
    expect(isStreetPlace({ kind: "building", subkind: "tenement" })).toBe(false);
  });
});
