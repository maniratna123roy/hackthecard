import { useId, type ReactNode } from "react";

export const W = 560;
export const H = 386;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth random ridge filled down to the bottom edge. */
function ridge(seed: number, y: number, amp: number, steps = 9, sharp = false) {
  const r = rng(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) pts.push([(W / steps) * i, y - r() * amp]);
  let d = `M0,${H} L0,${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    if (sharp) d += ` L${(x0 + x1) / 2},${Math.min(y0, y1) - amp * 0.6 * r()} L${x1},${y1}`;
    else d += ` Q${x0 + (x1 - x0) / 2},${(y0 + y1) / 2 - amp * 0.3} ${x1},${y1}`;
  }
  return d + ` L${W},${H} Z`;
}

function Frond({ x, y, len, angle, color, n = 14, width = 2.2, droop = 0.35 }: { x: number; y: number; len: number; angle: number; color: string; n?: number; width?: number; droop?: number }) {
  const a = (angle * Math.PI) / 180;
  const lines: ReactNode[] = [];
  const q0 = (n: number) => Math.round(n * 10) / 10;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x + Math.cos(a) * len * t;
    const py = y + Math.sin(a) * len * t + droop * len * t * t;
    pts.push([q0(px), q0(py)]);
  }
  const q = (n: number) => Math.round(n * 10) / 10;
  const rib = "M" + pts.map((p) => p.join(",")).join(" L");
  for (let i = 1; i < n; i++) {
    const [px, py] = pts[i]!;
    const [nx, ny] = pts[i + 1]!;
    const dir = Math.atan2(ny - py, nx - px);
    const l = len * 0.32 * Math.sin((i / n) * Math.PI) + 3;
    for (const s of [-1, 1]) {
      const da = dir + s * 1.0;
      lines.push(<path key={`${i}${s}`} d={`M${px},${py} Q${q(px + Math.cos(da) * l * 0.6)},${q(py + Math.sin(da) * l * 0.6 - 2)} ${q(px + Math.cos(da + s * 0.35) * l)},${q(py + Math.sin(da + s * 0.35) * l + l * 0.25)}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" />);
    }
  }
  return <g><path d={rib} stroke={color} strokeWidth={width * 0.9} fill="none" />{lines}</g>;
}

function Leaf({ x, y, s, rot, color, vein }: { x: number; y: number; s: number; rot: number; color: string; vein?: string }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <path d={`M0,0 C${s * 0.3},${-s * 0.42} ${s * 0.8},${-s * 0.36} ${s},0 C${s * 0.8},${s * 0.36} ${s * 0.3},${s * 0.42} 0,0Z`} fill={color} />
      {vein && <path d={`M0,0 L${s * 0.95},0 ${[0.25, 0.45, 0.65].map((t) => `M${s * t},0 L${s * (t + 0.15)},${-s * 0.18} M${s * t},0 L${s * (t + 0.15)},${s * 0.18}`).join(" ")}`} stroke={vein} strokeWidth={0.8} fill="none" />}
    </g>
  );
}

function Pine({ x, y, h, color }: { x: number; y: number; h: number; color: string }) {
  const w = h * 0.42;
  return (
    <g fill={color}>
      <rect x={x - 1} y={y - h * 0.12} width={2} height={h * 0.14} />
      {[0, 1, 2, 3].map((i) => {
        const top = y - h + (h * 0.22) * i;
        const ww = w * (0.45 + i * 0.2);
        return <path key={i} d={`M${x},${top} L${x + ww / 2},${top + h * 0.34} L${x - ww / 2},${top + h * 0.34}Z`} />;
      })}
    </g>
  );
}

function Stars({ seed, n, maxY, color, big = 0.08 }: { seed: number; n: number; maxY: number; color: string; big?: number }) {
  const r = rng(seed);
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => {
        const x = r() * W, y = r() * maxY, s = r() < big ? 1.6 : 0.4 + r() * 0.7;
        return <circle key={i} cx={x} cy={y} r={s} opacity={0.4 + r() * 0.6} />;
      })}
    </g>
  );
}

