import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toPng } from "html-to-image";
import { fetchDeveloper } from "@/lib/github";
import { THEMES } from "@/lib/themes";
import { CardBack, CardFront } from "@/components/card/CollectibleCard";
import { ThemeArt } from "@/components/card/ThemeArt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HackTheCard — Your GitHub, printed as a collectible" },
      { name: "description", content: "Turn any public GitHub profile into an illustrated collectible card across twelve hand-built worlds." },
      { property: "og:title", content: "HackTheCard — Your GitHub, printed as a collectible" },
      { property: "og:description", content: "Twelve illustrated worlds. Real GitHub data. Flip, collect, export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function useCardScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1.35, e.contentRect.width / 576)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

function Index() {
  const [input, setInput] = useState("torvalds");
  const [user, setUser] = useState("torvalds");
  const [themeIdx, setThemeIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const theme = THEMES[themeIdx];
  const q = useQuery({ queryKey: ["dev", user], queryFn: () => fetchDeveloper(user), retry: false, staleTime: 5 * 60_000 });
  const { ref: stageRef, scale } = useCardScale();
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) { setUser(input.trim()); setFlipped(false); }
  };

  const exportSide = async (side: "front" | "back") => {
    const node = side === "front" ? frontRef.current : backRef.current;
    if (!node || !q.data) return;
    setExporting(side);
    try {
      await document.fonts.ready;
      const url = await toPng(node, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `hackthecard-${q.data.login}-${theme.id}-${side}.png`;
      a.click();
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-[1320px] items-end justify-between border-b border-foreground px-6 pb-3 pt-6 md:px-10">
        <div className="text-[22px] font-bold tracking-tight">
          Hack<span className="font-accent font-normal">the</span>Card
        </div>
        <div className="hidden text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:block">Series I · Twelve Worlds · Public GitHub data</div>
      </header>

      <main className="mx-auto grid max-w-[1320px] gap-10 px-6 pt-10 md:px-10 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <section className="flex flex-col">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">No. {theme.no} / 12 — {theme.name}</p>
          <h1 className="mt-4 text-[44px] font-bold leading-[0.98] tracking-[-0.035em]">
            Your commits,<br />
            <span className="font-accent font-normal">pressed into a</span><br />collectible.
          </h1>
          <p className="mt-5 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
            Enter any public GitHub profile. We read the real repositories, languages and contribution calendar — and print them on a card from one of twelve illustrated worlds.
          </p>

          <form onSubmit={submit} className="mt-8">
            <label htmlFor="gh" className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">GitHub username or profile URL</label>
            <div className="mt-2 flex border border-foreground bg-card">
              <span className="hidden select-none items-center pl-3 text-sm text-muted-foreground sm:flex">github.com/</span>
              <input id="gh" value={input} onChange={(e) => setInput(e.target.value)} placeholder="octocat" autoComplete="off" spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[15px] font-medium outline-none" />
              <button type="submit" disabled={q.isFetching} className="bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-primary disabled:opacity-60">
                {q.isFetching ? "Pressing…" : "Print card"}
              </button>
            </div>
          </form>

          {q.data && (
            <div className="mt-8 border-t border-border pt-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Export</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["front", "back"] as const).map((s) => (
                  <button key={s} onClick={() => exportSide(s)} disabled={!!exporting}
                    className="border border-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground hover:text-background disabled:opacity-50">
                    {exporting === s ? "Rendering…" : `Download ${s} · PNG`}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">High-resolution (3×) — just the card, nothing else.</p>
            </div>
          )}
        </section>

        <section>
          <div className="stage relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden px-4 py-10">
            <div className="pointer-events-none absolute left-5 top-4 text-[11px] uppercase tracking-[0.22em] text-stage-muted">{theme.name}</div>
            <div className="pointer-events-none absolute right-5 top-4 font-accent text-sm text-stage-muted">{theme.tagline}</div>
            <div ref={stageRef} className="w-full max-w-[780px]">
              {q.isPending ? (
                <div className="mx-auto animate-pulse rounded-[24px] bg-stage-muted/20" style={{ width: 576 * scale, height: 402 * scale }} />
              ) : q.isError ? (
                <div className="mx-auto max-w-sm text-center text-stage-foreground">
                  <p className="font-accent text-2xl">This card couldn't be printed.</p>
                  <p className="mt-2 text-sm text-stage-muted">{(q.error as Error).message}</p>
                </div>
              ) : (
                <div className="mx-auto" style={{ width: 576 * scale, height: 402 * scale }}>
                  <button
                    type="button"
                    onClick={() => setFlipped((f) => !f)}
                    aria-label={flipped ? "Show front of card" : "Turn card over"}
                    aria-pressed={flipped}
                    className="card-3d block origin-top-left focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary"
                    style={{ width: 576, height: 402, transform: `scale(${scale})` }}
                  >
                    <div className="card-inner" data-flipped={flipped}>
                      <div className="card-face"><CardFront d={q.data} theme={theme} ref={frontRef} /></div>
                      <div className="card-face card-back"><CardBack d={q.data} theme={theme} ref={backRef} /></div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            {q.data && <p className="mt-6 text-xs text-stage-muted">Click or press Enter to turn the card over.</p>}
          </div>
        </section>
      </main>

      <section className="mx-auto max-w-[1320px] px-6 pb-16 pt-14 md:px-10">
        <div className="flex items-end justify-between border-b border-foreground pb-3">
          <h2 className="text-2xl font-bold tracking-tight">The Series <span className="font-accent font-normal text-muted-foreground">— twelve worlds</span></h2>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Select a world</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
          {THEMES.map((t, i) => (
            <button key={t.id} onClick={() => setThemeIdx(i)} className="group text-left" aria-pressed={i === themeIdx}>
              <div className="relative aspect-[1.45] overflow-hidden rounded-[12px] p-[4px] transition-transform duration-300 group-hover:-translate-y-1" style={{ background: t.frame }}>
                <div className="relative h-full w-full overflow-hidden rounded-[8px]">
                  <ThemeArt theme={t.id} layer="back" className="absolute inset-0 h-full w-full" />
                  <ThemeArt theme={t.id} layer="fore" className="absolute inset-0 h-full w-full" />
                </div>
                {i === themeIdx && <div className="absolute -inset-[3px] rounded-[14px] border-2 border-primary" />}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">{t.no}</span>
                <span className="font-accent text-[15px]">{t.name}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Profile and repository data from the public GitHub API (latest 100 repositories). Contribution calendar via github-contributions-api.jogruber.de. Titles are assigned by fixed rules from repository languages and topics — never at random.
        </p>
      </section>
    </div>
  );
}
