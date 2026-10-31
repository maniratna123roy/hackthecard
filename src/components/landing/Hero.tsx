import { useState, type FormEvent } from "react";

const DEMOS = ["torvalds", "gaearon", "sindresorhus"];
const TICKER = ["REPOS", "STARS", "LANGUAGES", "COMMITS", "FOLLOWERS", "STREAKS", "FORKS"];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-foreground bg-background">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-4 md:px-10">
        <a href="#top" className="text-[22px] font-bold tracking-tight">
          HACK<span className="font-accent font-normal text-pop-red">the</span>CARD<span className="ml-1 inline-block h-3 w-3 bg-pop-blue" />
        </a>
        <nav className="hidden gap-8 text-xs font-semibold uppercase tracking-[0.2em] md:flex">
          <a href="#generate" className="hover:text-pop-red">01/ Generate</a>
          <a href="#series" className="hover:text-pop-red">02/ Series</a>
          <a href="#manifesto" className="hover:text-pop-red">03/ Manifesto</a>
        </nav>
        <a href="#generate" className="brutal-btn px-5 py-2.5 text-sm">Make yours →</a>
      </div>
    </header>
  );
}

export function Hero({ onGenerate }: { onGenerate: (u: string) => void }) {
  const [v, setV] = useState("");
  const go = (u: string) => {
    if (!u.trim()) return;
    onGenerate(u.trim());
    document.getElementById("generate")?.scrollIntoView({ behavior: "smooth" });
  };
  const submit = (e: FormEvent) => { e.preventDefault(); go(v); };
  const cells = "wyKwyKw yyKyKwy ywKywKy".split(" ").join("");

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-pop-yellow/60 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-pop-pink/40 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-14 px-6 py-20 md:px-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.2em]">
            <span className="border-2 border-foreground px-3 py-1">Issue Nº 01</span>
            <span className="bg-foreground px-3 py-1 text-background">Developer identity press</span>
          </div>
          <h1 className="mt-6 text-[clamp(56px,8vw,112px)] font-bold leading-[0.9] tracking-[-0.045em]">
            Your code<br />
            <span className="font-accent font-normal text-pop-red">has a face.</span><br />
            Print it.
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg text-muted-foreground">
            Turn a GitHub handle into a collectible identity card — repos, languages, a year of commits, one serial number.
          </p>
          <form onSubmit={submit} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label className="brutal-box flex flex-1 items-center bg-card px-4">
              <span className="text-muted-foreground">github.com/</span>
              <input value={v} onChange={(e) => setV(e.target.value)} placeholder="quietmonk" spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-3.5 pl-1 text-lg font-semibold outline-none" aria-label="GitHub username" />
            </label>
            <button type="submit" className="brutal-btn px-7 py-3.5">Generate card →</button>
          </form>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Try a demo:</span>
            {DEMOS.map((d) => (
              <button key={d} onClick={() => go(d)} className="border-2 border-foreground bg-card px-3 py-1 text-sm font-semibold transition-colors hover:bg-pop-yellow">@{d}</button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto h-[440px] w-full max-w-[560px]" aria-hidden>
          <div className="float-slow absolute right-0 top-0 h-[300px] w-[78%] border-2 border-foreground bg-pop-blue shadow-[8px_8px_0_var(--foreground)]">
            <div className="absolute left-10 top-8 text-4xl font-bold text-pop-cream">&lt;/&gt;</div>
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="absolute left-10 right-10 h-px bg-pop-cream/40" style={{ top: 50 + i * 34 }} />)}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none">
              <polyline points="120,260 200,200 250,90 340,55" fill="none" stroke="var(--pop-yellow)" strokeWidth="7" />
            </svg>
          </div>
          <div className="float-fast absolute bottom-6 left-0 w-[66%] border-2 border-foreground bg-pop-red p-5 shadow-[8px_8px_0_var(--foreground)]">
            <div className="text-xs font-bold tracking-[0.2em] text-pop-cream">SERIAL</div>
            <div className="text-3xl font-bold text-pop-cream">HTC-00001</div>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {cells.split("").map((c, i) => (
                <div key={i} className={`aspect-square border border-foreground ${c === "y" ? "bg-pop-yellow" : c === "K" ? "bg-foreground" : "bg-pop-cream"}`} />
              ))}
            </div>
          </div>
          <div className="spin-slow absolute bottom-0 right-6 grid h-32 w-32 place-items-center rounded-full border-2 border-foreground bg-pop-yellow">
            <svg viewBox="0 0 100 100" className="absolute inset-0">
              <defs><path id="circ" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
              <text fontSize="9.5" fontWeight="700" letterSpacing="2" fill="var(--foreground)"><textPath href="#circ">AUTHENTIC · COMMIT · VERIFIED ·</textPath></text>
            </svg>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-xl text-pop-yellow">✓</div>
          </div>
          <div className="absolute -left-2 top-10 h-14 w-14 rotate-12 border-2 border-foreground bg-pop-pink" />
          <div className="absolute right-[40%] top-[56%] h-8 w-8 rounded-full border-2 border-foreground bg-pop-green" />
        </div>
      </div>
      <div className="overflow-hidden border-y-2 border-foreground bg-pop-yellow py-2">
        <div className="marquee flex w-max gap-6 whitespace-nowrap text-sm font-bold tracking-[0.18em]">
          {Array.from({ length: 4 }).flatMap((_, k) => TICKER.map((t) => <span key={`${k}${t}`}>{t} ✦</span>))}
        </div>
      </div>
    </section>
  );
}

export function Manifesto() {
  const items = [
    { n: "01", t: "Real data only", d: "Every number on the card comes from public GitHub. Nothing invented, nothing inflated.", c: "bg-pop-blue text-pop-cream" },
    { n: "02", t: "Twelve worlds", d: "Hand-drawn environments, from tropical canopies to neon megacities.", c: "bg-pop-red text-pop-cream" },
    { n: "03", t: "Yours to keep", d: "Flip it, export front and back in high resolution, share it anywhere.", c: "bg-pop-yellow text-foreground" },
  ];
  return (
    <section id="manifesto" className="border-t-2 border-foreground">
      <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
        <h2 className="text-4xl font-bold tracking-tight">The <span className="font-accent font-normal text-pop-red">manifesto</span></h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {items.map((i) => (
            <div key={i.n} className={`border-2 border-foreground p-6 shadow-[6px_6px_0_var(--foreground)] ${i.c}`}>
              <div className="text-sm font-bold tracking-[0.2em]">{i.n}/</div>
              <div className="mt-6 text-2xl font-bold">{i.t}</div>
              <p className="mt-2 opacity-90">{i.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
