import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Box, Cpu, Map, Package, Sparkles, Wrench } from "lucide-react";
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
  const key = language === "ru" ? field : `${field}_${language}`;
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
    <main className="mx-auto w-full max-w-7xl space-y-10 overflow-hidden p-4 pb-24 md:p-8">
      <section className="relative overflow-hidden border-4 border-foreground bg-foreground px-5 py-8 text-background shadow-[8px_8px_0_var(--primary)] sm:px-8 sm:py-10">
        <div className="absolute right-5 top-5 font-mono text-xs font-bold text-background/50">SATBAYEV · 01</div>
        <div className="relative max-w-3xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center border-2 border-background bg-primary text-primary-foreground"><Sparkles className="h-6 w-6" /></div>
          <h1 className="max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-normal sm:text-6xl">{t("booking.map.heroTitle")}</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-background/75 sm:text-lg">{t("booking.map.heroText")}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[t("booking.map.capabilities.prototype"), t("booking.map.capabilities.electronics"), t("booking.map.capabilities.education")].map((item) => <span key={item} className="border border-background/40 px-3 py-2 text-xs font-black uppercase tracking-widest">{item}</span>)}
          </div>
        </div>
      </section>

      <Tabs value={section} onValueChange={(value) => setSection(value as typeof section)}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-none border-2 border-foreground bg-muted p-2">
          <TabsTrigger value="map" className="min-h-12 rounded-none font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Map className="mr-2 h-4 w-4" />{t("booking.map.tabs.map")}</TabsTrigger>
          <TabsTrigger value="equipment" className="min-h-12 rounded-none font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Wrench className="mr-2 h-4 w-4" />{t("booking.map.tabs.equipment")}</TabsTrigger>
          <TabsTrigger value="inventory" className="min-h-12 rounded-none font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Package className="mr-2 h-4 w-4" />{t("booking.map.tabs.inventory")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "map" && (
        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-3 border-b-4 border-foreground pb-5 sm:flex-row sm:items-end">
            <div><p className="text-xs font-black uppercase tracking-widest text-primary">{t("booking.map.eyebrow")}</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.map.title")}</h2></div>
            <p className="max-w-md text-sm text-muted-foreground">{t("booking.map.hint")}</p>
          </div>
          {zonesLoading ? <div className="h-[420px] animate-pulse border-4 border-foreground bg-muted" /> : <LabMap zones={zones} language={i18n.language} onSelect={setSelectedZone} />}
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
                return <Card key={item.id} className="group overflow-hidden rounded-none border-4 border-foreground shadow-[6px_6px_0_var(--foreground)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[9px_9px_0_var(--primary)]">
                  <button type="button" onClick={() => setSelectedEquipment(item)} className="block aspect-[16/10] w-full border-b-4 border-foreground bg-muted text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40">
                    {item.image_url ? <img src={item.image_url} alt={name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <span className="flex h-full items-center justify-center"><Box className="h-10 w-10 text-muted-foreground" /></span>}
                  </button>
                  <CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black uppercase leading-tight tracking-normal">{name}</h3><span className="shrink-0 border-2 border-foreground bg-accent px-2 py-1 text-[10px] font-black uppercase">{item.status === "active" ? t("booking.card.statusActive") : t("booking.card.statusRepair")}</span></div><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description || t("booking.card.defaultDesc")}</p><Button type="button" variant="outline" onClick={() => setSelectedEquipment(item)} className="h-11 w-full rounded-none border-2 font-black uppercase tracking-widest">{t("booking.map.details")}</Button></CardContent>
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