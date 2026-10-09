import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Boxes, Box, CalendarCheck, Cpu, GraduationCap, Map, Package, Plus, Presentation, ScanLine, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const SECTION_IDS = ["map", "book", "equipment", "inventory"] as const;
type SectionId = (typeof SECTION_IDS)[number];

function scrollToSection(id: SectionId) {
  document.getElementById(`booking-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BookingPage() {
  const { t, i18n } = useTranslation();
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
    if (zone.slug === "3d-print") { window.location.assign("/print-3d"); return; }
    setSelectedZone(zone);
  };
  const workshopZone = zones.find((zone) => zone.slug === "workshops") ?? null;
  const printZone = zones.find((zone) => zone.slug === "3d-print") ?? null;
  const workshopName = workshopZone ? localized(workshopZone as unknown as Record<string, unknown>, "name", i18n.language) : "";
  const workshopDescription = workshopZone ? localized(workshopZone as unknown as Record<string, unknown>, "description", i18n.language) : "";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inventoryId = params.get("inventoryId");
    const equipmentId = params.get("equipmentId");
    if (inventoryId) scrollToSection("inventory");
    if (!equipmentId) return;
    const item = equipment.find((entry) => entry.id === equipmentId);
    if (item) {
      setSelectedEquipment(item);
      scrollToSection("equipment");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment.length]);

  const sectionNav: { id: SectionId; label: string; icon: typeof Map; index: string }[] = [
    { id: "map", label: t("booking.map.tabs.map"), icon: Map, index: "01" },
    { id: "book", label: t("booking.book.nav"), icon: CalendarCheck, index: "02" },
    { id: "equipment", label: t("booking.map.tabs.equipment"), icon: Wrench, index: "03" },
    { id: "inventory", label: t("booking.map.tabs.inventory"), icon: Package, index: "04" },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 overflow-hidden p-4 pb-24 md:p-8">
      <section className="relative overflow-hidden border-4 border-foreground bg-card text-foreground shadow-[8px_8px_0_var(--primary)]">
        <div className="grid min-h-[320px] md:grid-cols-[72px_1fr_280px]">
          <div className="hidden border-r-4 border-foreground md:flex md:flex-col md:items-center md:justify-between md:py-6">
            <ScanLine className="h-6 w-6 text-primary" />
            <span className="rotate-180 font-mono text-xs font-bold uppercase text-muted-foreground [writing-mode:vertical-rl]">Digital fabrication laboratory</span>
            <span className="font-mono text-xs font-bold text-muted-foreground">01</span>
          </div>
          <div className="flex flex-col justify-center px-5 py-10 sm:px-9 md:py-12">
            <p className="mb-5 inline-flex w-max items-center border-2 border-foreground bg-primary px-3 py-1 font-mono text-xs font-bold uppercase text-primary-foreground shadow-[3px_3px_0_var(--foreground)]">SATBAYEV // FABLAB // 01</p>
            <h1 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">{t("booking.map.heroTitle")}</h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">{t("booking.map.heroText")}</p>
          </div>
          <div className="blueprint-grid hidden flex-col border-l-4 border-foreground md:flex">
            <p className="px-5 pt-5 font-mono text-[11px] font-bold uppercase tracking-widest text-primary">{t("booking.map.capPanel.label")}</p>
            <div className="flex flex-1 flex-col pb-5 pt-2">
              {[
                { icon: Boxes, label: t("booking.map.capabilities.prototype") },
                { icon: Cpu, label: t("booking.map.capabilities.electronics") },
                { icon: GraduationCap, label: t("booking.map.capabilities.education") },
              ].map(({ icon: Icon, label }, index) => (
                <div key={label} className={`flex flex-1 items-center gap-3 px-5 py-3 ${index < 2 ? "border-b-2 border-foreground/15" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-card text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-black uppercase leading-tight tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <nav aria-label={t("booking.map.title")} className="grid grid-cols-4 gap-0 rounded-none border-2 border-foreground bg-card p-0 shadow-[4px_4px_0_var(--foreground)]">
        {sectionNav.map(({ id, label, icon: Icon, index }, i) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className={`flex min-h-14 items-center justify-center gap-2 px-2 font-mono text-xs font-black uppercase hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 sm:text-sm ${i < sectionNav.length - 1 ? "border-r-2 border-foreground" : ""}`}
          >
            <Icon className="hidden h-4 w-4 sm:block" />
            <span className="hidden md:inline">{label}</span>
            <span className="md:hidden">{index}</span>
          </button>
        ))}
      </nav>

      <section id="booking-map" className="scroll-mt-6 space-y-5">
        <div className="grid gap-4 border-b-2 border-foreground/20 pb-5 sm:grid-cols-[1fr_minmax(260px,0.65fr)] sm:items-end">
          <div><p className="font-mono text-xs font-black uppercase text-primary">{t("booking.map.eyebrow")} // 01</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.map.title")}</h2></div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:justify-self-end">{t("booking.map.hint")}</p>
        </div>
        {zonesLoading ? <div className="h-[420px] animate-pulse border-4 border-foreground bg-muted" /> : <LabMap zones={mapZones} language={i18n.language} onSelect={selectMapZone} />}
      </section>

      <section id="booking-book" className="scroll-mt-6 space-y-5">
        <div className="grid gap-4 border-b-2 border-foreground/20 pb-5 sm:grid-cols-[1fr_minmax(260px,0.65fr)] sm:items-end">
          <div><p className="font-mono text-xs font-black uppercase text-primary">{t("booking.book.eyebrow")} // 02</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.book.title")}</h2></div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:justify-self-end">{t("booking.book.hint")}</p>
        </div>
        {zonesLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">{[1, 2].map((i) => <div key={i} className="h-96 animate-pulse border-4 border-foreground bg-muted" />)}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="group flex flex-col overflow-hidden border-4 border-foreground bg-card shadow-[6px_6px_0_var(--primary)]">
              <div className="relative aspect-[16/9] w-full border-b-4 border-foreground bg-muted">
                {workshopZone?.image_url ? (
                  <img src={workshopZone.image_url} alt={workshopName} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none" />
                ) : (
                  <span className="flex h-full items-center justify-center"><Presentation className="h-12 w-12 text-muted-foreground" /></span>
                )}
                <span className="absolute left-3 top-3 border-2 border-foreground bg-primary px-2 py-1 font-mono text-xs font-black uppercase text-primary-foreground shadow-[2px_2px_0_var(--foreground)]">WS–01</span>
                <span className="absolute right-3 top-3 border-2 border-foreground bg-accent px-2 py-1 font-mono text-xs font-black uppercase text-accent-foreground shadow-[2px_2px_0_var(--foreground)]">{t("booking.book.workshopBadge")}</span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                <h3 className="text-2xl font-black uppercase leading-tight tracking-normal">{workshopName || t("booking.book.title")}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{workshopDescription || t("booking.book.workshopFallback")}</p>
                <Button type="button" onClick={() => workshopZone && setSelectedZone(workshopZone)} disabled={!workshopZone} className="mt-auto h-12 w-full justify-between rounded-none border-2 border-foreground font-black uppercase shadow-[3px_3px_0_var(--foreground)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--foreground)] motion-reduce:transform-none">
                  <span>{t("booking.book.workshopBtn")}</span><Presentation className="h-4 w-4" />
                </Button>
              </div>
            </article>
            <article className="group flex flex-col overflow-hidden border-4 border-foreground bg-card shadow-[6px_6px_0_var(--primary)]">
              <div className="relative aspect-[16/9] w-full border-b-4 border-foreground bg-muted">
                {printZone?.image_url ? (
                  <img src={printZone.image_url} alt={t("booking.book.printTitle")} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none" />
                ) : (
                  <span className="flex h-full items-center justify-center"><Boxes className="h-12 w-12 text-muted-foreground" /></span>
                )}
                <span className="absolute left-3 top-3 border-2 border-foreground bg-primary px-2 py-1 font-mono text-xs font-black uppercase text-primary-foreground shadow-[2px_2px_0_var(--foreground)]">ZN–03</span>
                <span className="absolute right-3 top-3 border-2 border-foreground bg-accent px-2 py-1 font-mono text-xs font-black uppercase text-accent-foreground shadow-[2px_2px_0_var(--foreground)]">{t("booking.book.printBadge")}</span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                <h3 className="text-2xl font-black uppercase leading-tight tracking-normal">{t("booking.book.printTitle")}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t("booking.book.printDesc")}</p>
                <ul className="flex flex-wrap gap-2">
                  {[t("booking.book.printFeature1"), t("booking.book.printFeature2"), t("booking.book.printFeature3")].map((feature) => (
                    <li key={feature} className="border-2 border-foreground bg-muted px-2 py-1 font-mono text-xs font-bold uppercase">{feature}</li>
                  ))}
                </ul>
                <Button type="button" onClick={() => window.location.assign("/print-3d")} className="mt-auto h-12 w-full justify-between rounded-none border-2 border-foreground font-black uppercase shadow-[3px_3px_0_var(--foreground)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--foreground)] motion-reduce:transform-none">
                  <span>{t("booking.book.printBtn")}</span><Boxes className="h-4 w-4" />
                </Button>
              </div>
            </article>
          </div>
        )}
      </section>

      <section id="booking-equipment" className="scroll-mt-6 space-y-5">
        <div className="border-b-4 border-foreground pb-5"><p className="text-xs font-black uppercase tracking-widest text-primary">{t("booking.map.catalogEyebrow")} // 02</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.map.catalogTitle")}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{t("booking.map.catalogText")}</p></div>
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

      <section id="booking-inventory" className="scroll-mt-6 space-y-5">
        <div className="border-b-4 border-foreground pb-5"><p className="text-xs font-black uppercase tracking-widest text-primary">{t("booking.map.inventoryEyebrow")} // 03</p><h2 className="mt-1 text-3xl font-black uppercase tracking-normal sm:text-4xl">{t("booking.map.inventoryTitle")}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{t("booking.map.inventoryText")}</p></div>
        <InventorySection userId={profile?.id ?? null} active />
      </section>
      <LabZoneDialog zone={selectedZone} userId={profile?.id ?? null} onClose={() => setSelectedZone(null)} />
      <EquipmentInfoDialog open={!!selectedEquipment} equipment={selectedEquipment} onClose={() => setSelectedEquipment(null)} />
    </main>
  );
}
