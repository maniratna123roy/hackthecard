import { gh } from "../github.js";
import { rankRepos, type RawRepo } from "../ranking.js";
import { fetchLanguageMaps, aggregateLanguages, type LanguageStat } from "../languages.js";
import { summariseActivity, type GitHubEvent, type ActivitySummary } from "../activity.js";
import { config } from "../config.js";

export interface CardProfile {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  profileUrl: string;
  createdAt: string;
}

export interface CardRepo {
  name: string;
  url: string;
  description: string | null;
  homepage: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  pushedAt: string | null;
  score: number;
}

export interface CardData {
  profile: CardProfile;
  topRepos: CardRepo[];
  languages: LanguageStat[];
  activity: ActivitySummary;
  meta: {
    generatedAt: string;
    cached: boolean;
  };
  classification?: {
    title: string;
    reason: string;
  };
  serial?: string;
  streak?: number | null;
  longestStreak?: number | null;
  contributions?: { date: string; count: number; level: number }[] | null;
  contributionTotal?: number | null;
}

function serialFor(login: string, id: number): string {
  return String(id % 100000).padStart(5, "0") + "-" + login.slice(0, 3).toUpperCase();
}

const FRONTEND = ["JavaScript", "TypeScript", "HTML", "CSS", "SCSS", "Vue", "Svelte", "Astro", "Dart"];
const BACKEND = ["Go", "Java", "C#", "PHP", "Ruby", "Python", "Kotlin", "Elixir", "Scala"];
const SYSTEMS = ["C", "C++", "Rust", "Zig", "Assembly", "Nim"];
const CLOUD = ["HCL", "Dockerfile", "Shell", "Nix", "Smarty"];
const AI_WORDS = /\b(ai|ml|llm|gpt|neural|machine[- ]learning|deep[- ]learning|transformer|pytorch|tensorflow|diffusion|rag)\b/i;
const ALGO_WORDS = /\b(leetcode|algorithm|algorithms|competitive|codeforces|data[- ]structures|dsa)\b/i;
const CLOUD_WORDS = /\b(kubernetes|k8s|docker|terraform|aws|gcp|azure|serverless|devops|helm)\b/i;

function classify(repos: RawRepo[], totalStars: number, forkedCount: number) {
  if (repos.length === 0) {
    return forkedCount > 0
      ? { title: "Open Source Contributor", reason: `No original public repositories yet, but ${forkedCount} forked projects show open-source participation.` }
      : { title: "Developer in Progress", reason: "Not enough public repository data to classify yet." };
  }
  const text = repos.map((r) => `${r.name} ${r.description ?? ""} ${(r.topics || []).join(" ")}`).join(" ");
  const counts: Record<string, number> = {};
  let withLang = 0;
  for (const r of repos) {
    if (r.language) {
      counts[r.language] = (counts[r.language] ?? 0) + 1;
      withLang++;
    }
  }
  const share = (list: string[]) => withLang ? list.reduce((a, l) => a + (counts[l] ?? 0), 0) / withLang : 0;
  const fe = share(FRONTEND), be = share(BACKEND), sys = share(SYSTEMS), cl = share(CLOUD);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const aiHits = repos.filter((r) => AI_WORDS.test(`${r.name} ${r.description ?? ""} ${(r.topics || []).join(" ")}`)).length;

  if (aiHits >= 2 && aiHits / repos.length >= 0.2)
    return { title: "AI Innovator", reason: `${aiHits} of ${repos.length} repositories mention AI/ML in names, descriptions or topics.` };
  if (ALGO_WORDS.test(text) && repos.filter((r) => ALGO_WORDS.test(`${r.name} ${r.description ?? ""}`)).length >= 2)
    return { title: "Algorithmic Thinker", reason: "Multiple repositories focus on algorithms or competitive programming." };
  if (CLOUD_WORDS.test(text) && (cl >= 0.15 || repos.filter((r) => CLOUD_WORDS.test((r.topics || []).join(" ") + " " + (r.description ?? ""))).length >= 3))
    return { title: "Cloud Native Builder", reason: "Infrastructure topics and tooling languages appear across repositories." };
  if (sys >= 0.4) return { title: "Systems Engineer", reason: `${pct(sys)} of repositories use systems languages (C, C++, Rust…).` };
  if (fe >= 0.25 && be >= 0.25) return { title: "The Full-Stack Architect", reason: `Balanced mix: ${pct(fe)} frontend and ${pct(be)} backend languages.` };
  if (fe >= 0.5) return { title: "Frontend Craftsman", reason: `${pct(fe)} of repositories use web/frontend languages.` };
  if (be >= 0.5) return { title: "Backend Engineer", reason: `${pct(be)} of repositories use server-side languages.` };
  if (totalStars >= 500) return { title: "Open Source Explorer", reason: `${totalStars.toLocaleString()} stars earned across public work.` };
  if (forkedCount > repos.length) return { title: "Open Source Contributor", reason: `${forkedCount} forks of other projects outnumber original repositories.` };
  return { title: "The Problem Solver", reason: "A varied repository mix with no single dominant specialty." };
}

function calcStreaks(days: { date: string; count: number }[], today = new Date().toISOString().slice(0, 10)) {
  const sorted = days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const d of sorted) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.count > 0) current++;
    else if (i === sorted.length - 1 && sorted[i]!.date === today) continue;
    else break;
  }
  return { current, longest };
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  followers: number;
  following: number;
  public_repos: number;
  html_url: string;
  created_at: string;
}

export async function buildCard(username: string): Promise<CardData> {
  const u = await gh<GitHubUser>(`/users/${encodeURIComponent(username)}`);

  const [repos, events, contrib] = await Promise.all([
    gh<RawRepo[]>(`/users/${u.login}/repos?per_page=100&sort=pushed`),
    gh<GitHubEvent[]>(`/users/${u.login}/events/public?per_page=100`).catch(() => []),
    fetch(`https://github-contributions-api.jogruber.de/v4/${u.login}?y=last`, {
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => (r.ok ? (r.json() as Promise<any>) : null))
      .catch(() => null),
  ]);

  const ranked = rankRepos(repos);
  const langMaps = await fetchLanguageMaps(ranked.slice(0, config.LANG_SAMPLE));
  const languages = aggregateLanguages(langMaps);
  const activity = summariseActivity(events);

  const ownRepos = (repos || []).filter((r) => !r.fork);
  const forkedCount = (repos || []).length - ownRepos.length;
  const totalStars = ownRepos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const classification = classify(ownRepos, totalStars, forkedCount);

  const days = contrib?.contributions ?? null;
  const streakInfo = days ? calcStreaks(days) : null;

  return {
    profile: {
      login: u.login,
      name: u.name || u.login,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      location: u.location,
      followers: u.followers,
      following: u.following,
      publicRepos: u.public_repos,
      profileUrl: u.html_url,
      createdAt: u.created_at,
    },
    topRepos: ranked.slice(0, config.TOP_REPOS).map((r) => ({
      name: r.name,
      url: r.html_url || `https://github.com/${r.owner?.login || u.login}/${r.name}`,
      description: r.description,
      homepage: r.homepage,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language || null,
      topics: r.topics || [],
      pushedAt: r.pushed_at,
      score: Math.round(r.score * 10) / 10,
    })),
    languages,
    activity,
    meta: {
      generatedAt: new Date().toISOString(),
      cached: false,
    },
    classification,
    serial: serialFor(u.login, u.id),
    streak: streakInfo?.current ?? null,
    longestStreak: streakInfo?.longest ?? null,
    contributions: days,
    contributionTotal: contrib?.total?.lastYear ?? null,
  };
}
