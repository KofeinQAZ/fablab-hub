import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { QrCode, Wrench } from "lucide-react";
import { z } from "zod";

type EquipmentCategory = "stationary" | "portable";
type EquipmentStatus = "active" | "maintenance";

export type EquipmentDetails = {
  id: string;
  name: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  image_url: string | null;
  description?: string | null;
  specs?: string | null;
};

const STATIONARY_SLOTS = [
  { value: "08:00", label: "08:00 - 10:00" },
  { value: "10:00", label: "10:00 - 12:00" },
  { value: "12:00", label: "12:00 - 14:00" },
  { value: "14:00", label: "14:00 - 16:00" },
  { value: "16:00", label: "16:00 - 18:00" },
] as const;

const MATERIALS = ["Свой материал", "Университетский ABS", "Университетский PLA"] as const;
const PORTABLE_DURATIONS = [
  { value: "1", label: "1 час" },
  { value: "2", label: "2 часа" },
  { value: "3", label: "3 часа" },
] as const;

const htmlTagPattern = /<[^>]*>/;

const bookingInsertSchema = z
  .object({
    user_id: z.string().uuid(),
    equipment_id: z.string().uuid(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    material_used: z
      .string()
      .max(120, "Материал слишком длинный")
      .refine((value) => !htmlTagPattern.test(value), "Материал содержит недопустимые символы")
      .nullable(),
    status: z.enum(["pending", "active", "cancelled", "completed"]),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.start_time).getTime();
    const end = new Date(value.end_time).getTime();
    const now = Date.now();
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    if (start < now - 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Время бронирования не может быть в прошлом",
        path: ["start_time"],
      });
    }
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Время окончания должно быть позже начала",
        path: ["end_time"],
      });
    }
  });

function statusBadge(status: EquipmentStatus) {
  if (status === "active") {
    return <Badge className="border-0 bg-green-100 text-green-700">Active</Badge>;
  }
  return <Badge className="border-0 bg-red-100 text-red-700">Maintenance</Badge>;
}

export function EquipmentDetailDialog({
  open,
  equipment,
  userId,
  safetyBriefingPassed,
  onClose,
  onSuccess,
}: {
  open: boolean;
  equipment: EquipmentDetails | null;
  userId: string;
  safetyBriefingPassed: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [slot, setSlot] = useState(STATIONARY_SLOTS[1].value);
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [duration, setDuration] = useState(PORTABLE_DURATIONS[1].value);

  const bookingPayload = useMemo(() => {
    if (!equipment) return null;
    const now = new Date();

    if (equipment.category === "stationary") {
      const [h, m] = slot.split(":").map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      return {
        user_id: userId,
        equipment_id: equipment.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        material_used: material,
        status: "active" as const,
      };
    }

    const hours = Number(duration);
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return {
      user_id: userId,
      equipment_id: equipment.id,
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      material_used: null,
      status: "pending" as const,
    };
  }, [duration, equipment, material, slot, userId]);

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!bookingPayload || !equipment) throw new Error("Equipment is not selected");
      const validatedPayload = bookingInsertSchema.parse(bookingPayload);
      const { error } = await supabase.from("bookings").insert(validatedPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        equipment?.category === "stationary"
          ? "Бронь успешно создана!"
          : "Запрос на выдачу отправлен!",
      );
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "Проверьте корректность данных");
        return;
      }
      toast.error(error.message);
    },
  });

  const isStationary = equipment?.category === "stationary";
  const isBlocked = !!equipment && (equipment.status === "maintenance" || (isStationary && !safetyBriefingPassed));

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{equipment?.name ?? "Оборудование"}</DialogTitle>
            {equipment ? statusBadge(equipment.status) : null}
          </div>
          <DialogDescription>
            {isStationary ? "Выберите слот и материал для брони." : "Оформите запрос на выдачу инвентаря."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {equipment?.image_url ? (
              <img src={equipment.image_url} alt={equipment.name} className="h-52 w-full object-cover" />
            ) : (
              <div className="flex h-52 w-full items-center justify-center">
                {isStationary ? <Wrench className="h-12 w-12 text-slate-400" /> : <QrCode className="h-12 w-12 text-slate-400" />}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Описание</p>
            <p className="mt-1 text-sm text-slate-600">{equipment?.description || "Описание пока не добавлено."}</p>
            <p className="mt-4 text-sm font-medium text-slate-900">Технические параметры</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
              {equipment?.specs || "Параметры пока не добавлены."}
            </p>
          </div>

          {isStationary ? (
            <>
              <div className="space-y-2">
                <Label>Время (2-часовые слоты)</Label>
                <Select value={slot} onValueChange={setSlot}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATIONARY_SLOTS.map((slotItem) => (
                      <SelectItem key={slotItem.value} value={slotItem.value}>
                        {slotItem.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Материал</Label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!safetyBriefingPassed && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Нужен инструктаж
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label>Длительность</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTABLE_DURATIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="h-12 rounded-2xl">
            Закрыть
          </Button>
          <Button
            onClick={() => createBooking.mutate()}
            disabled={createBooking.isPending || !equipment || isBlocked}
            className="h-12 rounded-2xl bg-blue-700 text-white hover:bg-blue-800"
          >
            {createBooking.isPending
              ? "Отправка..."
              : isStationary
                ? safetyBriefingPassed
                  ? "Забронировать"
                  : "Нужен инструктаж"
                : "Запросить выдачу (Check-out)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
