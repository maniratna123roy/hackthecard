export interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  fork: boolean;
  topics: string[];
  updatedAt: string;
  url: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

export interface Classification {
  title: string;
  reason: string;
}

export interface DeveloperData {
  login: string;
  name: string;
  avatar: string;
  bio: string | null;
  location: string | null;
  createdAt: string;
  url: string;
  publicRepos: number;
  followers: number;
  following: number;
  repos: Repo[];
  forkedCount: number;
  totalStars: number;
  totalForks: number;
  topRepos: Repo[];
  recentRepos: Repo[];
  languages: { name: string; count: number; share: number }[];
  contributions: ContributionDay[] | null;
  contributionTotal: number | null;
  streak: number | null;
  longestStreak: number | null;
  classification: Classification;
  serial: string;
}

export function parseUsername(input: string): string {
  const s = input.trim().replace(/^@/, "");
  const m = s.match(/github\.com\/([A-Za-z0-9-]+)/i);
  return (m?.[1] ?? s.split("/")[0] ?? "").trim();
}

const FRONTEND = ["JavaScript", "TypeScript", "HTML", "CSS", "SCSS", "Vue", "Svelte", "Astro", "Dart"];
const BACKEND = ["Go", "Java", "C#", "PHP", "Ruby", "Python", "Kotlin", "Elixir", "Scala"];
const SYSTEMS = ["C", "C++", "Rust", "Zig", "Assembly", "Nim"];
const CLOUD = ["HCL", "Dockerfile", "Shell", "Nix", "Smarty"];
const AI_WORDS = /\b(ai|ml|llm|gpt|neural|machine[- ]learning|deep[- ]learning|transformer|pytorch|tensorflow|diffusion|rag)\b/i;
const ALGO_WORDS = /\b(leetcode|algorithm|algorithms|competitive|codeforces|data[- ]structures|dsa)\b/i;
const CLOUD_WORDS = /\b(kubernetes|k8s|docker|terraform|aws|gcp|azure|serverless|devops|helm)\b/i;

export function classify(repos: Repo[], totalStars: number, forkedCount: number): Classification {
  if (repos.length === 0) {
    return forkedCount > 0
      ? { title: "Open Source Contributor", reason: `No original public repositories yet, but ${forkedCount} forked projects show open-source participation.` }
      : { title: "Developer in Progress", reason: "Not enough public repository data to classify yet." };
  }
  const text = repos.map((r) => `${r.name} ${r.description ?? ""} ${r.topics.join(" ")}`).join(" ");
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
  const aiHits = repos.filter((r) => AI_WORDS.test(`${r.name} ${r.description ?? ""} ${r.topics.join(" ")}`)).length;

  if (aiHits >= 2 && aiHits / repos.length >= 0.2)
    return { title: "AI Innovator", reason: `${aiHits} of ${repos.length} repositories mention AI/ML in names, descriptions or topics.` };
  if (ALGO_WORDS.test(text) && repos.filter((r) => ALGO_WORDS.test(`${r.name} ${r.description ?? ""}`)).length >= 2)
    return { title: "Algorithmic Thinker", reason: "Multiple repositories focus on algorithms or competitive programming." };
  if (CLOUD_WORDS.test(text) && (cl >= 0.15 || repos.filter((r) => CLOUD_WORDS.test(r.topics.join(" ") + " " + (r.description ?? ""))).length >= 3))
    return { title: "Cloud Native Builder", reason: "Infrastructure topics and tooling languages appear across repositories." };
  if (sys >= 0.4) return { title: "Systems Engineer", reason: `${pct(sys)} of repositories use systems languages (C, C++, Rust…).` };
  if (fe >= 0.25 && be >= 0.25) return { title: "The Full-Stack Architect", reason: `Balanced mix: ${pct(fe)} frontend and ${pct(be)} backend languages.` };
  if (fe >= 0.5) return { title: "Frontend Craftsman", reason: `${pct(fe)} of repositories use web/frontend languages.` };
  if (be >= 0.5) return { title: "Backend Engineer", reason: `${pct(be)} of repositories use server-side languages.` };
  if (totalStars >= 500) return { title: "Open Source Explorer", reason: `${totalStars.toLocaleString()} stars earned across public work.` };
  if (forkedCount > repos.length) return { title: "Open Source Contributor", reason: `${forkedCount} forks of other projects outnumber original repositories.` };
  return { title: "The Problem Solver", reason: "A varied repository mix with no single dominant specialty." };
}

export function streaks(days: ContributionDay[], today = new Date().toISOString().slice(0, 10)) {
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

function serialFor(login: string, id: number) {
  return String(id % 100000).padStart(5, "0") + "-" + login.slice(0, 3).toUpperCase();
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "HackTheCard-Backend",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (res.status === 404) throw new Error("No GitHub user found with that name.");
  if (res.status === 403 || res.status === 429) {
    throw new Error("GitHub's hourly limit for lookups was reached. Please try again in a little while or set GITHUB_TOKEN.");
  }
  if (!res.ok) throw new Error(`GitHub responded with ${res.status}.`);
  return res.json() as Promise<T>;
}
export async function fetchDeveloperProfile(username: string): Promise<DeveloperData> {
  const login = parseUsername(username);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) {
    throw new Error("That doesn't look like a valid GitHub username.");
  }

  const [user, rawRepos, contrib] = await Promise.all([
    gh<any>(`/users/${login}`),
    gh<any[]>(`/users/${login}/repos?per_page=100&sort=updated`),
    fetch(`https://github-contributions-api.jogruber.de/v4/${login}?y=last`)
      .then((r) => (r.ok ? (r.json() as Promise<any>) : null))
      .catch(() => null),
  ]);

  const all: Repo[] = (rawRepos || []).map((r: any) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    fork: Boolean(r.fork),
    topics: r.topics ?? [],
    updatedAt: r.pushed_at ?? r.updated_at ?? "",
    url: r.html_url,
  }));

  const repos = all.filter((r) => !r.fork);
  const forkedCount = all.length - repos.length;
  const totalStars = repos.reduce((a, r) => a + r.stars, 0);
  const totalForks = repos.reduce((a, r) => a + r.forks, 0);
  const topRepos = [...repos].sort((a, b) => b.stars * 2 + b.forks - (a.stars * 2 + a.forks) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const recentRepos = [...repos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);

  const lc: Record<string, number> = {};
  for (const r of repos) {
    if (r.language) lc[r.language] = (lc[r.language] ?? 0) + 1;
  }
  const langTotal = Object.values(lc).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(lc)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count, share: count / langTotal }));

  const days: ContributionDay[] | null = contrib?.contributions ?? null;
  const s = days ? streaks(days) : null;

  return {
    login: user.login,
    name: user.name || user.login,
    avatar: user.avatar_url,
    bio: user.bio,
    location: user.location,
    createdAt: user.created_at,
    url: user.html_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
    repos,
    forkedCount,
    totalStars,
    totalForks,
    topRepos,
    recentRepos,
    languages,
    contributions: days,
    contributionTotal: contrib?.total?.lastYear ?? null,
    streak: s?.current ?? null,
    longestStreak: s?.longest ?? null,
    classification: classify(repos, totalStars, forkedCount),
    serial: serialFor(user.login, user.id),
  };
}
