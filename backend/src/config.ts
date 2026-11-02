export interface Config {
  PORT: number;
  GITHUB_API: string;
  CACHE_TTL_MS: number;
  TOP_REPOS: number;
  LANG_SAMPLE: number;
  ACTIVITY_DAYS: number;
  FEED_SIZE: number;
  RECENCY_DECAY_DAYS: number;
  SUBSTANCE_KB_CAP: number;
  ARCHIVED_PENALTY: number;
  WEIGHTS: {
    stars: number;
    recency: number;
    forks: number;
    substance: number;
    presentation: number;
  };
  IGNORED_LANGUAGES: Set<string>;
}

export const config: Config = {
  PORT: Number(process.env.PORT) || 3001,
  GITHUB_API: "https://api.github.com",
  CACHE_TTL_MS: 10 * 60 * 1000,
  TOP_REPOS: 5,
  LANG_SAMPLE: 10,
  ACTIVITY_DAYS: 30,
  FEED_SIZE: 5,
  RECENCY_DECAY_DAYS: 180,
  SUBSTANCE_KB_CAP: 500,
  ARCHIVED_PENALTY: 0.5,
  WEIGHTS: {
    stars: 0.3,
    recency: 0.3,
    forks: 0.1,
    substance: 0.15,
    presentation: 0.15,
  },
  IGNORED_LANGUAGES: new Set(["Jupyter Notebook"]),
};

export default config;
