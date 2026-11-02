import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { ThemeArt, W, H } from "./ThemeArt";
import type { CardTheme } from "@/lib/themes";
import { LANG_COLORS, type DeveloperData, type ContributionDay } from "@/lib/github";
import { activityHighlights, signatureCells } from "@/lib/card-details";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString("en-US");

const hex = (c: string, a: number) => c + Math.round(a * 255).toString(16).padStart(2, "0");

function Plate({ theme, style, children }: { theme: CardTheme; style: CSSProperties; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute", background: hex(theme.panel, theme.panelAlpha), color: theme.ink, borderRadius: 9,
        border: `1px solid ${hex(theme.line, 0.45)}`, boxShadow: `inset 0 0 0 3px ${hex(theme.panel, 0.4)}`, ...style,
      }}
    >
      {children}
    </div>
  );
}

function Label({ theme, children, style }: { theme: CardTheme; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 7.5, letterSpacing: "0.16em", textTransform: "uppercase", color: theme.muted, fontWeight: 600, ...style }}>{children}</div>;
}

function Heatmap({ days, theme }: { days: ContributionDay[]; theme: CardTheme }) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-371);
  const first = new Date(sorted[0]!.date + "T00:00:00Z").getUTCDay();
  const cells: (ContributionDay | null)[] = [...Array(first).fill(null), ...sorted];
  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const show = weeks.slice(-53);
  const C = 5.2, G = 1.1;
  const months: { x: number; m: string }[] = [];
  show.forEach((w, i) => {
    const d = w.find(Boolean);
    if (!d) return;
    const m = new Date(d.date + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    if (!months.length || months[months.length - 1]!.m !== m) months.push({ x: i * (C + G), m });
  });
  return (
    <svg width={show.length * (C + G)} height={7 * (C + G) + 8} style={{ display: "block" }}>
      {months.slice(1).map((mo) => <text key={mo.x} x={mo.x} y={5.5} fontSize={5.5} fill={theme.muted} fontFamily="inherit">{mo.m}</text>)}
      {show.map((w, i) => w.map((d, j) => d && (
        <rect key={`${i}-${j}`} x={i * (C + G)} y={8 + j * (C + G)} width={C} height={C} rx={1.2} fill={theme.heat[Math.min(4, d.level)]}>
          <title>{`${d.count} on ${d.date}`}</title>
        </rect>
      )))}
    </svg>
  );
}

function Corners({ color }: { color: string }) {
  const c = (t: string) => (
    <svg width={22} height={22} style={{ position: "absolute", ...(Object.fromEntries(t.split(" ").map((k) => [k, 5])) as CSSProperties), transform: `scale(${t.includes("right") ? -1 : 1},${t.includes("bottom") ? -1 : 1})` }}>
      <path d="M1,21 L1,6 Q1,1 6,1 L21,1 M5,21 L5,9 Q5,5 9,5 L21,5" stroke={color} strokeWidth={0.9} fill="none" />
      <circle cx={9.5} cy={9.5} r={1.6} fill={color} />
    </svg>
  );
  return <>{c("top left")}{c("top right")}{c("bottom left")}{c("bottom right")}</>;
}

function Shell({ theme, children, dim }: { theme: CardTheme; children?: ReactNode; dim?: number }) {
  return (
    <div style={{ width: W + 16, height: H + 16, padding: 8, borderRadius: 24, background: theme.frame, position: "relative", fontFamily: "'Google Sans', 'Instrument Serif', system-ui, sans-serif" }}>
      <div style={{ position: "relative", width: W, height: H, borderRadius: 16, overflow: "hidden", background: theme.panel }}>
        <ThemeArt theme={theme.id} layer="back" dim={dim ?? 0} className="absolute inset-0 h-full w-full" />
        {children}
        <div style={{ position: "absolute", inset: 5, borderRadius: 12, border: `1px solid ${hex(theme.line, 0.7)}`, pointerEvents: "none" }} />
        <Corners color={theme.line} />
      </div>
    </div>
  );
}