export function Grain({ id, opacity = 0.18 }: { id: string; opacity?: number }) {
  return (
    <>
      <filter id={`${id}grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
      </filter>
      <rect width={W} height={H} filter={`url(#${id}grain)`} opacity={opacity} style={{ mixBlendMode: "multiply" }} />
    </>
  );
}

function Sky({ id, stops }: { id: string; stops: string[] }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          {stops.map((c, i) => <stop key={i} offset={i / (stops.length - 1)} stopColor={c} />)}
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}sky)`} />
    </>
  );
}

type Art = (id: string) => { back: ReactNode; fore: ReactNode };

const tropical: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#e7eeb4", "#a8c97a", "#4f7d43", "#1f4a2c"]} />
      <g opacity={0.35} fill="#fffbe0">
        <path d="M300,0 L360,0 L250,260 L200,260Z" /><path d="M400,0 L430,0 L330,240 L310,240Z" /><path d="M200,0 L230,0 L170,220 L150,220Z" />
      </g>
      <path d={ridge(3, 150, 40, 12)} fill="#86ad6a" opacity={0.7} />
      {[60, 140, 220, 330, 420, 500].map((x, i) => <rect key={x} x={x} y={40 + (i % 3) * 18} width={6 + (i % 2) * 4} height={260} fill="#55804a" opacity={0.6} />)}
      <path d={ridge(7, 175, 50, 10)} fill="#3f6f3c" />
      {([[30, 160, -60], [470, 150, -80], [540, 120, -130], [300, 170, -95]] as const).map(([x, y, a], i) => (
        <Frond key={i} x={x} y={y} len={90} angle={a} color="#2c5a31" width={2.4} />
      ))}
      {([[20, 140, -30], [80, 150, -150], [500, 140, -40], [560, 150, -150], [300, 160, -20], [380, 165, -160]] as const).map(([x, y, a], i) => (
        <Frond key={`b${i}`} x={x} y={y} len={110} angle={a} color="#1f4a2a" width={3} />
      ))}
      <path d={ridge(11, 200, 30, 14)} fill="#183c24" />
    </>
  ),
  fore: (
    <>
      <path d="M0,0 C30,40 20,90 40,140 M0,0 C60,30 80,70 110,80 M560,0 C520,50 540,100 515,150" stroke="#163a22" strokeWidth={2.5} fill="none" />
      {([[40, 140, 60], [110, 80, 20], [515, 150, 120], [8, 60, 40], [540, 70, 140]] as const).map(([x, y, r], i) => <Leaf key={i} x={x} y={y} s={26} rot={r} color="#2d6a35" vein="#7fb05a" />)}
      <Leaf x={-6} y={300} s={60} rot={-40} color="#1d4d2a" vein="#5f9a4a" />
      <Leaf x={566} y={310} s={60} rot={-140} color="#1d4d2a" vein="#5f9a4a" />
    </>
  ),
});

const oceanic: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#bfeef0", "#7fd3e0", "#2b8db5", "#0b3a66"]} />
      <circle cx={430} cy={70} r={26} fill="#fff7d6" opacity={0.9} />
      <path d="M360,112 C400,96 430,100 470,112 L470,120 L360,120Z" fill="#3e7a8a" opacity={0.6} />
      <path d={`M0,118 L${W},118 L${W},${H} L0,${H}Z`} fill="#2a8fb2" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={Array.from({ length: 15 }, (_, k) => `${k === 0 ? "M" : "Q"}${k * 40 - 20 + (i % 2) * 20},${126 + i * 8 + (k % 2 ? -3 : 0)} ${k * 40 + (i % 2) * 20},${126 + i * 8}`).join(" ")} stroke="#c9f5f3" strokeWidth={1} fill="none" opacity={0.6 - i * 0.05} />
      ))}
      <path d="M0,150 C80,135 140,165 230,150 C320,135 400,170 560,148 L560,386 L0,386Z" fill="#167aa2" />
      <path d="M0,175 C100,160 200,190 300,172 C400,155 470,185 560,170 L560,386 L0,386Z" fill="#0e5f8a" />
      <g fill="#0b2a4a" opacity={0.7}>
        {([[90, 150], [470, 140]] as const).map(([x, y], i) => <path key={i} d={`M${x},${y} q14,-6 28,0 q-14,6 -28,0z M${x + 26},${y} l8,-5 l0,10z`} />)}
      </g>
    </>
  ),
  fore: (
    <>
      <path d="M0,386 L0,330 C20,300 40,310 50,280 C60,300 70,320 95,330 L120,386Z" fill="#0a2342" />
      <path d="M560,386 L560,320 C540,300 530,280 515,290 C505,310 490,330 470,340 L460,386Z" fill="#0a2342" />
      {([[30, 290, -80], [60, 280, -100], [520, 290, -70], [545, 300, -110]] as const).map(([x, y, a], i) => (
        <path key={i} d={`M${x},${y} q${Math.cos((a * Math.PI) / 180) * 30 + 8},${Math.sin((a * Math.PI) / 180) * 30} ${Math.cos((a * Math.PI) / 180) * 40},${Math.sin((a * Math.PI) / 180) * 50}`} stroke="#e8786a" strokeWidth={3} fill="none" strokeLinecap="round" />
      ))}
      <path d="M0,40 C40,20 60,60 30,80" stroke="#e6fbff" strokeWidth={1.2} fill="none" opacity={0.6} />
    </>
  ),
});

const rainforest: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#6f9a7a", "#2f6555", "#0d3a30", "#05201a"]} />
      <g opacity={0.25}>{[1, 2, 3].map((i) => <rect key={i} x={0} y={60 + i * 25} width={W} height={18} fill="#d8efe0" />)}</g>
      <path d={ridge(21, 120, 40, 14)} fill="#2f5e4c" opacity={0.8} />
      {[40, 110, 190, 300, 380, 470, 530].map((x, i) => <path key={x} d={`M${x},0 C${x + 10},120 ${x - 8},200 ${x + 4},300 L${x + 14 + (i % 3) * 4},300 C${x + 20},200 ${x + 24},100 ${x + 12},0Z`} fill="#16392e" />)}
      <path d={ridge(23, 175, 40, 12)} fill="#0f3a2c" />
      {([[70, 170, -50], [170, 165, -130], [420, 160, -60], [500, 170, -120], [280, 175, -90]] as const).map(([x, y, a], i) => (
        <Frond key={i} x={x} y={y} len={80} angle={a} color="#2c6a3e" n={18} width={1.6} droop={0.2} />
      ))}
      <path d={ridge(29, 205, 20, 18)} fill="#082a20" />
      <Stars seed={5} n={30} maxY={200} color="#e7f59a" />
    </>
  ),
  fore: (
    <>
      {[30, 70, 490, 530].map((x, i) => <path key={x} d={`M${x},0 C${x + 10},40 ${x - 10},80 ${x + 4},${120 + i * 15}`} stroke="#0b2f24" strokeWidth={2} fill="none" />)}
      {([[34, 60, 90], [74, 100, 60], [494, 80, 100], [534, 130, 80]] as const).map(([x, y, r], i) => <Leaf key={i} x={x} y={y} s={20} rot={r} color="#3d7a4a" vein="#a7c95a" />)}
      <Leaf x={-10} y={250} s={70} rot={-30} color="#0e3a2a" vein="#4f8a5a" />
      <Leaf x={570} y={260} s={70} rot={-150} color="#0e3a2a" vein="#4f8a5a" />
    </>
  ),
});

const desert: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#f7d9a0", "#f2b56b", "#e58b4a", "#c4561f"]} />
      <circle cx={150} cy={95} r={40} fill="#fff0c9" opacity={0.95} />
      <g stroke="#fff0c9" opacity={0.5}>{[0, 1, 2].map((i) => <line key={i} x1={80} x2={220} y1={115 + i * 6} y2={115 + i * 6} strokeWidth={2} />)}</g>
      <path d="M0,150 C120,110 240,130 330,145 C420,160 480,120 560,130 L560,386 L0,386Z" fill="#e6a35f" />
      <path d="M0,175 C90,150 200,180 300,160 C380,145 470,175 560,155 L560,386 L0,386Z" fill="#d07f3c" />
      <path d="M0,200 C120,180 220,215 340,190 C430,175 500,200 560,190 L560,386 L0,386Z" fill="#b2602a" />
      <g fill="#5a2e14">
        <path d="M470,175 l0,-36 a5,5 0 0 1 10,0 l0,36z M470,158 l-10,0 l0,-12 a4,4 0 0 1 8,0 l0,6 l2,0z M480,152 l8,0 l0,-10 a4,4 0 0 1 8,0 l0,16 l-16,0z" />
        <g opacity={0.8}><path d="M250,170 l3,-8 l6,0 l3,8z M265,172 l3,-8 l6,0 l3,8z" /></g>
      </g>
    </>
  ),
  fore: (
    <>
      <path d="M0,386 L0,300 C30,280 60,300 90,330 L120,386Z" fill="#7a3a16" />
      <g fill="#4d2a10"><path d="M30,320 l0,-50 a6,6 0 0 1 12,0 l0,50z M30,296 l-12,0 l0,-16 a5,5 0 0 1 10,0 l0,8 l2,0z" /></g>
      <path d="M560,386 L560,310 C530,300 500,330 470,386Z" fill="#7a3a16" />
      <g stroke="#5a2e14" strokeWidth={1}>{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${520 + i * 6},330 l-4,-18 M${520 + i * 6},330 l4,-18`} />)}</g>
    </>
  ),
});

