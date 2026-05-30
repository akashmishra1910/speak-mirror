export const BEAUTIFY_FILTERS: Record<string, string> = {
  none: "brightness(1) contrast(1) saturate(1)",
  studio: "brightness(1.06) contrast(1.03) saturate(1.08)",
  warm: "sepia(0.12) brightness(1.05) contrast(1.02) saturate(1.08)",
  cool: "hue-rotate(-8deg) saturate(1.06) brightness(1.04) contrast(1.02)",
  smooth: "brightness(1.04) contrast(0.98) saturate(1.06) blur(0.3px)"
};

export const FILTER_NAMES: Record<string, string> = {
  none: "None (Original)",
  studio: "Studio Glow ✨",
  warm: "Warm Golden ☀️",
  cool: "Nordic Cool ❄️",
  smooth: "Soft Focus 🌸"
};
