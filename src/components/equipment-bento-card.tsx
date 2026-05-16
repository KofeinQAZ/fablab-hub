import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { EquipmentDetails } from "@/components/equipment-detail-dialog";
import { getEquipmentImageUrl } from "@/lib/equipment-images";

export function EquipmentBentoCard({
  equipment,
  onOpen,
}: {
  equipment: EquipmentDetails;
  onOpen: () => void;
}) {
  const isMaintenance = equipment.status === "maintenance";
  const imageSrc = getEquipmentImageUrl(equipment.name, equipment.image_url);

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="aspect-video bg-slate-100">
        <img
          src={imageSrc ?? ""}
          alt={equipment.name}
          className="h-full w-full rounded-t-3xl object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <CardHeader className="p-6 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-slate-900">{equipment.name}</CardTitle>
          {isMaintenance ? (
            <Badge className="rounded-xl border border-red-100 bg-red-50 text-[11px] font-medium text-red-700">Maintenance</Badge>
          ) : (
            <Badge className="rounded-xl border border-lime-300 bg-lime-100 text-[11px] font-semibold text-lime-700">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-2 text-xs text-slate-500">
        {equipment.description?.slice(0, 80) || "Откройте карточку для просмотра деталей и параметров."}
      </CardContent>
      <CardFooter className="p-6 pt-3">
        <Button onClick={onOpen} className="h-11 w-full rounded-2xl bg-[#005BAB] text-sm font-semibold text-white hover:bg-blue-800">
          Подробнее
        </Button>
      </CardFooter>
    </Card>
  );
}