const alpine: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#dce8f2", "#b9cfe2", "#8eaecb", "#5d7f9c"]} />
      <path d={ridge(41, 120, 50, 7, true)} fill="#a6bccf" />
      <path d="M60,170 L180,40 L235,105 L280,60 L380,170Z" fill="#7d98b1" />
      <path d="M180,40 L205,68 L193,66 L185,80 L170,62 L160,70Z M280,60 L300,82 L288,80 L276,88 L268,74Z" fill="#f7fbff" />
      <path d="M300,180 L420,55 L540,180Z" fill="#5f7d98" />
      <path d="M420,55 L450,86 L436,84 L425,100 L410,82 L398,90Z" fill="#f7fbff" />
      <path d={ridge(43, 185, 20, 12)} fill="#3d5b52" />
      {Array.from({ length: 22 }, (_, i) => <Pine key={i} x={i * 27 + 5} y={196 + (i % 3) * 4} h={34 + (i % 4) * 8} color="#24453b" />)}
      <path d={ridge(47, 205, 10, 14)} fill="#1b3a32" />
    </>
  ),
  fore: (
    <>
      <Pine x={18} y={386} h={150} color="#16302a" />
      <Pine x={56} y={386} h={100} color="#1d3a32" />
      <Pine x={540} y={386} h={160} color="#16302a" />
      <Pine x={505} y={386} h={95} color="#1d3a32" />
      <Stars seed={9} n={18} maxY={170} color="#ffffff" big={0} />
    </>
  ),
});

