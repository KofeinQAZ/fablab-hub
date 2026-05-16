const EQUIPMENT_IMAGE_RULES: Array<{ includes: string[]; url: string }> = [
  {
    includes: ["bambu x1c", "bambu"],
    url: "https://images.unsplash.com/photo-1627384113710-184c8a2456f9?w=800",
  },
  {
    includes: ["prusa mk4", "prusa"],
    url: "https://images.unsplash.com/photo-1631526437190-c65191295b9a?w=800",
  },
  {
    includes: ["trotec speedy 400", "trotec", "laser"],
    url: "https://images.unsplash.com/photo-1634710168393-27715f2ed621?w=800",
  },
  {
    includes: ["tormach 440", "tormach", "cnc"],
    url: "https://images.unsplash.com/photo-1616401037130-170dfb6c697e?w=800",
  },
  {
    includes: ["dji avata", "avata", "fpv", "drone", "portable"],
    url: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800",
  },
];
const DEFAULT_EQUIPMENT_IMAGE = "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=900";

export function getEquipmentImageUrl(name: string, imageUrl: string | null | undefined) {
  if (imageUrl) return imageUrl;

  const normalized = name.trim().toLowerCase();
  const matchedRule = EQUIPMENT_IMAGE_RULES.find((rule) =>
    rule.includes.some((needle) => normalized.includes(needle)),
  );
  if (matchedRule) return matchedRule.url;

  return DEFAULT_EQUIPMENT_IMAGE;
}
