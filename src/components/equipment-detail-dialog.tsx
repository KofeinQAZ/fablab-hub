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
      <DialogContent className="max-w-2xl rounded-[40px] p-0 overflow-hidden border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
        
        {/* ШАПКА */}
        <div className={`p-6 sm:p-8 text-white relative text-center sm:text-left ${isMentorRequired ? 'bg-amber-600' : 'bg-[#005BAB]'}`}>
          <DialogTitle className="text-2xl sm:text-3xl font-black">{equipment?.name}</DialogTitle>
          <p className="opacity-90 font-medium text-xs sm:text-sm mt-1">
            Бронирование на {dayOptions[selectedDayIndex].label} 
            {isMentorRequired && " (Требуется ментор)"}
          </p>
          <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition"><X className="h-5 w-5"/></button>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          
          {/* ПРЕДУПРЕЖДЕНИЕ О МЕНТОРЕ */}
          {isMentorRequired && (
            <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 rounded-2xl flex gap-3 items-start text-amber-800">
              <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs sm:text-sm font-medium">
                Этот станок повышенной опасности. Доступны только часы работы дежурного ментора. 
                Заявка будет отправлена на ручное подтверждение.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1 block text-center sm:text-left">1. Дата</Label>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {dayOptions.map((d, i) => (
                <button key={i} onClick={() => setSelectedDayIndex(i)}
                  className={`h-11 sm:h-12 px-4 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                    selectedDayIndex === i 
                      ? (isMentorRequired ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-blue-600 text-white shadow-lg shadow-blue-200") 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1 block text-center sm:text-left">2. Длительность</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3].map((h) => (
                <button key={h} onClick={() => setDurationHours(h)}
                  className={`h-12 sm:h-14 flex-1 max-w-[120px] rounded-2xl font-black text-lg border-2 transition-all ${
                    durationHours === h 
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}>
                  {h} ч.
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-400 font-bold text-[10px] uppercase tracking-widest ml-1 block text-center sm:text-left">3. Время начала</Label>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
              {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => {
                const { disabled, reason } = getSlotStatus(h);
                const isActive = startHour === h;
                
                return (
                  <button key={h} disabled={disabled} onClick={() => setStartHour(h)}
                    className={`h-12 sm:h-14 rounded-2xl font-bold text-sm transition-all border-2 flex flex-col items-center justify-center relative ${
                      reason === 'busy' 
                        ? "bg-red-500 border-red-500 text-white opacity-90 cursor-not-allowed" 
                        : reason === 'no_mentor'
                        ? "bg-slate-50 border-slate-100 text-slate-300 opacity-60 cursor-not-allowed"
                        : isActive 
                          ? (isMentorRequired ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-blue-50 border-blue-600 text-blue-700")
                          : "bg-white border-slate-100 text-slate-700 hover:border-blue-300"
                    }`}>
                    {h}:00
                    {reason === 'busy' && <span className="text-[8px] font-black uppercase">Занято</span>}
                    {reason === 'no_mentor' && <span className="text-[8px] font-bold uppercase">Нет ментора</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3">
            <div className="flex items-center gap-3">
              <Clock className={`h-5 w-5 ${isMentorRequired ? 'text-amber-600' : 'text-blue-600'}`} />
              <span className="font-bold text-slate-700 text-sm sm:text-base">Итоговое время:</span>
            </div>
            <span className={`text-xl font-black ${isMentorRequired ? 'text-amber-700' : 'text-blue-700'}`}>
              {startHour}:00 — {displayEndTime}:00
            </span>
          </div>

          <Button 
            onClick={() => createBooking.mutate()} 
            disabled={createBooking.isPending || currentSlotStatus.disabled} 
            className={`w-full h-14 sm:h-16 rounded-[28px] text-lg sm:text-xl font-black text-white shadow-xl transition-all flex items-center justify-center ${
              isMentorRequired ? "bg-amber-600 hover:bg-amber-700" : "bg-[#005BAB] hover:bg-blue-800"
            }`}
          >
            {createBooking.isPending ? "Минутку..." : (isMentorRequired ? "ОТПРАВИТЬ ЗАЯВКУ" : "ПОДТВЕРДИТЬ БРОНЬ")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}