const sakura: Art = (id) => {
  const r = rng(61);
  const petals = Array.from({ length: 40 }, () => [r() * W, r() * H, r() * 360, 2 + r() * 2.5] as const);
  return {
    back: (
      <>
        <Sky id={id} stops={["#fdf3ec", "#f8dcd8", "#f0c3c6", "#e8a7b0"]} />
        <circle cx={400} cy={78} r={42} fill="#c8414b" opacity={0.85} />
        <path d="M120,165 L230,60 L340,165Z" fill="#e4c7c8" />
        <path d="M230,60 L250,80 L238,78 L230,88 L222,78 L210,80Z" fill="#fffaf6" />
        <path d={ridge(51, 175, 20, 10)} fill="#d7a8ac" />
        <g fill="#6d3e3a">
          <rect x={460} y={128} width={4} height={48} /><rect x={490} y={128} width={4} height={48} />
          <path d="M450,126 L504,126 L506,120 L448,120Z" /><rect x={454} y={134} width={46} height={3} />
        </g>
        <path d="M0,195 C120,185 300,205 560,190 L560,386 L0,386Z" fill="#c78c90" />
      </>
    ),
    fore: (
      <>
        <path d="M0,40 C60,50 110,30 170,60 C200,75 230,70 260,62 M110,40 C130,20 150,15 175,10 M0,90 C40,95 70,85 100,100" stroke="#4a2c26" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <path d="M560,30 C510,45 480,40 440,60 M500,42 C490,25 470,15 450,12" stroke="#4a2c26" strokeWidth={3} fill="none" strokeLinecap="round" />
        {([[40, 45], [80, 42], [120, 38], [150, 52], [175, 62], [210, 70], [245, 62], [140, 22], [170, 12], [30, 92], [70, 90], [520, 38], [480, 46], [450, 58], [470, 16]] as const).map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-4} rx={3} ry={4.5} fill={i % 3 ? "#f6c3cb" : "#fbe0e4"} transform={`rotate(${a})`} />)}
            <circle r={1.4} fill="#b8414b" />
          </g>
        ))}
        {petals.map(([x, y, a, s], i) => <ellipse key={`p${i}`} cx={x} cy={y} rx={s} ry={s * 0.55} fill="#f4b6c0" opacity={0.7} transform={`rotate(${a} ${x} ${y})`} />)}
      </>
    ),
  };
};

