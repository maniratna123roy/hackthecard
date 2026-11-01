import { describe, expect, it } from "vitest";
import { rankRepos, type RawRepo } from "../src/ranking.js";

const mk = (o: Partial<RawRepo> = {}): RawRepo => ({
  name: "r",
  owner: { login: "me" },
  fork: false,
  archived: false,
  stargazers_count: 0,
  forks_count: 0,
  size: 100,
  description: null,
  homepage: "",
  topics: [],
  pushed_at: new Date().toISOString(),
  ...o,
});

describe("Core Logic 1: ranking.ts", () => {
  it("forks are excluded when originals exist", () => {
    const out = rankRepos([mk({ name: "a" }), mk({ name: "b", fork: true })]);
    expect(out.map((r) => r.name)).toEqual(["a"]);
  });

  it("fresh repo beats stale repo with the same stars", () => {
    const old = new Date(Date.now() - 800 * 86400000).toISOString();
    const out = rankRepos([
      mk({ name: "old", pushed_at: old, stargazers_count: 5 }),
      mk({ name: "new", stargazers_count: 5 }),
    ]);
    expect(out[0]!.name).toBe("new");
  });

  it("all zero stars gives no NaN", () => {
    const out = rankRepos([mk({ name: "a" }), mk({ name: "b" })]);
    expect(out.every((r) => Number.isFinite(r.score))).toBe(true);
  });
});
