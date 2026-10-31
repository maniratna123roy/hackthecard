import { describe, expect, it } from "vitest";
import { classify, parseUsername, streaks, type Repo } from "./github";

const repo = (language: string | null, extra: Partial<Repo> = {}): Repo => ({
  name: "r", description: null, language, stars: 0, forks: 0, fork: false, topics: [], updatedAt: "2026-01-01", url: "", ...extra,
});

describe("classification", () => {
  it("no repos and no forks is Developer in Progress", () => {
    expect(classify([], 0, 0).title).toBe("Developer in Progress");
  });
  it("balanced frontend + backend is Full-Stack", () => {
    expect(classify([repo("TypeScript"), repo("TypeScript"), repo("Go"), repo("Python")], 0, 0).title).toBe("The Full-Stack Architect");
  });
  it("mostly Rust/C is Systems Engineer", () => {
    expect(classify([repo("Rust"), repo("C"), repo("Rust")], 0, 0).title).toBe("Systems Engineer");
  });
});

describe("streaks", () => {
  it("counts current streak ignoring an empty today", () => {
    const days = [
      { date: "2026-01-01", count: 0, level: 0 },
      { date: "2026-01-02", count: 2, level: 1 },
      { date: "2026-01-03", count: 1, level: 1 },
      { date: "2026-01-04", count: 0, level: 0 },
    ];
    expect(streaks(days, "2026-01-04")).toEqual({ current: 2, longest: 2 });
  });
});

describe("parseUsername", () => {
  it("accepts profile URLs", () => {
    expect(parseUsername("https://github.com/torvalds?tab=repos")).toBe("torvalds");
  });
});
