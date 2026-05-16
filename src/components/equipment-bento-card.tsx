import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Wrench } from "lucide-react";
import type { EquipmentDetails } from "@/components/equipment-detail-dialog";

export function EquipmentBentoCard({
  equipment,
  onOpen,
}: {
  equipment: EquipmentDetails;
  onOpen: () => void;
}) {
  const isMaintenance = equipment.status === "maintenance";

  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="aspect-video bg-slate-100">
        {equipment.image_url ? (
          <img src={equipment.image_url} alt={equipment.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {equipment.category === "stationary" ? (
              <Wrench className="h-12 w-12 text-slate-400" />
            ) : (
              <QrCode className="h-12 w-12 text-slate-400" />
            )}
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base text-slate-900">{equipment.name}</CardTitle>
          {isMaintenance ? (
            <Badge className="border-0 bg-red-100 text-red-700">Maintenance</Badge>
          ) : (
            <Badge className="border-0 bg-green-100 text-green-700">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-xs text-slate-500">
        {equipment.description?.slice(0, 80) || "Откройте карточку для просмотра деталей и параметров."}
      </CardContent>
      <CardFooter>
        <Button onClick={onOpen} className="h-12 w-full rounded-2xl bg-blue-700 text-white hover:bg-blue-800">
          Подробнее
        </Button>
      </CardFooter>
    </Card>
  );
}
