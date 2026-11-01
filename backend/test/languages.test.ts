import { describe, expect, it } from "vitest";
import { aggregateLanguages } from "../src/languages.js";

describe("Core Logic 2: languages.ts", () => {
  it("percentages from bytes", () => {
    const out = aggregateLanguages([
      { TypeScript: 60000, CSS: 10000 },
      { Python: 30000 },
    ]);
    expect(out.map((x) => [x.language, x.percent])).toEqual([
      ["TypeScript", 60],
      ["Python", 30],
      ["CSS", 10],
    ]);
  });

  it("empty input gives empty list", () => {
    expect(aggregateLanguages([])).toEqual([]);
  });
});
