// Card theme palettes. These are artwork colors for the collectible itself
// (printed-object colors), kept as data so each world can be rendered and exported.

export interface CardTheme {
  id: string;
  no: string;
  name: string;
  tagline: string;
  backTitle: string;
  frame: string; // outer printed border
  line: string; // ornamental inner rule
  panel: string; // information plate
  panelAlpha: number;
  ink: string;
  muted: string;
  accent: string;
  onArt: string; // text placed directly on artwork
  heat: [string, string, string, string, string];
}

export const THEMES: CardTheme[] = [
  { id: "tropical", no: "01", name: "Tropical Forest", tagline: "Discovered beneath an ancient canopy", backTitle: "Field Notes",
    frame: "#12301f", line: "#c9d65a", panel: "#0f2a1c", panelAlpha: 0.9, ink: "#eef3d2", muted: "#a9bf8c", accent: "#d4e06a", onArt: "#f6f9e4",
    heat: ["#1d3d28", "#2f6b3a", "#4f9a45", "#8cc152", "#d4e86a"] },
  { id: "oceanic", no: "02", name: "Oceanic", tagline: "Charted where the tide meets the reef", backTitle: "Ship's Log",
    frame: "#0a2342", line: "#7fe7e2", panel: "#0b2a4a", panelAlpha: 0.88, ink: "#e6fbff", muted: "#9cc8d8", accent: "#5ce1e6", onArt: "#f2feff",
    heat: ["#123a5e", "#13627f", "#1592a0", "#3fc9c2", "#b6f5e8"] },
  { id: "rainforest", no: "03", name: "Rainforest", tagline: "Grown in the green dark after rain", backTitle: "Under the Canopy",
    frame: "#06231e", line: "#b5c94a", panel: "#082a24", panelAlpha: 0.9, ink: "#dff0d8", muted: "#93b39a", accent: "#c6d655", onArt: "#eef8e6",
    heat: ["#0f3a31", "#155a45", "#2a7d4f", "#6aa84a", "#c6d655"] },
  { id: "desert", no: "04", name: "Desert Mirage", tagline: "Shaped by wind across endless dunes", backTitle: "Caravan Ledger",
    frame: "#5a2e14", line: "#e8b25a", panel: "#f3e2c3", panelAlpha: 0.93, ink: "#3b1f0e", muted: "#8a5a36", accent: "#c4561f", onArt: "#3b1f0e",
    heat: ["#e6cfa3", "#e8b25a", "#d98a2e", "#b85a1d", "#7a3210"] },
  { id: "alpine", no: "05", name: "Alpine Mountains", tagline: "Built at altitude, in thin clear air", backTitle: "Summit Register",
    frame: "#22313f", line: "#a9c3d6", panel: "#eef3f7", panelAlpha: 0.93, ink: "#1c2a36", muted: "#5c7385", accent: "#2f5d50", onArt: "#1c2a36",
    heat: ["#d6e1e9", "#a9c3d6", "#6f97b5", "#3f6a8c", "#1f3f5a"] },
  { id: "sakura", no: "06", name: "Sakura Spring", tagline: "Written in the season of falling petals", backTitle: "Spring Scroll",
    frame: "#3a2a2a", line: "#e8a7b0", panel: "#fbf1ea", panelAlpha: 0.94, ink: "#3a2624", muted: "#8c6460", accent: "#b8414b", onArt: "#3a2624",
    heat: ["#f1dcd6", "#f2b8c0", "#e58a98", "#c95668", "#8e2c3a"] },
  { id: "volcanic", no: "07", name: "Volcanic Inferno", tagline: "Forged where the earth runs molten", backTitle: "From the Core",
    frame: "#120c0b", line: "#ff8a3d", panel: "#1a1110", panelAlpha: 0.9, ink: "#f6e3d0", muted: "#b78f7a", accent: "#ff6a1f", onArt: "#fff1e2",
    heat: ["#2e1c17", "#6e1d12", "#b3311a", "#ef5a1c", "#ffb23f"] },
  { id: "arctic", no: "08", name: "Arctic Aurora", tagline: "Lit by the northern sky at midnight", backTitle: "Polar Night",
    frame: "#0a1430", line: "#6ff3d6", panel: "#0d1a3a", panelAlpha: 0.88, ink: "#e8f6ff", muted: "#9fb6d4", accent: "#6ff3d6", onArt: "#f2fbff",
    heat: ["#1a2a52", "#1d4f6e", "#21839a", "#3fc6c0", "#a8ffe8"] },
  { id: "cyber", no: "09", name: "Cyberpunk City", tagline: "Compiled in a city that never sleeps", backTitle: "Root Access",
    frame: "#0b0a14", line: "#ff3fd8", panel: "#110f1f", panelAlpha: 0.9, ink: "#e9f3ff", muted: "#9b97c4", accent: "#19f0ff", onArt: "#f4f8ff",
    heat: ["#211d3a", "#3a1f6b", "#7a2bd1", "#d63bd8", "#19f0ff"] },
  { id: "space", no: "10", name: "Space Odyssey", tagline: "Transmitted from beyond the ring planets", backTitle: "Mission Telemetry",
    frame: "#070a1f", line: "#8fa8ff", panel: "#0b1030", panelAlpha: 0.88, ink: "#e7ebff", muted: "#9aa3d6", accent: "#ffc27a", onArt: "#f3f5ff",
    heat: ["#181d46", "#2a2f7a", "#4b4fc4", "#7f7cf0", "#c2b8ff"] },
  { id: "autumn", no: "11", name: "Autumn Wilderness", tagline: "Gathered under golden falling leaves", backTitle: "Harvest Almanac",
    frame: "#3a1d0e", line: "#e3a24a", panel: "#f6ead6", panelAlpha: 0.94, ink: "#3a1d0e", muted: "#86603f", accent: "#b4471a", onArt: "#fff6e6",
    heat: ["#e8d6b8", "#e3b25a", "#d27a2a", "#a9431a", "#6b2a12"] },
  { id: "ruins", no: "12", name: "Ancient Ruins", tagline: "Inscribed on stone the jungle reclaimed", backTitle: "The Inscription",
    frame: "#2e2a20", line: "#c9b26a", panel: "#e9e2cf", panelAlpha: 0.94, ink: "#2b2a22", muted: "#6e6a55", accent: "#8a6f2a", onArt: "#fbf6e6",
    heat: ["#d9d1b7", "#b9b07a", "#8e9a52", "#5f7438", "#344a24"] },
];
