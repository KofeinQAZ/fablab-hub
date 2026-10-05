import { ExternalLink, Info, Presentation, Warehouse, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type LabZone = Database["public"]["Tables"]["lab_zones"]["Row"];

const positions: Record<string, string> = {
  electronics: "col-start-1 col-span-2 row-start-1 row-span-4",
  instrumentals: "col-start-3 col-span-1 row-start-1 row-span-2",
  "3d-print": "col-start-4 col-span-3 row-start-1 row-span-2",
  "machine-1": "col-start-7 col-span-2 row-start-2 row-span-2",
  "machine-2": "col-start-9 col-span-2 row-start-2 row-span-2",
  "machine-3": "col-start-11 col-span-2 row-start-2 row-span-2",
  storage: "col-start-13 col-span-4 row-start-1 row-span-2",
  workshops: "col-start-3 col-span-4 row-start-3 row-span-2",
  dmark: "col-start-10 col-span-4 row-start-5 row-span-2",
  office: "col-start-14 col-span-3 row-start-4 row-span-3",
  "computer-bars": "col-start-1 col-span-6 row-start-6 row-span-1",
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
    <div className="space-y-4">
      <div className="hidden lg:block border-4 border-foreground bg-card p-3 shadow-[8px_8px_0_var(--foreground)]">
        <div className="relative grid h-[520px] grid-cols-16 grid-rows-6 gap-3 border-2 border-foreground bg-muted p-3">
          <div className="absolute left-[40%] right-[22%] top-0 h-2 bg-destructive" aria-label="Выход" />
          <div className="absolute -left-0 top-[63%] h-[19%] w-2 bg-destructive" aria-label="Выход" />
          {ordered.map((zone) => (
            <Button
              key={zone.id}
              type="button"
              variant="outline"
              onClick={() => activate(zone)}
              className={cn(
                "group relative h-full min-h-0 w-full whitespace-normal rounded-none border-4 p-3 text-left font-black uppercase leading-tight tracking-normal shadow-[3px_3px_0_var(--foreground)] transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[7px_7px_0_var(--foreground)] focus-visible:ring-4 focus-visible:ring-primary/40",
                positions[zone.slug], zoneTone[zone.slug] || "border-foreground bg-card",
              )}
              aria-label={localized(zone, "name")}
            >
              <span className="flex h-full w-full flex-col justify-between gap-2">
                <ZoneIcon zone={zone} />
                <span className="text-xs xl:text-sm">{localized(zone, "name")}</span>
              </span>
            </Button>
          ))}
          <div className="pointer-events-none col-start-7 col-span-6 row-start-1 border-2 border-zone-green bg-card px-2 py-1 text-center text-[10px] font-black uppercase text-foreground">
            Technical zone · cooling
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {ordered.map((zone, index) => (
          <Button
            key={zone.id}
            type="button"
            variant="outline"
            onClick={() => activate(zone)}
            className={cn(
              "h-auto min-h-20 justify-start gap-3 whitespace-normal rounded-none border-2 p-4 text-left shadow-[3px_3px_0_var(--foreground)]",
              zoneTone[zone.slug] || "border-foreground bg-card",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-current bg-background/80 text-foreground">{String(index + 1).padStart(2, "0")}</span>
            <span className="flex-1 font-black uppercase leading-tight tracking-normal">{localized(zone, "name")}</span>
            <ZoneIcon zone={zone} />
          </Button>
        ))}
      </div>
    </div>
  );
}