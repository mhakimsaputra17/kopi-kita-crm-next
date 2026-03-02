// ─── Tag color mapping for interest tags ───
export const TAG_STYLES: Record<string, { bg: string; text: string; dotColor: string }> = {
  "sweet drinks": {
    bg: "bg-[#D4A574]/12",
    text: "text-[#A67C52] dark:text-[#D4A574]",
    dotColor: "#D4A574",
  },
  caramel: {
    bg: "bg-[#D4A574]/10",
    text: "text-[#8B6914] dark:text-[#D4A574]",
    dotColor: "#C4956A",
  },
  "oat milk": {
    bg: "bg-[#8B9D77]/12",
    text: "text-[#5E7248] dark:text-[#8B9D77]",
    dotColor: "#8B9D77",
  },
  "morning coffee": {
    bg: "bg-[#3C2415]/6 dark:bg-[#D4A574]/8",
    text: "text-[#3C2415] dark:text-[#D4A574]",
    dotColor: "#3C2415",
  },
  "pastry lover": {
    bg: "bg-[#C27A8A]/10",
    text: "text-[#A0524D] dark:text-[#D4908A]",
    dotColor: "#C27A8A",
  },
  workshop: {
    bg: "bg-[#7B8FA1]/10",
    text: "text-[#5A6F80] dark:text-[#9AB0C2]",
    dotColor: "#7B8FA1",
  },
  "black coffee": {
    bg: "bg-[#3C2415]/8 dark:bg-[#A67C52]/12",
    text: "text-[#3C2415] dark:text-[#C4956A]",
    dotColor: "#5C3D2E",
  },
  "cold drinks": {
    bg: "bg-[#6B9AC4]/10",
    text: "text-[#4A7DA8] dark:text-[#8BB8D8]",
    dotColor: "#6B9AC4",
  },
  matcha: {
    bg: "bg-[#7A9D6B]/10",
    text: "text-[#4E7240] dark:text-[#8B9D77]",
    dotColor: "#7A9D6B",
  },
  "latte art": {
    bg: "bg-[#C4956A]/12",
    text: "text-[#8B6B45] dark:text-[#D4A574]",
    dotColor: "#C4956A",
  },
  "healthy drinks": {
    bg: "bg-[#8B9D77]/10",
    text: "text-[#5E7248] dark:text-[#8B9D77]",
    dotColor: "#6B7D57",
  },
  "weekend vibes": {
    bg: "bg-[#A08060]/10",
    text: "text-[#6B5540] dark:text-[#C4956A]",
    dotColor: "#A08060",
  },
};

export const ALL_FILTER_TAGS = [
  "sweet drinks",
  "oat milk",
  "pastry lover",
  "caramel",
  "morning coffee",
  "workshop",
  "black coffee",
  "cold drinks",
  "matcha",
  "latte art",
  "healthy drinks",
  "weekend vibes",
];

export const SUGGESTED_TAGS = ALL_FILTER_TAGS;

// Avatar gradient palettes
const AVATAR_PALETTES = [
  { from: "#D4A574", to: "#A67C52" },
  { from: "#8B9D77", to: "#6B7D57" },
  { from: "#C27A8A", to: "#A0524D" },
  { from: "#7B8FA1", to: "#5A6F80" },
  { from: "#A08060", to: "#6B5540" },
  { from: "#C4956A", to: "#8B6B45" },
];

export function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export function getTagStyle(tag: string) {
  return TAG_STYLES[tag] || { bg: "bg-secondary", text: "text-muted-foreground", dotColor: "#999" };
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDateID(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