const volcanic: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#2a0f0c", "#5a1a10", "#a3301a", "#2a1210"]} />
      <Stars seed={71} n={60} maxY={300} color="#ffb23f" big={0.15} />
      <path d="M150,190 L250,70 L270,62 L290,72 L400,190Z" fill="#1d1210" />
      <path d="M262,64 C255,40 270,25 262,0 M278,66 C290,40 280,20 300,0" stroke="#5a3a33" strokeWidth={14} fill="none" opacity={0.6} />
      <path d="M262,66 L270,62 L280,68 L276,100 L268,130 L282,190 L262,190 L270,130 L258,100Z" fill="#ff6a1f" />
      <path d="M266,70 L276,72 L272,110 L266,150 L264,110Z" fill="#ffd27a" />
      <path d={ridge(73, 200, 30, 8, true)} fill="#120c0b" />
      <path d="M0,230 C80,215 140,240 200,225 L260,232 C320,240 400,215 560,228" stroke="#ff6a1f" strokeWidth={3} fill="none" />
    </>
  ),
  fore: (
    <>
      <path d="M0,386 L0,280 L30,300 L50,270 L80,310 L110,386Z M560,386 L560,270 L530,300 L505,280 L480,330 L460,386Z" fill="#0b0707" />
      <path d="M20,330 L40,310 L35,350 M520,320 L540,300 L530,345" stroke="#ff6a1f" strokeWidth={1.5} fill="none" />
    </>
  ),
});

const arctic: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#050a24", "#0b1a44", "#13305a", "#1c3f66"]} />
      <Stars seed={81} n={120} maxY={200} color="#ffffff" />
      <defs>
        <linearGradient id={`${id}aur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a37bff" stopOpacity="0" /><stop offset="0.4" stopColor="#8c7bff" stopOpacity="0.5" />
          <stop offset="0.8" stopColor="#6ff3d6" stopOpacity="0.9" /><stop offset="1" stopColor="#6ff3d6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M-20,120 C80,40 160,110 260,60 C350,20 440,90 580,40 L580,90 C440,140 360,70 260,110 C160,150 80,90 -20,160Z" fill={`url(#${id}aur)`} />
      <path d="M40,150 C140,100 220,140 330,100 C420,70 480,110 580,80 L580,110 C480,140 420,100 330,130 C220,170 140,130 40,170Z" fill={`url(#${id}aur)`} opacity={0.6} />
      <path d={ridge(83, 175, 40, 6, true)} fill="#3a5a86" />
      <path d={ridge(85, 195, 20, 10)} fill="#cfe2f2" />
      <path d={ridge(87, 210, 8, 12)} fill="#e8f3fb" />
    </>
  ),
  fore: (
    <>
      <path d="M0,386 L0,290 L40,260 L70,300 L90,386Z M560,386 L560,280 L520,250 L500,290 L470,386Z" fill="#dbe9f6" />
      <path d="M40,260 L50,300 M520,250 L512,300" stroke="#9fb6d4" strokeWidth={1.2} />
      <Stars seed={89} n={40} maxY={386} color="#ffffff" big={0} />
    </>
  ),
});

