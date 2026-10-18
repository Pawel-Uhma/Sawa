import { describe, expect, it } from "vitest";
import { factPlainText, factSegments } from "./fact-markup";

describe("factSegments", () => {
  it("drops the doubled colon after a bold label and softens the shouting caps", () => {
    expect(factSegments("**BUDOWA:**: ok. 1902 r. Wolnostojący dom.")).toEqual([
      { text: "Budowa:", strong: true },
      { text: " ok. 1902 r. Wolnostojący dom." },
    ]);
  });

  it("keeps a mixed-case label and bolds an inline date", () => {
    expect(factSegments("**Budowa:**: **ok. 1880** Zabudowania powstały.")).toEqual([
      { text: "Budowa:", strong: true },
      { text: " " },
      { text: "ok. 1880", strong: true },
      { text: " Zabudowania powstały." },
    ]);
  });

  it("turns _…_ into emphasis", () => {
    expect(factSegments("Dom parterowy. _Uwaga: Początkowo jedna działka._")).toEqual([
      { text: "Dom parterowy. " },
      { text: "Uwaga: Początkowo jedna działka.", em: true },
    ]);
  });

  it("unescapes markdown escapes inside and outside emphasis", () => {
    expect(factPlainText('Rozbudowa: \\- **około 1900** hala, _"na rogu \\[Wierzbowej\\]"_')).toBe(
      'Rozbudowa: – około 1900 hala, "na rogu [Wierzbowej]"',
    );
  });

  it("cuts the site boilerplate after * * * and the trailing source", () => {
    expect(
      factPlainText(
        "Zniszczony: 1944 * * * Na temat tego budynku albo nie posiadamy więcej informacji, przejdź **do formularza**.",
      ),
    ).toBe("Zniszczony: 1944");
    expect(factPlainText("Targ na Woli. (Wikipedia pl: Kercelak)")).toBe("Targ na Woli.");
  });

  it("leaves underscores inside words and plain text alone", () => {
    expect(factSegments("plik nazwa_pliku_v2 i 3 * 4")).toEqual([
      { text: "plik nazwa_pliku_v2 i 3 * 4" },
    ]);
  });
});
