import { describe, expect, it } from "vitest";
import { afterStory, parseAutoAdvance } from "./story-advance";

describe("afterStory", () => {
  const ride = { activeIndex: 2, stopCount: 5 };

  it("automatycznie bierze miejsce, do którego dojechałeś", () => {
    expect(afterStory({ ...ride, dueIndex: 3, auto: true })).toBe(3);
  });

  it("po przeciągniętej opowieści przeskakuje do miejsca, przy którym już jesteś", () => {
    expect(afterStory({ ...ride, dueIndex: 4, auto: true })).toBe(4);
  });

  it("automatycznie czeka, póki nie dojedziesz do następnego miejsca", () => {
    expect(afterStory({ ...ride, dueIndex: 2, auto: true })).toBe("wait");
  });

  it("ręcznie czeka na Następne (muzyka gra dalej), nawet gdy następne miejsce już jest", () => {
    expect(afterStory({ ...ride, dueIndex: 4, auto: false })).toBe("wait");
  });

  it("po ostatnim miejscu milknie w obu trybach", () => {
    const last = { activeIndex: 4, stopCount: 5, dueIndex: 4 };
    expect(afterStory({ ...last, auto: true })).toBe("stop");
    expect(afterStory({ ...last, auto: false })).toBe("stop");
  });
});

describe("parseAutoAdvance", () => {
  it("domyślnie automatycznie, ręcznie tylko po wyborze", () => {
    expect(parseAutoAdvance(null)).toBe(true);
    expect(parseAutoAdvance("manual")).toBe(false);
  });
});
