import { config } from "./config.js";

const DAY = 86400000;
const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : "");

export interface GitHubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload?: {
    action?: string;
    size?: number;
    commits?: unknown[];
    ref_type?: string;
  };
}

export interface ActivitySummary {
  windowDays: number;
  commits: number;
  pullRequests: number;
  newRepos: number;
  reposTouched: number;
  latest: {
    type: string;
    repo: string;
    text: string;
    createdAt: string;
  }[];
}

export function describe(e: GitHubEvent): string {
  const repo = e.repo.name;
  switch (e.type) {
    case "PushEvent": {
      const n = e.payload?.size ?? e.payload?.commits?.length ?? 1;
      return `Pushed ${n} commit${n === 1 ? "" : "s"} to ${repo}`;
    }
    case "PullRequestEvent":
      return `${cap(e.payload?.action || "")} a pull request in ${repo}`;
    case "IssuesEvent":
      return `${cap(e.payload?.action || "")} an issue in ${repo}`;
    case "CreateEvent":
      return e.payload?.ref_type === "repository"
        ? `Created repository ${repo}`
        : `Created ${e.payload?.ref_type} in ${repo}`;
    case "WatchEvent":
      return `Starred ${repo}`;
    default:
      return `${e.type.replace("Event", "")} in ${repo}`;
  }
}

export function summariseActivity(
  events: GitHubEvent[],
  now = Date.now(),
  days = config.ACTIVITY_DAYS,
): ActivitySummary {
  const cutoff = now - days * DAY;
  const recent = (Array.isArray(events) ? events : []).filter(
    (e) => new Date(e.created_at).getTime() >= cutoff,
  );

  let commits = 0;
  let pullRequests = 0;
  let newRepos = 0;
  const touched = new Set<string>();

  for (const e of recent) {
    touched.add(e.repo.name);
    if (e.type === "PushEvent") {
      commits += e.payload?.size ?? e.payload?.commits?.length ?? 1;
    } else if (e.type === "PullRequestEvent" && e.payload?.action === "opened") {
      pullRequests++;
    } else if (e.type === "CreateEvent" && e.payload?.ref_type === "repository") {
      newRepos++;
    }
  }

  return {
    windowDays: days,
    commits,
    pullRequests,
    newRepos,
    reposTouched: touched.size,
    latest: recent.slice(0, config.FEED_SIZE).map((e) => ({
      type: e.type,
      repo: e.repo.name,
      text: describe(e),
      createdAt: e.created_at,
    })),
  };
}
