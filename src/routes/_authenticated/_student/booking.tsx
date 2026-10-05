import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Box, Map, Package, Plus, ScanLine, Wrench } from "lucide-react";
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

const SECTION_IDS = ["map", "equipment", "inventory"] as const;
type SectionId = (typeof SECTION_IDS)[number];

function scrollToSection(id: SectionId) {
  document.getElementById(`booking-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BookingPage() {
  const { t, i18n } = useTranslation();
  const [selectedZone, setSelectedZone] = useState<LabZone | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetails | null>(null);
