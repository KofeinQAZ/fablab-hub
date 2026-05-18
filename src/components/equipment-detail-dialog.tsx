import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Wrench, X } from "lucide-react";
import { z } from "zod";
import { getEquipmentImageUrl } from "@/lib/equipment-images";

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

const DATE_BUTTON_DAYS = 7;
const START_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const DURATION_HOURS = [1, 2, 3] as const;

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
  userId: string | null;
  safetyBriefingPassed: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [startHour, setStartHour] = useState<number>(10);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const dayOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric" });
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Array.from({ length: DATE_BUTTON_DAYS }, (_, offset) => {
      const date = new Date(now);
      date.setDate(now.getDate() + offset);
      return {
        date,
        label: formatter.format(date).replace(".", ""),
      };
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedDayIndex(0);
    setStartHour(10);
    setDurationHours(equipment?.category === "portable" ? 1 : 2);
  }, [open, equipment?.id, equipment?.category]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [equipment?.id, equipment?.image_url, open]);

  const bookingPayload = useMemo(() => {
    if (!equipment) return null;
    const selectedDate = dayOptions[selectedDayIndex]?.date ?? dayOptions[0]?.date;
    if (!selectedDate) return null;
    const start = new Date(selectedDate);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    return {
      user_id: userId,
      equipment_id: equipment.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      material_used: null,
      status: equipment.category === "portable" ? ("pending" as const) : ("active" as const),
    };
  }, [dayOptions, durationHours, equipment, selectedDayIndex, startHour, userId]);

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!bookingPayload || !equipment) throw new Error("Equipment is not selected");
      if (!userId) throw new Error("AUTH_REQUIRED");
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
      if (error.message === "AUTH_REQUIRED") {
        const returnTo = typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : "/booking";
        navigate({ to: "/login", search: { returnTo } as never });
        return;
      }
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "Проверьте корректность данных");
        return;
      }
      toast.error(error.message);
    },
  });

  const isStationary = equipment?.category === "stationary";
  const isBlocked = !!equipment && (equipment.status === "maintenance" || (isStationary && !safetyBriefingPassed));
  const isGuest = !userId;
  const imageSrc = equipment ? getEquipmentImageUrl(equipment.name, equipment.image_url) : null;
  const nowTimestamp = Date.now();

  const isPastStartHour = (date: Date, hour: number) => {
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate.getTime() < nowTimestamp - 60_000;
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 mx-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 sm:left-1/2 sm:top-1/2 sm:mx-4 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-slate-200 [&>button]:hidden">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{equipment?.name ?? "Оборудование"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition-all hover:bg-slate-200 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-6">
          <DialogHeader className="mb-4 border-b border-slate-100 pb-4 sm:border-none sm:pb-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>{equipment?.name ?? "Оборудование"}</DialogTitle>
              {equipment ? statusBadge(equipment.status) : null}
            </div>
            <DialogDescription>
              {isStationary
                ? "Выберите дату, время старта и длительность брони."
                : "Выберите дату, время старта и длительность запроса на выдачу."}
            </DialogDescription>
          </DialogHeader>

          <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden bg-slate-100 shrink-0 mb-4">
            {!imageSrc || imageLoadFailed ? (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                {isStationary ? <Wrench className="h-12 w-12" /> : <QrCode className="h-12 w-12" />}
              </div>
            ) : (
              <img
                src={imageSrc}
                alt={equipment?.name ?? "Equipment image"}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setImageLoadFailed(true)}
              />
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

          <div className="mt-4 space-y-2">
            <Label>Дата</Label>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day, index) => {
                const selected = selectedDayIndex === index;
                return (
                  <Button
                    key={day.date.toISOString()}
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedDayIndex(index)}
                    className={`min-h-[44px] rounded-2xl border px-4 py-3 text-sm ${
                      selected
                        ? "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    {day.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Время начала</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {START_HOURS.map((hour) => {
                const selected = startHour === hour;
                const selectedDate = dayOptions[selectedDayIndex]?.date;
                const disabled = !selectedDate || isPastStartHour(selectedDate, hour);
                return (
                  <Button
                    key={hour}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setStartHour(hour)}
                    className={`min-h-[44px] rounded-2xl border px-4 py-3 ${
                      selected
                        ? "border-blue-700 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {`${hour.toString().padStart(2, "0")}:00`}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Длительность</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_HOURS.map((hours) => {
                const selected = durationHours === hours;
                return (
                  <Button
                    key={hours}
                    type="button"
                    variant="outline"
                    onClick={() => setDurationHours(hours)}
                    className={`min-h-[44px] rounded-full px-4 py-3 ${
                      selected
                        ? "border-lime-400 bg-lime-100 text-lime-700 hover:bg-lime-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-lime-300 hover:text-lime-700"
                    }`}
                  >
                    {hours} {hours === 1 ? "час" : hours < 5 ? "часа" : "часов"}
                  </Button>
                );
              })}
            </div>
          </div>

          {!safetyBriefingPassed && isStationary && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Нужен инструктаж
            </p>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white p-4 sm:static sm:mt-6 sm:border-none sm:bg-transparent sm:p-0">
          <div className="mx-auto w-full sm:mx-0">
            <Button
              onClick={() => createBooking.mutate()}
              disabled={createBooking.isPending || !equipment || (isBlocked && !isGuest)}
              className="h-14 w-full rounded-2xl bg-blue-700 text-lg text-white hover:bg-blue-800"
            >
              {isGuest
                ? "Войдите, чтобы забронировать"
                : createBooking.isPending
                ? "Отправка..."
                : isStationary
                  ? safetyBriefingPassed
                    ? "Подтвердить"
                    : "Нужен инструктаж"
                  : "Подтвердить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
