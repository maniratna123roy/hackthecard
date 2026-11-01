const STEPS = ["Fetching profile", "Reading repositories", "Counting commits", "Inking the artwork"];

export function CardLoader({ width, height }: { width: number; height: number }) {
  return (
    <div className="mx-auto flex flex-col items-center justify-center" style={{ width, height }} role="status" aria-label="Generating your card">
      <div className="relative h-40 w-56">
        {["bg-pop-blue", "bg-pop-yellow", "bg-pop-pink", "bg-pop-red"].map((c, i) => (
          <div key={c} className={`loader-card absolute inset-0 border-2 border-foreground ${c} shadow-[5px_5px_0_var(--foreground)]`} style={{ animationDelay: `${i * 0.18}s` }}>
            {i === 3 && (
              <div className="grid h-full grid-cols-7 content-center gap-1 p-4">
                {Array.from({ length: 21 }).map((_, k) => (
                  <span key={k} className="loader-cell aspect-square border border-foreground bg-pop-cream" style={{ animationDelay: `${(k % 7) * 0.08 + Math.floor(k / 7) * 0.12}s` }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-10 text-2xl font-bold">Pressing your card<span className="loader-dots" /></p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
        {STEPS.map((s, i) => (
          <li key={s} className="loader-step border-2 border-foreground bg-card px-2 py-1" style={{ animationDelay: `${i * 0.6}s` }}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
