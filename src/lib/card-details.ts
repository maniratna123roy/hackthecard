import type { ContributionDay } from "./github";

// A decorative identity mark, not a QR code or a verification seal.
export function signatureCells(login: string): boolean[] {
  let seed = 2166136261;
  for (const char of login.toLowerCase()) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  const cells: boolean[] = [];
  for (let y = 0; y < 5; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < 3; x++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      row.push((seed >>> 0) % 2 === 0);
    }
    cells.push(...row, row[1] ?? false, row[0] ?? false);
  }
  return cells;
}

export function activityHighlights(days: ContributionDay[] | null) {
  if (!days?.length) return null;
  const unique = [...new Map(days.map((day) => [day.date, day])).values()];
  const peak = [...unique].sort((a, b) => b.count - a.count || a.date.localeCompare(b.date))[0];
  if (!peak) return null;
  return { activeDays: unique.filter((day) => day.count > 0).length, peak };
}