const italic: CSSProperties = { fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic" };

function CodeSignature({ d, theme, compact = false }: { d: DeveloperData; theme: CardTheme; compact?: boolean }) {
  const cells = signatureCells(d.login);
  const highlights = activityHighlights(d.contributions);
  return (
    <Plate theme={theme} style={{ left: compact ? 10 : 14, right: compact ? 10 : 14, top: compact ? 64 : 126, height: compact ? 34 : 44, padding: compact ? "4px 8px" : "5px 10px", display: "flex", alignItems: "center", gap: compact ? 7 : 10 }}>
      <svg aria-label={`Code signature for ${d.login}`} width={compact ? 24 : 32} height={compact ? 24 : 32} viewBox="0 0 29 29" style={{ flexShrink: 0 }}>
        {cells.map((filled, i) => <rect key={i} x={(i % 5) * 6} y={Math.floor(i / 5) * 6} width={5} height={5} rx={0.8} fill={filled ? theme.accent : theme.heat[1]} />)}
      </svg>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Label theme={theme} style={{ fontSize: compact ? 5.5 : 6.5 }}>Code signature / T{theme.no}</Label>
        <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.languages[0]?.name ?? "Open source"} · EST. {d.createdAt.slice(0, 4)}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <Label theme={theme} style={{ fontSize: compact ? 5.5 : 6.5 }}>{highlights ? "Active days / yr" : "Identity edition"}</Label>
        <div style={{ fontSize: compact ? 10 : 14, fontWeight: 700, color: theme.accent, marginTop: 1 }}>{highlights ? highlights.activeDays : d.serial}</div>
      </div>
    </Plate>
  );
}

