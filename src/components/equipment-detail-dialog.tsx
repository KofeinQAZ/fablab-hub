import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X, Clock, Info } from "lucide-react";
import { createBookingSchema } from "@/lib/booking-schemas";

export function EquipmentDetailDialog({ open, equipment, userId, onClose, onSuccess }: any) {
  const qc = useQueryClient();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [startHour, setStartHour] = useState<number>(10);
  const [durationHours, setDurationHours] = useState<number>(1);

  const isMentorRequired = equipment?.access_type === 'mentor_required';

  // 1. Генерируем 7 ближайших дней
  const dayOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return { date: d, label: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" }) };
    });
  }, []);

  const selectedDate = dayOptions[selectedDayIndex].date;

  // 2. Получаем ISO день недели (1 = Пн, ..., 7 = Вс) для сравнения с БД
  const getIsoDay = (date: Date) => {
    const day = date.getDay();
    return day === 0 ? 7 : day; 
  };

  // 3. Загружаем активные бронирования
  const { data: bookings = [] } = useQuery({
    queryKey: ["final-booking-check", equipment?.id],
    queryFn: async () => {
      if (!equipment?.id) return [];
      const { data } = await supabase
        .from("bookings")
        .select("start_time, end_time")
        .eq("equipment_id", equipment.id)
        .in("status", ["active", "pending"]);
      return data || [];
    },
    enabled: !!equipment?.id && open,
  });

  // 4. Загружаем расписание менторов (ТОЛЬКО если станок опасный)
  const { data: mentorSchedules = [] } = useQuery({
    queryKey: ["mentor-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_schedule").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!open && isMentorRequired,
  });

  // 5. УМНАЯ ПРОВЕРКА ДОСТУПНОСТИ СЛОТА
  const getSlotStatus = (hour: number) => {
    const pStart = new Date(selectedDate.getTime());
    pStart.setHours(hour, 0, 0, 0);
    const pEnd = new Date(pStart.getTime() + durationHours * 3600000);

    // А) Проверка на занятость другими студентами
    const isBusy = bookings.some((b: any) => {
      const bS = new Date(b.start_time).getTime();
      const bE = new Date(b.end_time).getTime();
      return pStart.getTime() < bE && pEnd.getTime() > bS;
    });

    if (isBusy) return { disabled: true, reason: 'busy' };

    // Б) Проверка на наличие ментора (если нужно)
    if (isMentorRequired) {
      const isoDay = getIsoDay(selectedDate);
      const scheduleForDay = mentorSchedules.filter(s => s.day_of_week === isoDay);

      if (scheduleForDay.length === 0) return { disabled: true, reason: 'no_mentor' };

      // Проверяем, влезает ли выбранное время ПОЛНОСТЬЮ в смену ментора
      const fitsInShift = scheduleForDay.some(shift => {
        const shiftStart = parseInt(shift.start_time.split(":")[0]);
        const shiftEnd = parseInt(shift.end_time.split(":")[0]);
        return hour >= shiftStart && (hour + durationHours) <= shiftEnd;
      });

      if (!fitsInShift) return { disabled: true, reason: 'no_mentor' };
    }

    return { disabled: false, reason: null };
  };

  // Мутация создания брони
  const createBooking = useMutation({
    mutationFn: async () => {
      const start = new Date(selectedDate.getTime());
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(start.getTime() + durationHours * 3600000);

      // SECURITY: Validate booking times against schema before submission
      const validationResult = createBookingSchema.safeParse({
        startTime: start,
        endTime: end,
        durationHours,
        materialUsed: "",
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        throw new Error(firstError?.message || "Booking validation failed");
      }

      const { data, error } = await supabase.from("bookings").insert({
        user_id: userId,
        equipment_id: equipment.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: isMentorRequired ? "pending" : "active", 
      }).select();

      if (error) throw new Error("Это время уже занято! Обновите страницу.");
      
      // SECURITY: Check for silent RLS denial (empty result with 200 OK)
      if (!data || data.length === 0) {
        throw new Error("У вас нет прав для выполнения этого действия");
      }
    },
    onSuccess: () => {
      toast.success(isMentorRequired ? "Заявка отправлена ментору!" : "Бронь успешно создана!");
      qc.invalidateQueries({ queryKey: ["final-booking-check"] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const displayEndTime = startHour + durationHours;
  const currentSlotStatus = getSlotStatus(startHour);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* МАГИЯ ТУТ: [&>button]:hidden полностью вырезает системный дефолтный крестик от shadcn.
        Плюс накинул наш брутальный дизайн.
      */}
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[90vh] outline-none z-50 [&>button]:hidden">
        
        {/* ШАПКА В БРУТАЛЬНОМ СТИЛЕ */}
        <div className={`p-6 border-b-4 border-slate-900 text-slate-900 relative flex justify-between items-start ${isMentorRequired ? 'bg-amber-400' : 'bg-emerald-400'}`}>
          <div>
            <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-tight pr-8">{equipment?.name}</DialogTitle>
            <p className="font-bold uppercase tracking-widest text-[10px] mt-2">
              Бронь на {dayOptions[selectedDayIndex].label} 
              {isMentorRequired && " (ТРЕБУЕТСЯ МЕНТОР)"}
            </p>
          </div>
          
          {/* НАШ КАСТОМНЫЙ КРЕСТИК */}
          <button onClick={onClose} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a] shrink-0">
            <X className="h-5 w-5"/>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-50">
          
          {/* ПРЕДУПРЕЖДЕНИЕ О МЕНТОРЕ */}
          {isMentorRequired && (
            <div className="bg-amber-100 border-2 border-amber-400 p-4 flex gap-3 items-start text-amber-900">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest leading-relaxed">
                Станок повышенной опасности. Доступны только часы работы дежурного ментора. Заявка отправляется на ручное подтверждение.
              </p>
            </div>
          )}

          {/* 1. ДАТА */}
          <div className="space-y-3">
            <Label className="text-slate-900 font-black text-sm uppercase tracking-widest block border-b-2 border-slate-200 pb-2">1. Выбор даты</Label>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((d, i) => (
                <button key={i} onClick={() => setSelectedDayIndex(i)}
                  className={`h-10 px-4 font-black text-xs uppercase tracking-widest border-2 transition-all ${
                    selectedDayIndex === i 
                      ? (isMentorRequired ? "bg-amber-400 text-slate-900 border-slate-900 shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]" : "bg-blue-600 text-white border-slate-900 shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]") 
                      : "bg-white text-slate-600 border-slate-300 hover:border-slate-900 hover:text-slate-900"
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. ДЛИТЕЛЬНОСТЬ */}
          <div className="space-y-3">
            <Label className="text-slate-900 font-black text-sm uppercase tracking-widest block border-b-2 border-slate-200 pb-2">2. Время работы</Label>
            <div className="flex gap-2">
              {[1, 2, 3].map((h) => (
                <button key={h} onClick={() => setDurationHours(h)}
                  className={`h-12 flex-1 max-w-[120px] font-black text-base border-2 transition-all ${
                    durationHours === h 
                      ? "bg-emerald-400 border-slate-900 text-slate-900 shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]" 
                      : "bg-white border-slate-300 text-slate-400 hover:border-slate-900 hover:text-slate-900"
                  }`}>
                  {h} ЧАС(ОВ)
                </button>
              ))}
            </div>
          </div>

          {/* 3. СЛОТЫ ВРЕМЕНИ */}
          <div className="space-y-3">
            <Label className="text-slate-900 font-black text-sm uppercase tracking-widest block border-b-2 border-slate-200 pb-2">3. Слот начала</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => {
                const { disabled, reason } = getSlotStatus(h);
                const isActive = startHour === h;
                
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isToday = selectedDate.getTime() === today.getTime();
                const currentHour = now.getHours();
                const isPastHour = isToday && h <= currentHour;
                
                const isFinallyDisabled = disabled || isPastHour;
                const finalReason = isPastHour ? 'past_hour' : reason;
                
                return (
                  <button key={h} disabled={isFinallyDisabled} onClick={() => !isFinallyDisabled && setStartHour(h)}
                    className={`h-14 font-black text-sm transition-all border-2 flex flex-col items-center justify-center relative ${
                      finalReason === 'busy' 
                        ? "bg-rose-100 border-rose-300 text-rose-500 cursor-not-allowed" 
                        : finalReason === 'no_mentor'
                        ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
                        : finalReason === 'past_hour'
                        ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
                        : isActive 
                          ? (isMentorRequired ? "bg-amber-400 border-slate-900 text-slate-900 shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]" : "bg-blue-600 border-slate-900 text-white shadow-[2px_2px_0_#0f172a] translate-y-[1px] translate-x-[1px]")
                          : "bg-white border-slate-900 text-slate-900 hover:bg-slate-100 shadow-[2px_2px_0_#0f172a] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none"
                    }`}>
                    {h}:00
                    {finalReason === 'busy' && <span className="text-[9px] font-black uppercase text-rose-600">ЗАНЯТО</span>}
                    {finalReason === 'no_mentor' && <span className="text-[9px] font-black uppercase">НЕТ МЕНТОРА</span>}
                    {finalReason === 'past_hour' && <span className="text-[9px] font-black uppercase">ПРОШЛО</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ИТОГ И КНОПКА */}
          <div className="pt-4 mt-6">
            <div className="p-4 bg-white border-4 border-slate-900 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 mb-4 shadow-[6px_6px_0_#0f172a]">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-slate-900" />
                <span className="font-black uppercase tracking-widest text-slate-900 text-sm">Итоговый слот:</span>
              </div>
              <span className="text-xl font-black text-slate-900">
                {startHour}:00 — {displayEndTime}:00
              </span>
            </div>

            <Button 
              onClick={() => createBooking.mutate()} 
              disabled={createBooking.isPending || currentSlotStatus.disabled} 
              className={`w-full h-16 rounded-none text-sm font-black uppercase tracking-widest border-4 border-slate-900 text-white transition-all flex items-center justify-center shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none ${
                isMentorRequired ? "bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:border-slate-400 disabled:shadow-none" : "bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:border-slate-400 disabled:shadow-none"
              }`}
            >
              {createBooking.isPending ? "ЗАГРУЗКА..." : (isMentorRequired ? "ОТПРАВИТЬ ЗАЯВКУ" : "ПОДТВЕРДИТЬ БРОНЬ")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}