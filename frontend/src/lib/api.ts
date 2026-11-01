import { fetchDeveloperDirect, type DeveloperData, type Repo } from "./github";

export async function fetchDeveloper(username: string): Promise<DeveloperData> {
  const cleanUsername = username.trim().replace(/^@/, "");
  try {
    const res = await fetch(`/api/card/${encodeURIComponent(cleanUsername)}`);
    if (res.ok) {
      const card = await res.json();
      // Map the backend Builder Card JSON to DeveloperData
      const profile = card.profile || {};
      const repos: Repo[] = (card.topRepos || []).map((r: any) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stars,
        forks: r.forks,
        fork: false,
        topics: r.topics || [],
        updatedAt: r.pushedAt || new Date().toISOString(),
        url: r.url,
      }));

      return {
        login: profile.login || cleanUsername,
        name: profile.name || profile.login || cleanUsername,
        avatar: profile.avatarUrl || `https://github.com/${cleanUsername}.png`,
        bio: profile.bio || null,
        location: profile.location || null,
        createdAt: profile.createdAt || new Date().toISOString(),
        url: profile.profileUrl || `https://github.com/${cleanUsername}`,
        publicRepos: profile.publicRepos ?? repos.length,
        followers: profile.followers ?? 0,
        following: profile.following ?? 0,
        repos,
        forkedCount: 0,
        totalStars: repos.reduce((a, r) => a + r.stars, 0),
        totalForks: repos.reduce((a, r) => a + r.forks, 0),
        topRepos: repos.slice(0, 3),
        recentRepos: repos.slice(0, 3),
        languages: (card.languages || []).map((l: any) => ({
          name: l.language,
          count: l.bytes,
          share: l.percent / 100,
        })),
        contributions: card.contributions || null,
        contributionTotal: card.contributionTotal ?? (card.activity?.commits ?? null),
        streak: card.streak ?? null,
        longestStreak: card.longestStreak ?? null,
        classification: card.classification || {
          title: "The Problem Solver",
          reason: "Active repository builder with multifaceted public activity.",
        },
        serial: card.serial || "00001-DEV",
      };
    }

    if (res.status === 404 || res.status === 400 || res.status === 429) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Request failed");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (
      msg.includes("Invalid GitHub username") ||
      msg.includes("GitHub user not found") ||
      msg.includes("rate limit")
    ) {
      throw err;
    }
  }

  // Standalone / offline fallback
  return fetchDeveloperDirect(cleanUsername);
}
