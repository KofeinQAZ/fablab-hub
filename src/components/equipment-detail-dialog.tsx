import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { QrCode, Wrench, X, Clock } from "lucide-react";
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

  // Генерируем опции дней
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

  // 1. Загружаем текущие брони станка
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", equipment?.id],
    queryFn: async () => {
      if (!equipment?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("equipment_id", equipment.id)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!equipment?.id,
  });

  // 2. Загружаем график работы менторов
  const { data: mentorSchedules } = useQuery({
    queryKey: ["mentor-schedules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("mentor_schedule").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Вычисляем доступные часы на основе расписания менторов
  const availableHours = useMemo(() => {
    const currentDate = dayOptions[selectedDayIndex]?.date;
    if (!currentDate || !mentorSchedules) return [];

    const jsDay = currentDate.getDay();
    const dbDay = jsDay === 0 ? 7 : jsDay;

    const daySchedules = mentorSchedules.filter((s: any) => s.day_of_week === dbDay);
    const hours = new Set<number>();
    
    daySchedules.forEach((s: any) => {
      const start = parseInt(s.start_time.split(':')[0], 10);
      const end = parseInt(s.end_time.split(':')[0], 10);
      for (let h = start; h < end; h++) {
        hours.add(h);
      }
    });
    
    return Array.from(hours).sort((a, b) => a - b);
  }, [dayOptions, selectedDayIndex, mentorSchedules]);

  useEffect(() => {
    if (!open) return;
    setSelectedDayIndex(0);
    setImageLoadFailed(false);
  }, [open, equipment?.id]);

  // Авто-выбор первого доступного часа при смене дня
  useEffect(() => {
    if (availableHours.length > 0) {
      setStartHour(availableHours[0]);
    }
  }, [availableHours]);

  const bookingPayload = useMemo(() => {
    if (!equipment) return null;
    const selectedDate = dayOptions[selectedDayIndex]?.date;
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
      if (!bookingPayload) throw new Error('Данные не готовы');
      const { error } = await (supabase as any).from('bookings').insert(bookingPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(equipment?.category === "stationary" ? "Бронь создана!" : "Запрос отправлен!");
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
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

  const isSlotBooked = (hour: number): boolean => {
    const selectedDate = dayOptions[selectedDayIndex]?.date;
    if (!selectedDate) return false;
    const potentialStart = new Date(selectedDate);
    potentialStart.setHours(hour, 0, 0, 0);
    const potentialEnd = new Date(potentialStart.getTime() + durationHours * 60 * 60 * 1000);

    return bookings.some((booking: any) => {
      const existingStart = new Date(booking.start_time);
      const existingEnd = new Date(booking.end_time);
      return existingStart < potentialEnd && existingEnd > potentialStart;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 mx-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 sm:left-1/2 sm:top-1/2 sm:mx-4 sm:h-auto sm:max-h-[95vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-slate-200 [&>button]:hidden">
        
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{equipment?.name}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">{equipment?.name}</DialogTitle>
              {equipment && statusBadge(equipment.status)}
            </div>
          </DialogHeader>

          {/* Image */}
          <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden bg-slate-100 mb-6">
            {!imageSrc || imageLoadFailed ? (
              <div className="flex h-full items-center justify-center text-slate-300">
                {isStationary ? <Wrench className="h-16 w-16" /> : <QrCode className="h-16 w-16" />}
              </div>
            ) : (
              <img src={imageSrc} className="w-full h-full object-cover" onError={() => setImageLoadFailed(true)} />
            )}
          </div>

          <div className="grid gap-6">
            {/* Days Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Дата бронирования</Label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((day, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => setSelectedDayIndex(index)}
                    className={`h-11 rounded-xl px-4 ${selectedDayIndex === index ? "bg-blue-600 text-white border-blue-600 shadow-md" : "border-slate-200"}`}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dynamic Hours Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Доступное время (по графику менторов)</Label>
              <TooltipProvider>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {availableHours.length === 0 ? (
                    <div className="col-span-full py-8 px-4 bg-amber-50 border border-dashed border-amber-200 rounded-2xl text-center">
                      <Clock className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-amber-800 font-medium">Лаборатория закрыта</p>
                      <p className="text-xs text-amber-600">В этот день дежурных менторов нет</p>
                    </div>
                  ) : (
                    availableHours.map((hour) => {
                      const isBooked = isSlotBooked(hour);
                      const isPast = isPastStartHour(dayOptions[selectedDayIndex].date, hour);
                      const disabled = isBooked || isPast;
                      const selected = startHour === hour;

                      const btn = (
                        <Button
                          key={hour}
                          disabled={disabled}
                          onClick={() => setStartHour(hour)}
                          variant="outline"
                          className={`h-11 rounded-xl border transition-all ${
                            disabled && isBooked ? "opacity-40 bg-slate-100 line-through" :
                            selected ? "border-blue-700 bg-blue-50 text-blue-700 font-bold" : "border-slate-200"
                          }`}
                        >
                          {hour}:00
                        </Button>
                      );

                      return isBooked ? (
                        <Tooltip key={hour}>
                          <TooltipTrigger asChild><div>{btn}</div></TooltipTrigger>
                          <TooltipContent className="bg-slate-900 text-white text-xs">Уже забронировано</TooltipContent>
                        </Tooltip>
                      ) : btn;
                    })
                  )}
                </div>
              </TooltipProvider>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Длительность</Label>
              <div className="flex gap-2">
                {DURATION_HOURS.map((h) => (
                  <Button
                    key={h}
                    variant="outline"
                    onClick={() => setDurationHours(h)}
                    className={`h-11 flex-1 rounded-xl ${durationHours === h ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-200"}`}
                  >
                    {h} ч.
                  </Button>
                ))}
              </div>
            </div>

            {!safetyBriefingPassed && isStationary && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-medium">
                ⚠️ Вам необходимо пройти инструктаж (ТБ) для этого станка.
              </div>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-100 bg-white sm:bg-transparent sm:border-0">
          <Button
            onClick={() => createBooking.mutate()}
            disabled={createBooking.isPending || (isBlocked && !isGuest) || availableHours.length === 0}
            className="h-14 w-full rounded-2xl bg-blue-700 text-lg font-bold text-white hover:bg-blue-800 shadow-xl shadow-blue-100"
          >
            {isGuest ? "Войдите для бронирования" : createBooking.isPending ? "Обработка..." : "Забронировать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}