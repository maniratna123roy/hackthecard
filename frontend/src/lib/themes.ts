export interface CardTheme {
  id: string;
  no: string;
  name: string;
  tagline: string;
  backTitle: string;
  frame: string;
  line: string;
  panel: string;
  panelAlpha: number;
  ink: string;
  muted: string;
  accent: string;
  onArt: string;
  heat: [string, string, string, string, string];
}

export const THEMES: CardTheme[] = [
  { id: "tropical", no: "01", name: "Tropical Forest", tagline: "Discovered beneath an ancient canopy", backTitle: "Field Notes",
    frame: "#13a35a", line: "#ffe14d", panel: "#f4ffe6", panelAlpha: 0.95, ink: "#123d24", muted: "#4f7a3e", accent: "#ff7a1a", onArt: "#0a3d1f",
    heat: ["#e3f5d8", "#9be27a", "#3fcf5a", "#13a35a", "#0a6b3a"] },
  { id: "oceanic", no: "02", name: "Oceanic", tagline: "Charted where the tide meets the reef", backTitle: "Ship's Log",
    frame: "#0a8fe0", line: "#ffd23f", panel: "#eefcff", panelAlpha: 0.95, ink: "#08324f", muted: "#3d7792", accent: "#ff5d73", onArt: "#08324f",
    heat: ["#dff3ff", "#8fd8ff", "#2fb5ff", "#0a8fe0", "#0a4f9a"] },
  { id: "rainforest", no: "03", name: "Rainforest", tagline: "Grown in the green dark after rain", backTitle: "Under the Canopy",
    frame: "#0fb39a", line: "#e6ff4d", panel: "#efffef", panelAlpha: 0.95, ink: "#0b3a2e", muted: "#3f7a62", accent: "#ff4fa0", onArt: "#ffffff",
    heat: ["#dcfbf2", "#8ff0d4", "#2fd8ab", "#0fb39a", "#0a6b5a"] },
  { id: "desert", no: "04", name: "Desert Mirage", tagline: "Shaped by wind across endless dunes", backTitle: "Caravan Ledger",
    frame: "#ff8a1f", line: "#ffe066", panel: "#fff6e3", panelAlpha: 0.95, ink: "#4a2408", muted: "#9a5a26", accent: "#ff3d6e", onArt: "#3b1f0e",
    heat: ["#ffefd0", "#ffcf7a", "#ffa63d", "#ff7a1a", "#d6420a"] },
  { id: "alpine", no: "05", name: "Alpine Mountains", tagline: "Built at altitude, in thin clear air", backTitle: "Summit Register",
    frame: "#3a7bff", line: "#9fe3ff", panel: "#f2f8ff", panelAlpha: 0.95, ink: "#10264a", muted: "#4f6c94", accent: "#ff5a36", onArt: "#10264a",
    heat: ["#e2edff", "#a9c8ff", "#6f9cff", "#3a7bff", "#1a45c0"] },
  { id: "sakura", no: "06", name: "Sakura Spring", tagline: "Written in the season of falling petals", backTitle: "Spring Scroll",
    frame: "#ff5fa2", line: "#ffd1e3", panel: "#fff4f8", panelAlpha: 0.95, ink: "#4a1630", muted: "#a0587a", accent: "#ff2d6f", onArt: "#4a1630",
    heat: ["#ffe3ef", "#ffb3d2", "#ff7ab3", "#ff3f8f", "#c4145a"] },
  { id: "volcanic", no: "07", name: "Volcanic Inferno", tagline: "Forged where the earth runs molten", backTitle: "From the Core",
    frame: "#ff3d1f", line: "#ffd23f", panel: "#fff3ea", panelAlpha: 0.95, ink: "#3a0d06", muted: "#9a4630", accent: "#ff3d1f", onArt: "#ffffff",
    heat: ["#ffe6d6", "#ffb38a", "#ff7a3d", "#ff3d1f", "#c41a0a"] },
  { id: "arctic", no: "08", name: "Arctic Aurora", tagline: "Lit by the northern sky at midnight", backTitle: "Polar Night",
    frame: "#2fd4ff", line: "#b7fff0", panel: "#f0fdff", panelAlpha: 0.95, ink: "#0a2a4a", muted: "#4a7394", accent: "#7a5cff", onArt: "#ffffff",
    heat: ["#dcfaff", "#8fefff", "#2fd4ff", "#4a9aff", "#7a5cff"] },
  { id: "cyber", no: "09", name: "Cyberpunk City", tagline: "Compiled in a city that never sleeps", backTitle: "Root Access",
    frame: "#ff2fd0", line: "#19f0ff", panel: "#fbf2ff", panelAlpha: 0.95, ink: "#2a0a40", muted: "#7a4a9a", accent: "#00c2ff", onArt: "#ffffff",
    heat: ["#f6e3ff", "#e6a3ff", "#c45cff", "#ff2fd0", "#00c2ff"] },
  { id: "space", no: "10", name: "Space Odyssey", tagline: "Transmitted from beyond the ring planets", backTitle: "Mission Telemetry",
    frame: "#6a5cff", line: "#ffc27a", panel: "#f3f2ff", panelAlpha: 0.95, ink: "#191654", muted: "#5d5aa0", accent: "#ff7ad1", onArt: "#ffffff",
    heat: ["#e8e6ff", "#b7b0ff", "#8a7cff", "#6a5cff", "#3a2fc4"] },
  { id: "autumn", no: "11", name: "Autumn Wilderness", tagline: "Gathered under golden falling leaves", backTitle: "Harvest Almanac",
    frame: "#ff6a1a", line: "#ffd23f", panel: "#fff4e2", panelAlpha: 0.95, ink: "#4a1d06", muted: "#9a5a2a", accent: "#e8343a", onArt: "#4a1d06",
    heat: ["#ffefd6", "#ffcc6a", "#ff9a2f", "#ff6a1a", "#d1300a"] },
  { id: "ruins", no: "12", name: "Ancient Ruins", tagline: "Inscribed on stone the jungle reclaimed", backTitle: "The Inscription",
    frame: "#2fbf71", line: "#ffd23f", panel: "#fbf8ea", panelAlpha: 0.95, ink: "#24301a", muted: "#6a7450", accent: "#ff8a1f", onArt: "#24301a",
    heat: ["#e6f5dc", "#a8e6a0", "#5fd17f", "#2fbf71", "#157a45"] },
];
