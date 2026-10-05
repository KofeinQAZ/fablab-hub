import { ExternalLink, Info, Presentation, Warehouse, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type LabZone = Database["public"]["Tables"]["lab_zones"]["Row"];

const positions: Record<string, string> = {
  electronics: "left-[6%] top-[3%] h-[61%] w-[8.5%]",
  instrumentals: "left-[16%] top-[3%] h-[30%] w-[7%]",
  "3d-print": "left-[24%] top-[3%] h-[30%] w-[15%]",
  "machine-1": "left-[40%] top-[14%] h-[31%] w-[10.5%]",
  "machine-2": "left-[51.5%] top-[14%] h-[31%] w-[10.5%]",
  "machine-3": "left-[63%] top-[14%] h-[31%] w-[10.5%]",
  storage: "left-[76%] top-[3%] h-[30%] w-[20%]",
  workshops: "left-[16%] top-[36%] h-[36%] w-[23%]",
  dmark: "left-[57%] top-[67%] h-[29%] w-[24%]",
  office: "left-[82%] top-[49%] h-[47%] w-[17%]",
  "computer-bars": "left-[1%] top-[81%] h-[15%] w-[37%]",
};

const extraPositions: Record<string, string[]> = {
  "computer-bars": ["left-[1%] top-[3%] h-[78%] w-[4%]"],
};

const zoneTone: Record<string, string> = {
  electronics: "border-primary bg-primary/10 shadow-primary/25",
  instrumentals: "border-zone-pink bg-zone-pink/10 shadow-zone-pink/25",
  "3d-print": "border-zone-green bg-zone-green/10 shadow-zone-green/25",
  "machine-1": "border-zone-violet bg-zone-violet text-primary-foreground",
  "machine-2": "border-zone-violet bg-zone-violet text-primary-foreground",
  "machine-3": "border-zone-violet bg-zone-violet text-primary-foreground",
  workshops: "border-zone-pink bg-zone-pink/10 shadow-zone-pink/25",
  dmark: "border-zone-yellow bg-zone-yellow/10 shadow-zone-yellow/25",
  office: "border-foreground bg-card",
  storage: "border-zone-yellow bg-zone-yellow/10 shadow-zone-yellow/25",
  "computer-bars": "border-foreground bg-foreground text-background",
};

const zoneCode: Record<string, string> = {
  electronics: "ZN–01",
  instrumentals: "ZN–02",
  "3d-print": "ZN–03",
  "machine-1": "MC–01",
  "machine-2": "MC–02",
  "machine-3": "MC–03",
  workshops: "WS–01",
  storage: "ST–01",
  dmark: "DM–01",
  office: "OF–01",
  "computer-bars": "PC–01",
};

function ZoneIcon({ zone }: { zone: LabZone }) {
  if (zone.action_type === "external") return <ExternalLink className="h-4 w-4" />;
  if (zone.action_type === "bookable") return <Presentation className="h-4 w-4" />;
  if (zone.slug === "storage") return <Warehouse className="h-4 w-4" />;
  if (zone.slug.startsWith("machine")) return <Wrench className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function LabMap({ zones, language, onSelect }: { zones: LabZone[]; language: string; onSelect: (zone: LabZone) => void }) {
  const localized = (zone: LabZone, field: "name" | "description") => {
    const normalizedLanguage = language.split("-")[0];
    const key = normalizedLanguage === "ru" ? field : `${field}_${normalizedLanguage}` as keyof LabZone;
    return String(zone[key] || zone[field] || "");
  };
  const ordered = zones.flatMap((zone) => {
    const primaryPosition = positions[zone.slug];
    if (!primaryPosition) return [];
    return [primaryPosition, ...(extraPositions[zone.slug] || [])].map((position, placementIndex) => ({
      zone,
      position,
      placementIndex,
    }));
  });

  const activate = (zone: LabZone) => {
    if (zone.action_type === "external" && zone.external_url) {
      window.open(zone.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    onSelect(zone);
  };

  return (
    <div className="w-full">
      <div className="border-2 border-foreground bg-card shadow-[6px_6px_0_var(--foreground)]">
        <div className="flex h-10 items-center justify-between border-b-2 border-foreground px-3 font-mono text-xs font-bold uppercase text-muted-foreground sm:px-4">
          <span>FabLab · Floor 01</span>
          <span className="hidden sm:inline">Plan / Interactive</span>
          <span>Rev. 02</span>
        </div>
        <div className="overflow-x-auto overscroll-x-contain p-2 [scrollbar-color:var(--primary)_var(--muted)] [scrollbar-width:thin] sm:p-3">
          <div className="blueprint-grid relative h-[440px] min-w-[1040px] border-2 border-foreground bg-muted/60 lg:h-[520px] lg:min-w-0">
          <div className="absolute left-[12%] top-0 z-20 h-1.5 w-[4%] bg-destructive" aria-label="Выход" />
          <div className="absolute bottom-0 left-[45%] z-20 h-1.5 w-[15%] bg-destructive" aria-label="Ворота" />
          <div className="absolute bottom-0 left-[40%] z-20 h-1.5 w-[4%] bg-destructive" aria-label="Дверь" />
          {ordered.map(({ zone, position, placementIndex }) => (
            <Button
              key={`${zone.id}-${placementIndex}`}
              type="button"
              variant="outline"
              onClick={() => activate(zone)}
              className={cn(
                "group absolute min-h-0 whitespace-normal rounded-none border-2 p-2.5 text-left font-black uppercase tracking-normal shadow-[3px_3px_0_currentColor] transition-[transform,box-shadow,filter] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[5px_5px_0_currentColor] focus-visible:z-30 focus-visible:ring-4 focus-visible:ring-primary/40 motion-reduce:transform-none motion-reduce:transition-none",
                position,
                zone.slug === "computer-bars" && "z-10",
                zoneTone[zone.slug] || "border-foreground bg-card",
              )}
              aria-label={localized(zone, "name")}
            >
              <span className="flex h-full min-w-0 w-full flex-col justify-between gap-2 overflow-hidden">
                <span className="flex w-full items-start justify-between gap-1 font-mono text-xs font-bold opacity-70">
                  <span>{zoneCode[zone.slug] || "ZONE"}</span>
                  <ZoneIcon zone={zone} />
                </span>
                <span
                  className={cn(
                    "block max-w-full overflow-hidden text-sm leading-tight",
                    (zone.slug === "electronics" || zone.slug === "instrumentals") &&
                      "self-center text-xs [writing-mode:vertical-rl] rotate-180 lg:text-sm",
                    zone.slug === "computer-bars" && placementIndex > 0 && "sr-only",
                  )}
                >
                  {localized(zone, "name")}
                </span>
              </span>
            </Button>
          ))}
          <div className="pointer-events-none absolute left-[40%] top-[3%] flex h-[8%] w-[33.5%] items-center justify-center border-2 border-zone-green bg-card px-2 text-center text-xs font-black uppercase leading-none text-foreground">
            Technical zone · cooling
          </div>
          <div className="pointer-events-none absolute bottom-2 right-2 font-mono text-xs font-bold uppercase text-muted-foreground">N ↑ · Scale 1:50</div>
          </div>
        </div>
      </div>
    </div>
  );
}