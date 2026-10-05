import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Box, Map, Package, Plus, ScanLine, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentInfoDialog } from "@/components/equipment-info-dialog";
import { InventorySection } from "@/components/inventory-section";
import { LabMap, type LabZone } from "@/components/lab-map";
import { LabZoneDialog } from "@/components/lab-zone-dialog";
import type { EquipmentDetails } from "@/components/equipment-detail-dialog";

export const Route = createFileRoute("/_authenticated/_student/booking")({ component: BookingPage });

function localized(obj: Record<string, unknown>, field: string, language: string) {
  const normalizedLanguage = language.split("-")[0];
  const key = normalizedLanguage === "ru" ? field : `${field}_${normalizedLanguage}`;
  return String(obj[key] || obj[field] || "");
}

function BookingPage() {
  const { t, i18n } = useTranslation();
  const [section, setSection] = useState<"map" | "equipment" | "inventory">("map");
  const [selectedZone, setSelectedZone] = useState<LabZone | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetails | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["user-profile-briefing"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("id, safety_briefing_passed, role").eq("id", user.id).single();
      return data;
    },
  });
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["lab-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_zones").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipment-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return data as EquipmentDetails[];
    },
  });

  const mapZones = useMemo(() => zones.map((zone) => {
    const slot = zone.slug.match(/^machine-(\d)$/)?.[1];
    if (!slot) return zone;
    const item = equipment.find((entry) => (entry as EquipmentDetails & { map_slot?: number | null }).map_slot === Number(slot));
    if (!item) return zone;
    return { ...zone, name: item.name, name_kz: item.name_kz ?? null, name_en: item.name_en ?? null };
  }), [zones, equipment]);
  const selectMapZone = (zone: LabZone) => {
    const slot = zone.slug.match(/^machine-(\d)$/)?.[1];
    if (slot) {
      const item = equipment.find((entry) => (entry as EquipmentDetails & { map_slot?: number | null }).map_slot === Number(slot));
      if (item) { setSelectedEquipment(item); return; }
    }
    setSelectedZone(zone);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inventoryId = params.get("inventoryId");
    const equipmentId = params.get("equipmentId");
    if (inventoryId) setSection("inventory");
    if (!equipmentId) return;
    setSection("equipment");
    const item = equipment.find((entry) => entry.id === equipmentId);
    if (item) {
      setSelectedEquipment(item);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [equipment]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 overflow-hidden p-4 pb-24 md:p-8">
      <section className="relative overflow-hidden border-2 border-foreground bg-foreground text-background shadow-[6px_6px_0_var(--primary)]">
        <div className="grid min-h-[320px] md:grid-cols-[72px_1fr_280px]">
          <div className="hidden border-r border-background/20 md:flex md:flex-col md:items-center md:justify-between md:py-6">
            <ScanLine className="h-6 w-6 text-primary" />
            <span className="rotate-180 font-mono text-xs font-bold uppercase text-background/60 [writing-mode:vertical-rl]">Digital fabrication laboratory</span>
            <span className="font-mono text-xs text-background/50">01</span>
          </div>
          <div className="flex flex-col justify-center px-5 py-10 sm:px-9 md:py-12">
            <p className="mb-5 font-mono text-xs font-bold uppercase text-primary">SATBAYEV // FABLAB // 01</p>
            <h1 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-normal sm:text-6xl">{t("booking.map.heroTitle")}</h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-background/70 sm:text-lg">{t("booking.map.heroText")}</p>
          </div>
          <div className="blueprint-grid-dark flex border-t border-background/20 p-5 md:border-l md:border-t-0 md:p-6">
            <div className="mt-auto w-full space-y-2">
              {[t("booking.map.capabilities.prototype"), t("booking.map.capabilities.electronics"), t("booking.map.capabilities.education")].map((item, index) => (
                <div key={item} className="flex items-center justify-between border-b border-background/25 py-3 font-mono text-xs font-bold uppercase">
                  <span>{item}</span><span className="text-primary">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Tabs value={section} onValueChange={(value) => setSection(value as typeof section)}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-0 rounded-none border-2 border-foreground bg-card p-0 shadow-[4px_4px_0_var(--foreground)]">
          <TabsTrigger value="map" className="min-h-14 rounded-none border-r-2 border-foreground px-2 font-mono text-xs font-black uppercase sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Map className="mr-2 h-4 w-4" />{t("booking.map.tabs.map")}</TabsTrigger>
          <TabsTrigger value="equipment" className="min-h-14 rounded-none border-r-2 border-foreground px-2 font-mono text-xs font-black uppercase sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Wrench className="mr-2 h-4 w-4" />{t("booking.map.tabs.equipment")}</TabsTrigger>
          <TabsTrigger value="inventory" className="min-h-14 rounded-none px-2 font-mono text-xs font-black uppercase sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Package className="mr-2 h-4 w-4" />{t("booking.map.tabs.inventory")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "map" && (
        <section className="space-y-5">
          <div className="grid gap-4 border-b-2 border-foreground/20 pb-5 sm:grid-cols-[1fr_minmax(260px,0.65fr)] sm:items-end">
            <div><p className="font-mono text-xs font-black uppercase text-primary">{t("booking.map.eyebrow")} // 01</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.map.title")}</h2></div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:justify-self-end">{t("booking.map.hint")}</p>
          </div>
          {zonesLoading ? <div className="h-[420px] animate-pulse border-4 border-foreground bg-muted" /> : <LabMap zones={mapZones} language={i18n.language} onSelect={selectMapZone} />}
        </section>
      )}

      {section === "equipment" && (
        <section className="space-y-5">
          <div className="border-b-4 border-foreground pb-5"><p className="text-xs font-black uppercase tracking-widest text-primary">{t("booking.map.catalogEyebrow")}</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.map.catalogTitle")}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{t("booking.map.catalogText")}</p></div>
          {equipmentLoading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="h-80 animate-pulse border-4 border-foreground bg-muted" />)}</div> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {equipment.map((item) => {
                const name = localized(item as unknown as Record<string, unknown>, "name", i18n.language);
                const description = localized(item as unknown as Record<string, unknown>, "description", i18n.language);
                 return <Card key={item.id} className="group overflow-hidden rounded-none border-2 border-foreground shadow-[4px_4px_0_var(--foreground)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--primary)] motion-reduce:transform-none">
                  <button type="button" onClick={() => setSelectedEquipment(item)} className="block aspect-[16/10] w-full border-b-2 border-foreground bg-muted text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40">
                    {item.image_url ? <img src={item.image_url} alt={name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center"><Box className="h-10 w-10 text-muted-foreground" /></span>}
                  </button>
                  <CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black uppercase leading-tight tracking-normal">{name}</h3><span className="shrink-0 border border-foreground bg-accent px-2 py-1 font-mono text-xs font-black uppercase">{item.status === "active" ? t("booking.card.statusActive") : t("booking.card.statusRepair")}</span></div><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description || t("booking.card.defaultDesc")}</p><Button type="button" variant="outline" onClick={() => setSelectedEquipment(item)} className="h-11 w-full justify-between rounded-none border-2 font-black uppercase"><span>{t("booking.map.details")}</span><Plus className="h-4 w-4" /></Button></CardContent>
                </Card>;
              })}
            </div>
          )}
        </section>
      )}

      {section === "inventory" && <InventorySection userId={profile?.id ?? null} active />}
      <LabZoneDialog zone={selectedZone} userId={profile?.id ?? null} onClose={() => setSelectedZone(null)} />
      <EquipmentInfoDialog open={!!selectedEquipment} equipment={selectedEquipment} onClose={() => setSelectedEquipment(null)} />
    </main>
  );
}