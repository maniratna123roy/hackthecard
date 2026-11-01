import { config } from "./config.js";
import { HttpError } from "./errors.js";

export async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "builder-card",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let res: Response;
  try {
    res = await fetch(config.GITHUB_API + path, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
  } catch (_err) {
    throw new HttpError(504, "GitHub did not respond in time");
  }

  if (res.status === 404) throw new HttpError(404, "GitHub user not found");
  if (
    res.status === 429 ||
    (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
  ) {
    throw new HttpError(429, "GitHub rate limit reached, try again later");
  }
  if (res.status === 403) throw new HttpError(502, "GitHub refused the request");
  if (!res.ok) throw new HttpError(502, `GitHub error ${res.status}`);

  return res.json() as Promise<T>;
}
