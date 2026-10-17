import { describe, expect, it } from "vitest";
import { assignSubkind } from "./subkind";

const of = (name: string, kind = "building", tags: string[] = []) =>
  assignSubkind({ kind, name, tags });

describe("assignSubkind", () => {
  it("keeps kinds that already name the marker", () => {
    expect(of("Pomnik Bohaterów Getta", "monument")).toBe("monument");
    expect(of("Ulica Ogrodowa", "street")).toBe("street");
    expect(of("Mural Powstańczy", "mural")).toBe("mural");
  });

  it("reads the type from the name", () => {
    expect(of("Pałac Paca")).toBe("palace");
    expect(of("Kino „Muranów”")).toBe("cinema");
    expect(of("Szpital św. Rocha w Warszawie")).toBe("hospital");
    expect(of("Most Gdański", "site")).toBe("bridge");
    expect(of("Fort Bema", "site")).toBe("fortress");
  });

  it("lets the first word in the name win", () => {
    expect(of("Park Harcerskiej Poczty Polowej", "site")).toBe("park");
    expect(of("Szpital Wolski (dziś Instytut Gruźlicy)")).toBe("hospital");
    expect(of("Hala Sportowa „Reduta”", "site")).toBe("stadium");
  });

  it("ignores the address part of the name", () => {
    expect(of("Kamienica przy Targowej 50")).toBe("tenement");
    expect(of("Willa M. Friedberga, Belwederska 18")).toBe("manor");
    expect(of("Ogrodowa 67 (mural Jana Lityńskiego)")).toBe("building");
  });

  it("keeps a church sacred whatever else its name says", () => {
    expect(of("Cerkiew św. Tatiany w Pałacu Staszica", "church")).toBe("orthodox");
    expect(of("Kaplica zamkowa", "church")).toBe("chapel");
    expect(of("Kościół garnizonowy", "church")).toBe("church");
  });

  it("names a metro station after the station, not what is above it", () => {
    expect(of("Politechnika (stacja metra)", "site")).toBe("station");
  });

  it("falls back to tags, then to a pin", () => {
    expect(of("Orlik przy SP 12", "site", ["sport"])).toBe("pitch");
    expect(of("Bulwar nad Wisłą", "site", ["nature"])).toBe("water");
    expect(of("Zieleniec", "site", ["nature"])).toBe("park");
    expect(of("Kępa", "site", ["nature"])).toBe("park");
    expect(of("Kercelak", "site")).toBe("site");
    expect(of("Dom Technika")).toBe("building");
  });
});
