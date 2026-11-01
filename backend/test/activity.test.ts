import { describe, expect, it } from "vitest";
import { summariseActivity, type GitHubEvent } from "../src/activity.js";

describe("Core Logic 3: activity.ts", () => {
  it("counts only recent events within 30-day window", () => {
    const now = Date.now();
    const ev = (days: number, extra: Partial<GitHubEvent> = {}): GitHubEvent => ({
      type: "PushEvent",
      repo: { name: "x/y" },
      created_at: new Date(now - days * 86400000).toISOString(),
      payload: { size: 2 },
      ...extra,
    });
    const out = summariseActivity([ev(1), ev(40)], now);
    expect(out.commits).toBe(2);
    expect(out.reposTouched).toBe(1);
    expect(out.latest).toHaveLength(1);
    expect(out.latest[0]!.text).toBe("Pushed 2 commits to x/y");
  });
});
