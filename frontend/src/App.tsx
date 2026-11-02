import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toPng } from "html-to-image";
import { fetchDeveloper } from "@/lib/api";
import { THEMES } from "@/lib/themes";
import { CardBack, CardFront, PocketCard } from "@/components/card/CollectibleCard";
import { Hero, Manifesto, SiteHeader } from "@/components/landing/Hero";
import { PrivacyModal } from "@/components/landing/PrivacyModal";
import { CardLoader } from "@/components/card/CardLoader";
import { ThemeArt } from "@/components/card/ThemeArt";

function useCardScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setScale(Math.min(1.35, e.contentRect.width / 576)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export function App() {
  const [input, setInput] = useState("torvalds");
  const [user, setUser] = useState("torvalds");
  const [themeIdx, setThemeIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [hold, setHold] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(() => {
    return localStorage.getItem("htc_policy_accepted") !== "false";
  });
  const [policyError, setPolicyError] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);

  const handlePolicyChange = (accepted: boolean) => {
    setPolicyAccepted(accepted);
    localStorage.setItem("htc_policy_accepted", String(accepted));
    if (accepted) setPolicyError(false);
  };

  const startHold = () => {
    setHold(true);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setHold(false), 2800);
  };

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);
  const scrollToStage = () => document.getElementById("generate")?.scrollIntoView({ behavior: "smooth" });
  const theme = THEMES[themeIdx] ?? THEMES[0]!;

  const q = useQuery({
    queryKey: ["dev", user],
    queryFn: () => fetchDeveloper(user),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const { ref: stageRef, scale } = useCardScale();
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const pocketRef = useRef<HTMLDivElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!policyAccepted) {
      setPolicyError(true);
      return;
    }
    setPolicyError(false);
    if (input.trim()) {
      setUser(input.trim());
      setFlipped(false);
      startHold();
      scrollToStage();
    }
  };

  const exportSide = async (side: "front" | "back" | "pocket") => {
    const node = side === "front" ? frontRef.current : side === "back" ? backRef.current : pocketRef.current;
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
      <SiteHeader onOpenPrivacy={() => setPrivacyOpen(true)} />
      <Hero
        policyAccepted={policyAccepted}
        setPolicyAccepted={handlePolicyChange}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onGenerate={(u) => {
          setInput(u);
          setUser(u);
          setFlipped(false);
          startHold();
        }}
      />

      <main
        id="generate"
        className="scroll-mt-20 mx-auto grid max-w-[1320px] gap-10 px-6 pt-16 md:px-10 lg:grid-cols-[minmax(300px,380px)_1fr]"
      >
        <section className="flex flex-col">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
            No. {theme.no} / 12 — {theme.name}
          </p>
          <h1 className="mt-4 text-[44px] font-bold leading-[0.98] tracking-[-0.035em]">
            Your commits,<br />
            <span className="font-accent font-normal">pressed into a</span><br />
            collectible.
          </h1>
          <p className="mt-5 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
            Enter any public GitHub profile. We read the real repositories, languages and contribution calendar — and
            print them on a card from one of twelve illustrated worlds.
          </p>

          <form onSubmit={submit} className="mt-8">
            <label htmlFor="gh" className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              GitHub username or profile URL
            </label>
            <div className="mt-2 flex border border-foreground bg-card">
              <span className="hidden select-none items-center pl-3 text-sm text-muted-foreground sm:flex">
                github.com/
              </span>
              <input
                id="gh"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (policyError) setPolicyError(false);
                }}
                placeholder="octocat"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[15px] font-medium outline-none"
              />
              <button
                type="submit"
                disabled={q.isFetching}
                className="bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-primary disabled:opacity-60"
              >
                {q.isFetching ? "Pressing…" : "Print card"}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="policy-checkbox"
                checked={policyAccepted}
                onChange={(e) => handlePolicyChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-foreground"
              />
              <label htmlFor="policy-checkbox" className="cursor-pointer select-none text-xs text-muted-foreground">
                I accept the{" "}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="font-semibold text-foreground underline hover:text-pop-red"
                >
                  Privacy Policy
                </button>
              </label>
            </div>
            {policyError && (
              <p className="mt-2 text-xs font-semibold text-pop-red">
                Please accept the privacy policy to continue.
              </p>
            )}
          </form>

          {q.data && (
            <div className="mt-8 border-t border-border pt-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Export</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["front", "back", "pocket"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => exportSide(s)}
                    disabled={!!exporting}
                    className="border border-foreground px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
                  >
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
            <div className="pointer-events-none absolute left-5 top-4 text-[11px] uppercase tracking-[0.22em] text-stage-muted">
              {theme.name}
            </div>
            <div className="pointer-events-none absolute right-5 top-4 font-accent text-sm text-stage-muted">
              {theme.tagline}
            </div>
            <div ref={stageRef} className="w-full max-w-[780px]">
              {q.isFetching || hold || (!q.data && !q.isError) ? (
                <CardLoader width={576 * scale} height={Math.max(402 * scale, 360)} />
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
                      <div className="card-face">
                        <CardFront d={q.data!} theme={theme} ref={frontRef} />
                      </div>
                      <div className="card-face card-back">
                        <CardBack d={q.data!} theme={theme} ref={backRef} />
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            {q.data && !q.isFetching && (
              <p className="mt-6 text-xs text-stage-muted">Click or press Enter to turn the card over.</p>
            )}
            {q.data && !q.isFetching && (
              <div className="mt-10 flex flex-col items-center">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-stage-muted">
                  Pocket edition
                </p>
                <PocketCard d={q.data} theme={theme} ref={pocketRef} />
              </div>
            )}
          </div>
        </section>
      </main>

      <section id="series" className="scroll-mt-20 mx-auto max-w-[1320px] px-6 pb-16 pt-14 md:px-10">
        <div className="flex items-end justify-between border-b border-foreground pb-3">
          <h2 className="text-2xl font-bold tracking-tight">
            The Series <span className="font-accent font-normal text-muted-foreground">— twelve worlds</span>
          </h2>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Select a world</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
          {THEMES.map((t, i) => (
            <button key={t.id} onClick={() => setThemeIdx(i)} className="group text-left" aria-pressed={i === themeIdx}>
              <div
                className="relative aspect-[1.45] overflow-hidden rounded-[12px] p-[4px] transition-transform duration-300 group-hover:-translate-y-1"
                style={{ background: t.frame }}
              >
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
          Profile and repository data from the public GitHub API (latest 100 repositories). Contribution calendar via
          github-contributions-api.jogruber.de. Titles are assigned by fixed rules from repository languages and
          topics — never at random.
        </p>
      </section>
      <Manifesto onOpenPrivacy={() => setPrivacyOpen(true)} />

      <PrivacyModal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        onAccept={() => handlePolicyChange(true)}
        isAccepted={policyAccepted}
      />
    </div>
  );
}

export default App;