const cyber: Art = (id) => {
  const r = rng(91);
  const far = Array.from({ length: 26 }, (_, i) => [i * 22, 40 + r() * 100, 18 + r() * 8] as const);
  const near = Array.from({ length: 14 }, (_, i) => [i * 42 - 10, 70 + r() * 90, 34 + r() * 10] as const);
  return {
    back: (
      <>
        <Sky id={id} stops={["#120a2a", "#2a1060", "#5a1a8a", "#1a0f36"]} />
        <circle cx={420} cy={70} r={30} fill="#ff3fd8" opacity={0.35} />
        {far.map(([x, y, w], i) => <rect key={i} x={x} y={y} width={w} height={H} fill="#24184a" />)}
        {near.map(([x, y, w], i) => (
          <g key={`n${i}`}>
            <rect x={x} y={y} width={w} height={H} fill="#120e26" />
            {Array.from({ length: 10 }, (_, k) => <rect key={k} x={x + 4 + (k % 3) * 10} y={y + 8 + Math.floor(k / 3) * 12} width={5} height={3} fill={k % 4 === 0 ? "#ff3fd8" : "#19f0ff"} opacity={r() > 0.4 ? 0.9 : 0.15} />)}
          </g>
        ))}
        <rect x={86} y={110} width={46} height={14} fill="none" stroke="#19f0ff" strokeWidth={1.5} />
        <rect x={340} y={96} width={10} height={44} fill="none" stroke="#ff3fd8" strokeWidth={1.5} />
        <g stroke="#19f0ff" opacity={0.35}>{Array.from({ length: 10 }, (_, i) => <line key={i} x1={0} x2={W} y1={200 + i * 6} y2={200 + i * 6} />)}</g>
      </>
    ),
    fore: (
      <>
        <path d="M0,60 L60,60 L80,80 L80,140 M560,60 L500,60 L480,80 L480,140" stroke="#19f0ff" strokeWidth={1.2} fill="none" />
        <path d="M0,330 L40,330 L60,350 L60,386 M560,330 L520,330 L500,350 L500,386" stroke="#ff3fd8" strokeWidth={1.2} fill="none" />
        <g stroke="#19f0ff" opacity={0.6}>{Array.from({ length: 40 }, (): [number, number] => [r() * W, r() * 160]).map(([x, y], i) => <line key={i} x1={x} x2={x - 3} y1={y} y2={y + 10} />)}</g>
      </>
    ),
  };
};

const space: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#04061a", "#0e1240", "#2a1a66", "#0b0f2e"]} />
      <defs>
        <radialGradient id={`${id}neb`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#7f5cff" stopOpacity="0.55" /><stop offset="1" stopColor="#7f5cff" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}pl`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffd9a0" /><stop offset="0.6" stopColor="#d9784a" /><stop offset="1" stopColor="#4a1f3a" /></radialGradient>
      </defs>
      <ellipse cx={160} cy={100} rx={220} ry={110} fill={`url(#${id}neb)`} />
      <ellipse cx={460} cy={180} rx={160} ry={80} fill={`url(#${id}neb)`} opacity={0.6} />
      <Stars seed={101} n={160} maxY={H} color="#ffffff" big={0.05} />
      <circle cx={430} cy={84} r={44} fill={`url(#${id}pl)`} />
      <ellipse cx={430} cy={84} rx={78} ry={14} fill="none" stroke="#ffc27a" strokeWidth={3} opacity={0.8} transform="rotate(-14 430 84)" />
      <circle cx={110} cy={70} r={10} fill="#8fa8ff" />
      <circle cx={106} cy={66} r={10} fill="#0e1240" opacity={0.6} />
    </>
  ),
  fore: (
    <>
      <path d="M0,386 L0,300 C40,290 70,320 90,386Z" fill="#141a44" />
      <path d="M560,386 L560,310 C520,300 490,330 480,386Z" fill="#141a44" />
      <g transform="translate(320 140) rotate(-20)"><path d="M0,0 l12,-3 l8,3 l-8,3z" fill="#e7ebff" /><path d="M0,0 l-26,0" stroke="#8fa8ff" strokeWidth={1} opacity={0.6} /></g>
    </>
  ),
});

