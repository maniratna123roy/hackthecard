import { gh } from "./github.js";
import { config } from "./config.js";
import type { RawRepo } from "./ranking.js";

export interface LanguageStat {
  language: string;
  bytes: number;
  percent: number;
}

// network: GET /repos/{owner}/{repo}/languages for each repo, in parallel.
// allSettled: one failing repo must not break the whole card.
export async function fetchLanguageMaps(
  repos: RawRepo[],
): Promise<Record<string, number>[]> {
  const settled = await Promise.allSettled(
    repos.map((r) => gh<Record<string, number>>(`/repos/${r.owner.login}/${r.name}/languages`)),
  );
  return settled
    .filter(
      (s): s is PromiseFulfilledResult<Record<string, number>> =>
        s.status === "fulfilled",
    )
    .map((s) => s.value);
}

// pure: [{TypeScript: 60000, CSS: 10000}, {Python: 30000}] -> percentages
export function aggregateLanguages(
  maps: Record<string, number>[],
  {
    top = 4,
    ignore = config.IGNORED_LANGUAGES,
  }: { top?: number; ignore?: Set<string> } = {},
): LanguageStat[] {
  const totals: Record<string, number> = {};
  for (const map of maps) {
    for (const [lang, bytes] of Object.entries(map)) {
      if (ignore.has(lang)) continue;
      totals[lang] = (totals[lang] || 0) + bytes;
    }
  }

  const grand = Object.values(totals).reduce((a, b) => a + b, 0);
  if (grand === 0) return [];

  const sorted = Object.entries(totals)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percent: (bytes / grand) * 100,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const head = sorted.slice(0, top);
  const rest = sorted.slice(top);
  if (rest.length) {
    const bytes = rest.reduce((sum, x) => sum + x.bytes, 0);
    head.push({ language: "Other", bytes, percent: (bytes / grand) * 100 });
  }

  return head.map((x) => ({
    ...x,
    percent: Math.round(x.percent * 10) / 10,
  }));
}
