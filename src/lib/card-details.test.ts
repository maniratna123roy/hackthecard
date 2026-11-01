import { describe, expect, it } from "vitest";
import { activityHighlights, signatureCells } from "./card-details";

describe("card identity mark", () => {
  it("is stable across username casing and differs between profiles", () => {
    expect(signatureCells("Torvalds")).toEqual(signatureCells("torvalds"));
    expect(signatureCells("torvalds")).not.toEqual(signatureCells("gaearon"));
    expect(signatureCells("torvalds")).toHaveLength(25);
  });
});

describe("activity highlights", () => {
  it("uses real active days and the highest contribution day", () => {
    expect(activityHighlights([
      { date: "2026-01-01", count: 0, level: 0 },
      { date: "2026-01-02", count: 12, level: 4 },
      { date: "2026-01-03", count: 3, level: 1 },
    ])).toEqual({ activeDays: 2, peak: { date: "2026-01-02", count: 12, level: 4 } });
  });
  it("does not invent activity when the calendar is unavailable", () => {
    expect(activityHighlights(null)).toBeNull();
    expect(activityHighlights([])).toBeNull();
  });
});