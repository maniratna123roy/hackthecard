import { config } from "./config.js";

const DAY = 86400000;

export interface RawRepo {
  name: string;
  owner: { login: string };
  fork?: boolean;
  archived?: boolean;
  stargazers_count: number;
  forks_count: number;
  size: number;
  description: string | null;
  homepage: string | null;
  topics?: string[];
  pushed_at: string | null;
  html_url?: string;
  language?: string | null;
}

export interface RankedRepo extends RawRepo {
  score: number;
}

export function scoreRepo(
  repo: RawRepo,
  maxStars: number,
  maxForks: number,
  now = Date.now(),
): number {
  const pushed = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0;
  const days = Math.max(0, (now - pushed) / DAY);

  const stars = Math.log10(1 + repo.stargazers_count) / Math.log10(1 + maxStars);
  const forks = Math.log10(1 + repo.forks_count) / Math.log10(1 + maxForks);
  const recency = Math.exp(-days / config.RECENCY_DECAY_DAYS);
  const substance = Math.min(repo.size / config.SUBSTANCE_KB_CAP, 1);
  const presentation =
    (repo.description ? 0.5 : 0) +
    (repo.homepage ? 0.25 : 0) +
    (repo.topics && repo.topics.length ? 0.25 : 0);

  let score =
    100 *
    (config.WEIGHTS.stars * stars +
      config.WEIGHTS.recency * recency +
      config.WEIGHTS.forks * forks +
      config.WEIGHTS.substance * substance +
      config.WEIGHTS.presentation * presentation);

  if (repo.archived) score *= config.ARCHIVED_PENALTY;
  return score;
}

export function rankRepos(repos: RawRepo[], now = Date.now()): RankedRepo[] {
  // 1. drop forks and the profile-README repo (named after the user)
  let pool = repos.filter(
    (r) =>
      !r.fork &&
      (!r.owner?.login || r.name.toLowerCase() !== r.owner.login.toLowerCase()),
  );

  // 2. fallback: an account with only forks still gets a card
  if (pool.length === 0) pool = repos;

  // maxStars/maxForks are clamped to 1 so log10(1)=0 never divides 0 by 0
  const maxStars = Math.max(1, ...pool.map((r) => r.stargazers_count || 0));
  const maxForks = Math.max(1, ...pool.map((r) => r.forks_count || 0));

  const pushedAt = (r: RawRepo) =>
    r.pushed_at ? new Date(r.pushed_at).getTime() : 0;

  return pool
    .map((r) => ({ ...r, score: scoreRepo(r, maxStars, maxForks, now) }))
    .sort(
      (a, b) =>
        Math.round(b.score * 10) - Math.round(a.score * 10) ||
        pushedAt(b) - pushedAt(a),
    );
}