const autumn: Art = (id) => {
  const r = rng(111);
  const leaves = Array.from({ length: 28 }, () => [r() * W, r() * H, r() * 360, ["#e3a24a", "#d27a2a", "#b4471a", "#e8c25a"][Math.floor(r() * 4)]] as const);
  return {
    back: (
      <>
        <Sky id={id} stops={["#fbe3b0", "#f2bd6b", "#d9843a", "#7a3a16"]} />
        <circle cx={300} cy={110} r={50} fill="#fff1c9" opacity={0.7} />
        <path d={ridge(113, 140, 30, 10)} fill="#d79a52" opacity={0.7} />
        {[40, 130, 210, 360, 450, 520].map((x, i) => (
          <g key={x}>
            <rect x={x - 3} y={90} width={6} height={140} fill="#5a2e16" />
            <circle cx={x} cy={90} r={30 + (i % 2) * 10} fill={["#c25a1e", "#e09a38", "#a8401a"][i % 3]} />
            <circle cx={x - 18} cy={110} r={20} fill={["#e09a38", "#a8401a", "#c25a1e"][i % 3]} />
            <circle cx={x + 18} cy={108} r={22} fill={["#a8401a", "#c25a1e", "#e09a38"][i % 3]} />
          </g>
        ))}
        <path d={ridge(117, 200, 20, 12)} fill="#6b3a18" />
      </>
    ),
    fore: (
      <>
        <path d="M0,0 C30,30 60,40 100,30 M560,0 C530,40 490,50 450,40" stroke="#3a1d0e" strokeWidth={3} fill="none" strokeLinecap="round" />
        {leaves.map(([x, y, a, c], i) => (
          <path key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(0.8)`} d="M0,-8 L2,-3 L7,-4 L4,0 L7,4 L2,3 L0,8 L-2,3 L-7,4 L-4,0 L-7,-4 L-2,-3Z" fill={c} opacity={0.85} />
        ))}
      </>
    ),
  };
};

const ruins: Art = (id) => ({
  back: (
    <>
      <Sky id={id} stops={["#efe6c8", "#d6cfa2", "#a9a578", "#5e6a3e"]} />
      <path d={ridge(121, 140, 30, 10)} fill="#9aa47a" opacity={0.8} />
      <g fill="#8c8670">
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={170 - i * 22} y={60 + i * 22} width={220 + i * 44} height={22} />)}
        <rect x={250} y={30} width={60} height={30} />
      </g>
      <g fill="#6e6a55">
        <rect x={268} y={40} width={24} height={20} />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={170 - i * 22} y={80 + i * 22} width={220 + i * 44} height={2} />)}
      </g>
      {[60, 100, 460, 500].map((x) => <g key={x}><rect x={x} y={110} width={16} height={100} fill="#a39d84" /><rect x={x - 4} y={104} width={24} height={8} fill="#8c8670" /></g>)}
      <path d={ridge(127, 205, 20, 12)} fill="#4f5e30" />
    </>
  ),
  fore: (
    <>
      <path d="M0,0 C20,40 10,100 30,160 M560,0 C540,50 550,110 530,170" stroke="#3a4a24" strokeWidth={2} fill="none" />
      {([[30, 160, 80], [16, 80, 30], [530, 170, 100], [548, 90, 150]] as const).map(([x, y, rr], i) => <Leaf key={i} x={x} y={y} s={22} rot={rr} color="#5f7438" vein="#b9b07a" />)}
      <path d="M0,386 L0,320 L40,320 L40,300 L70,300 L70,386Z M560,386 L560,310 L520,310 L520,330 L490,330 L490,386Z" fill="#6e6a55" />
      <Leaf x={20} y={300} s={40} rot={-60} color="#344a24" />
      <Leaf x={540} y={312} s={40} rot={-120} color="#344a24" />
    </>
  ),
});

const ART: Record<string, Art> = { tropical, oceanic, rainforest, desert, alpine, sakura, volcanic, arctic, cyber, space, autumn, ruins };

export function ThemeArt({ theme, layer, className, dim = 0 }: { theme: string; layer: "back" | "fore"; className?: string; dim?: number }) {
  const id = useId().replace(/:/g, "");
  const art = (ART[theme] ?? tropical)(id);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} style={{ filter: "saturate(1.55) brightness(1.12) contrast(1.05)" }} aria-hidden>
      {art[layer]}
      {layer === "back" && dim > 0 && <rect width={W} height={H} fill="#000" opacity={dim} />}
    </svg>
  );
}