export const CardFront = forwardRef<HTMLDivElement, { d: DeveloperData; theme: CardTheme }>(function CardFront({ d, theme }, ref) {
  const shadow = theme.onArt.startsWith("#f") ? `0 1px 3px ${hex(theme.ink, 0.7)}` : `0 1px 3px #ffffffcc`;
  return (
    <div ref={ref}>
      <Shell theme={theme}>
        <ThemeArt theme={theme.id} layer="fore" className="pointer-events-none absolute inset-0 h-full w-full" />
        {/* identity */}
        <div style={{ position: "absolute", left: 20, top: 18, display: "flex", gap: 11, alignItems: "flex-end", color: theme.onArt, textShadow: shadow }}>
          <div style={{ width: 66, height: 66, borderRadius: 10, padding: 3, background: theme.frame, boxShadow: `0 0 0 1px ${theme.line}, 0 6px 14px ${hex(theme.frame, 0.5)}` }}>
            <img src={d.avatar} crossOrigin="anonymous" alt="" style={{ width: 60, height: 60, borderRadius: 7, display: "block" }} />
          </div>
          <div style={{ paddingBottom: 2, maxWidth: 260 }}>
            <div style={{ ...italic, fontSize: 11, opacity: 0.95 }}>{d.classification.title}</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>@{d.login} · github.com/{d.login}</div>
          </div>
        </div>
        {/* serial */}
        <div style={{ position: "absolute", right: 20, top: 16, textAlign: "right", color: theme.onArt, textShadow: shadow }}>
          <div style={{ fontSize: 7, letterSpacing: "0.2em", fontWeight: 600 }}>HACKTHECARD · SERIES I</div>
          <div style={{ fontSize: 7, letterSpacing: "0.2em", opacity: 0.8 }}>No. {d.serial} · T{theme.no}</div>
        </div>
        {/* hero stats */}
        <Plate theme={theme} style={{ right: 16, top: 62, padding: "7px 10px", display: "flex", gap: 12 }}>
          {[["Stars", d.totalStars], ["Contrib · yr", d.contributionTotal]].map(([k, v]) => (
            <div key={k as string}>
              <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1, color: theme.accent, fontVariantNumeric: "tabular-nums" }}>{fmt(v as number)}</div>
              <Label theme={theme} style={{ marginTop: 3 }}>{k}</Label>
            </div>
          ))}
        </Plate>
        <CodeSignature d={d} theme={theme} />
        {/* info plate */}
        <Plate theme={theme} style={{ left: 14, right: 14, bottom: 14, height: 190, padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 326 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Label theme={theme}>Contributions · last year</Label>
                <div style={{ display: "flex", gap: 1.5, alignItems: "center", fontSize: 6, color: theme.muted }}>
                  less {theme.heat.map((c) => <span key={c} style={{ width: 5, height: 5, borderRadius: 1, background: c, display: "inline-block" }} />)} more
                </div>
              </div>
              <div style={{ marginTop: 3, height: 54 }}>
                {d.contributions?.length ? <Heatmap days={d.contributions} theme={theme} /> : (
                  <div style={{ fontSize: 8, color: theme.muted, paddingTop: 18 }}>Contribution calendar unavailable for this profile.</div>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label theme={theme}>Top repositories</Label>
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                {d.topRepos.length === 0 && <div style={{ fontSize: 8, color: theme.muted }}>No public repositories yet.</div>}
                {d.topRepos.map((r) => (
                  <div key={r.name} style={{ borderLeft: `2px solid ${theme.accent}`, paddingLeft: 5 }}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div style={{ fontSize: 6.8, color: theme.muted, display: "flex", gap: 5 }}>
                      {r.language && <span>● {r.language}</span>}<span>★ {fmt(r.stars)}</span><span>⑂ {fmt(r.forks)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: hex(theme.line, 0.35), margin: "8px 0 7px" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[["Repos", d.publicRepos], ["Followers", d.followers], ["Following", d.following], ["Forks recv.", d.totalForks], ["Streak", d.streak], ["Best streak", d.longestStreak]].map(([k, v]) => (
              <div key={k as string}>
                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmt(v as number | null)}{(k as string).includes("treak") && v != null ? <span style={{ fontSize: 7, fontWeight: 500 }}> d</span> : null}</div>
                <Label theme={theme} style={{ fontSize: 6.5, marginTop: 2 }}>{k}</Label>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Label theme={theme} style={{ fontSize: 6.5 }}>Repository languages</Label>
              <div style={{ fontSize: 6.5, color: theme.muted, ...italic }}>tap to turn over ↻</div>
            </div>
            <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 3, background: hex(theme.ink, 0.1) }}>
              {d.languages.map((l) => <div key={l.name} style={{ width: `${l.share * 100}%`, background: LANG_COLORS[l.name] ?? theme.accent }} />)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 7.5, flexWrap: "nowrap", overflow: "hidden" }}>
              {d.languages.length === 0 && <span style={{ color: theme.muted }}>No language data</span>}
              {d.languages.slice(0, 5).map((l) => (
                <span key={l.name} style={{ display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 1.5, background: LANG_COLORS[l.name] ?? theme.accent }} />{l.name}<span style={{ color: theme.muted }}>{Math.round(l.share * 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        </Plate>
      </Shell>
    </div>
  );
});

export const CardBack = forwardRef<HTMLDivElement, { d: DeveloperData; theme: CardTheme }>(function CardBack({ d, theme }, ref) {
  const joined = new Date(d.createdAt);
  const years = Math.max(0, Math.floor((Date.now() - joined.getTime()) / (365.25 * 864e5)));
  const block: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const highlights = activityHighlights(d.contributions);
  return (
    <div ref={ref}>
      <Shell theme={theme}>
        <div style={{ position: "absolute", left: 22, top: 16, right: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: theme.onArt, textShadow: `0 1px 2px ${hex(theme.frame, 0.6)}` }}>
          <div>
            <div style={{ fontSize: 7, letterSpacing: "0.24em", fontWeight: 600 }}>BEHIND THE CODE · T{theme.no}</div>
            <div style={{ ...italic, fontSize: 24, lineHeight: 1.05 }}>{theme.backTitle}</div>
          </div>
          <div style={{ fontSize: 7, letterSpacing: "0.2em", textAlign: "right", opacity: 0.85 }}>@{d.login}<br />No. {d.serial}</div>
        </div>
        <Plate theme={theme} style={{ left: 14, right: 14, top: 66, bottom: 14, padding: 12, display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 14 }}>
          <div style={block}>
            <Label theme={theme}>Developer profile</Label>
            <div style={{ fontSize: 9, lineHeight: 1.4, ...italic, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.bio ? `“${d.bio}”` : "No public biography."}</div>
            <div style={{ fontSize: 8, lineHeight: 1.6, marginTop: 2 }}>
              <div><span style={{ color: theme.muted }}>Joined </span>{joined.toLocaleDateString("en-US", { month: "short", year: "numeric" })} · {years} yrs</div>
              {d.location && <div><span style={{ color: theme.muted }}>Based </span>{d.location}</div>}
              <div><span style={{ color: theme.muted }}>Profile </span>github.com/{d.login}</div>
            </div>
            <div style={{ marginTop: "auto", borderTop: `1px solid ${hex(theme.line, 0.35)}`, paddingTop: 6 }}>
              <Label theme={theme}>Identity classification</Label>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent, marginTop: 2 }}>{d.classification.title}</div>
              <div style={{ fontSize: 7.5, lineHeight: 1.35, color: theme.muted, marginTop: 2 }}>{d.classification.reason}</div>
            </div>
          </div>
          <div style={block}>
            <Label theme={theme}>Repository profile</Label>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{fmt(d.publicRepos)}<span style={{ fontSize: 8, fontWeight: 500, color: theme.muted }}> public repos</span></div>
            <div style={{ fontSize: 7.5, color: theme.muted }}>{d.repos.length} original · {d.forkedCount} forked (of latest 100)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
              {d.languages.map((l) => (
                <div key={l.name} style={{ display: "grid", gridTemplateColumns: "56px 1fr 22px", alignItems: "center", gap: 4, fontSize: 7.5 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</span>
                  <span style={{ height: 4, borderRadius: 2, background: hex(theme.ink, 0.1) }}><span style={{ display: "block", height: 4, borderRadius: 2, width: `${l.share * 100}%`, background: LANG_COLORS[l.name] ?? theme.accent }} /></span>
                  <span style={{ textAlign: "right", color: theme.muted }}>{Math.round(l.share * 100)}%</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 6.5, color: theme.muted, marginTop: "auto", ...italic }}>Share of original repos by primary language.</div>
          </div>
          <div style={block}>
            <Label theme={theme}>Community</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {[["Followers", d.followers], ["Following", d.following], ["Stars", d.totalStars], ["Forks recv.", d.totalForks]].map(([k, v]) => (
                <div key={k as string}><div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{fmt(v as number)}</div><Label theme={theme} style={{ fontSize: 6.5 }}>{k}</Label></div>
              ))}
            </div>
            <Label theme={theme} style={{ marginTop: 6 }}>Recently pushed</Label>
            {d.recentRepos.map((r) => (
              <div key={r.name} style={{ fontSize: 7.5, display: "flex", justifyContent: "space-between", gap: 4 }}>
                <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                <span style={{ color: theme.muted, whiteSpace: "nowrap" }}>{new Date(r.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
            <div style={{ marginTop: "auto", fontSize: 7.5, borderTop: `1px solid ${hex(theme.line, 0.35)}`, paddingTop: 6 }}>
              <Label theme={theme}>Personal best · last year</Label>
              {highlights ? <>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.accent, marginTop: 2 }}>{fmt(highlights.peak.count)}<span style={{ fontSize: 7, color: theme.muted }}> in one day</span></div>
                <div style={{ fontSize: 7, color: theme.muted }}>{new Date(highlights.peak.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} · {highlights.activeDays} active days</div>
              </> : <div style={{ marginTop: 3, color: theme.muted }}>Activity calendar unavailable</div>}
            </div>
          </div>
        </Plate>
      </Shell>
    </div>
  );
});

export const PocketCard = forwardRef<HTMLDivElement, { d: DeveloperData; theme: CardTheme }>(function PocketCard({ d, theme }, ref) {
  const PW = 320, PH = 204;
  const recent = d.contributions ? [...d.contributions].sort((a, b) => a.date.localeCompare(b.date)).slice(-26 * 7) : [];
  return (
    <div ref={ref} style={{ width: PW + 12, height: PH + 12, padding: 6, borderRadius: 18, background: theme.frame, fontFamily: "'Google Sans', system-ui, sans-serif" }}>
      <div style={{ position: "relative", width: PW, height: PH, borderRadius: 13, overflow: "hidden" }}>
        <ThemeArt theme={theme.id} layer="back" className="absolute inset-0 h-full w-full" />
        <div style={{ position: "absolute", inset: 4, borderRadius: 10, border: `1px solid ${theme.line}`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 8, alignItems: "center", color: theme.onArt, textShadow: `0 1px 2px ${hex(theme.ink, 0.5)}` }}>
          <img src={d.avatar} crossOrigin="anonymous" alt="" style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${theme.line}` }} />
          <div style={{ maxWidth: 190 }}>
            <div style={{ ...italic, fontSize: 9 }}>{d.classification.title}</div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
            <div style={{ fontSize: 8, opacity: 0.9 }}>@{d.login}</div>
          </div>
        </div>
        <div style={{ position: "absolute", right: 12, top: 12, fontSize: 6.5, letterSpacing: "0.18em", fontWeight: 700, color: theme.onArt, textAlign: "right" }}>POCKET<br />T{theme.no}</div>
        <CodeSignature d={d} theme={theme} compact />
        <Plate theme={theme} style={{ left: 10, right: 10, bottom: 10, padding: "8px 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[["Stars", d.totalStars], ["Repos", d.publicRepos], ["Followers", d.followers], ["Contrib", d.contributionTotal]].map(([k, v]) => (
              <div key={k as string}><div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: theme.accent }}>{fmt(v as number | null)}</div><Label theme={theme} style={{ fontSize: 6 }}>{k}</Label></div>
            ))}
          </div>
          {recent.length > 0 && (
            <div style={{ display: "grid", gridTemplateRows: "repeat(7, 4px)", gridAutoColumns: "4px", gridAutoFlow: "column", gap: 1, marginTop: 6 }}>
              {recent.map((c) => <span key={c.date} style={{ width: 4, height: 4, borderRadius: 1, background: theme.heat[Math.min(4, c.level)] }} />)}
            </div>
          )}
          <div style={{ fontSize: 6, color: theme.muted, marginTop: 4, letterSpacing: "0.14em" }}>No. {d.serial} · HACKTHECARD</div>
        </Plate>
      </div>
    </div>
  );
});
