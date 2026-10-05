import { ExternalLink, Info, Presentation, Warehouse, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type LabZone = Database["public"]["Tables"]["lab_zones"]["Row"];

const positions: Record<string, string> = {
  electronics: "left-[1%] top-[3%] h-[61%] w-[11%]",
  instrumentals: "left-[13%] top-[3%] h-[30%] w-[6%]",
  "3d-print": "left-[20%] top-[3%] h-[30%] w-[18%]",
  "machine-1": "left-[39%] top-[19%] h-[31%] w-[11.5%]",
  "machine-2": "left-[51.5%] top-[19%] h-[31%] w-[11.5%]",
  "machine-3": "left-[64%] top-[19%] h-[31%] w-[11.5%]",
  storage: "left-[77%] top-[3%] h-[30%] w-[22%]",
  workshops: "left-[13%] top-[36%] h-[29%] w-[25%]",
  dmark: "left-[57%] top-[67%] h-[29%] w-[24%]",
  office: "left-[82%] top-[49%] h-[47%] w-[17%]",
  "computer-bars": "left-[1%] top-[81%] h-[15%] w-[37%]",
};

const zoneTone: Record<string, string> = {
  electronics: "border-primary bg-primary/10",
  instrumentals: "border-zone-pink bg-zone-pink/10",
  "3d-print": "border-zone-green bg-zone-green/10",
  "machine-1": "border-zone-violet bg-zone-violet text-primary-foreground",
  "machine-2": "border-zone-violet bg-zone-violet text-primary-foreground",
  "machine-3": "border-zone-violet bg-zone-violet text-primary-foreground",
  workshops: "border-zone-pink bg-zone-pink/10",
  dmark: "border-zone-yellow bg-zone-yellow/10",
  office: "border-foreground bg-card",
  storage: "border-zone-yellow bg-zone-yellow/10",
  "computer-bars": "border-foreground bg-foreground text-background",
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
  const ordered = zones.filter((zone) => positions[zone.slug]);

  const activate = (zone: LabZone) => {
    if (zone.action_type === "external" && zone.external_url) {
      window.open(zone.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    onSelect(zone);
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto overscroll-x-contain border-4 border-foreground bg-card p-2 shadow-[8px_8px_0_var(--foreground)] [scrollbar-color:var(--primary)_var(--muted)] [scrollbar-width:thin] sm:p-3">
        <div className="relative h-[440px] min-w-[1040px] border-2 border-foreground bg-muted lg:h-[520px] lg:min-w-0">
          <div className="absolute left-[40%] top-0 z-20 h-2 w-[36%] bg-destructive" aria-label="Выход" />
          <div className="absolute left-0 top-[63%] z-20 h-[18%] w-2 bg-destructive" aria-label="Выход" />
          {ordered.map((zone) => (
            <Button
              key={zone.id}
              type="button"
              variant="outline"
              onClick={() => activate(zone)}
              className={cn(
                "group absolute min-h-0 whitespace-normal rounded-none border-4 p-3 text-left font-black uppercase tracking-normal shadow-[3px_3px_0_var(--foreground)] transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[7px_7px_0_var(--foreground)] focus-visible:z-30 focus-visible:ring-4 focus-visible:ring-primary/40",
                positions[zone.slug], zoneTone[zone.slug] || "border-foreground bg-card",
              )}
              aria-label={localized(zone, "name")}
            >
              <span className="flex h-full min-w-0 w-full flex-col justify-between gap-2 overflow-hidden">
                <ZoneIcon zone={zone} />
                <span
                  className={cn(
                    "block max-w-full overflow-hidden text-[11px] leading-[1.2] sm:text-xs lg:text-sm",
                    zone.slug === "instrumentals" && "text-[9px] sm:text-[10px] lg:text-xs",
                  )}
                >
                  {localized(zone, "name")}
                </span>
              </span>
            </Button>
          ))}
          <div className="pointer-events-none absolute left-[39%] top-[3%] h-[13%] w-[36.5%] border-2 border-zone-green bg-card px-2 py-1 text-center text-[10px] font-black uppercase text-foreground">
            Technical zone · cooling
          </div>
        </div>
      </div>
    </div>
  );
}