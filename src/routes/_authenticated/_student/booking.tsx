import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentDetailDialog, EquipmentDetails } from "@/components/equipment-detail-dialog";
import { Lock, AlertCircle, Laptop, Printer, HardHat, Crown, CheckCircle2, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_student/booking")({
  component: BookingPage,
});

function BookingPage() {
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetails | null>(null);
  const [category, setCategory] = useState<"stationary" | "portable">("stationary");

  // Загружаем профиль юзера для ТБ И РОЛИ
  const { data: profile } = useQuery({
    queryKey: ["user-profile-briefing"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("id, safety_briefing_passed, role").eq("id", user?.id).single();
      return data;
    },
  });

  // Загружаем оборудование
  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment-gallery", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("category", category);
      if (error) throw error;
      return data as EquipmentDetails[];
    },
  });

  // МАГИЯ QR-КОДА: Автоматическое открытие при сканировании
  useEffect(() => {
    if (equipment.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const qrEquipmentId = urlParams.get("equipmentId");
      
      if (qrEquipmentId) {
        const foundItem = equipment.find((item: any) => item.id === qrEquipmentId);
        if (foundItem) {
          setSelectedEquipment(foundItem);
          // Чистим URL, чтобы при закрытии модалки она не открывалась снова
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [equipment]);

  // Функция проверки доступа
  const checkAccess = (accessType: string) => {
    if (!profile) return { hasAccess: false, reason: "Необходима авторизация" };
    if (profile.role === 'admin') return { hasAccess: true };

    switch (accessType) {
      case 'basic': 
        return { hasAccess: true };
      case 'independent': 
      case 'mentor_required': 
        return profile.safety_briefing_passed 
          ? { hasAccess: true } 
          : { hasAccess: false, reason: "ТРЕБУЕТСЯ СДАЧА ТБ" };
      case 'resident_only': 
        return profile.role === 'resident' 
          ? { hasAccess: true } 
          : { hasAccess: false, reason: "ТОЛЬКО ДЛЯ РЕЗИДЕНТОВ" };
      default: 
        return { hasAccess: true };
    }
  };

  const renderAccessMarker = (accessType: string) => {
    const baseStyle = "font-black uppercase tracking-widest text-[10px] border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] px-2 py-1 flex items-center gap-1 w-fit";
    switch (accessType) {
      case 'basic': return <span className={`bg-emerald-400 text-slate-900 ${baseStyle}`}><Laptop className="w-3 h-3"/> Общий доступ</span>;
      case 'independent': return <span className={`bg-blue-400 text-white ${baseStyle}`}><Printer className="w-3 h-3"/> Нужен ТБ</span>;
      case 'mentor_required': return <span className={`bg-amber-400 text-slate-900 ${baseStyle}`}><HardHat className="w-3 h-3"/> Работать с ментором</span>;
      case 'resident_only': return <span className={`bg-purple-500 text-white ${baseStyle}`}><Crown className="w-3 h-3"/> Резиденты лабы</span>;
      default: return <span className={`bg-slate-200 text-slate-800 ${baseStyle}`}>Неизвестно</span>;
    }
  };

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24 w-full overflow-hidden">
      
      {/* ЗАГОЛОВОК СТРАНИЦЫ */}
      <div className="border-b-2 border-slate-100 pb-6">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">Бронирование</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm mt-2">Резервирование мощностей и инвентаря FabLab</p>
      </div>

      {/* МЯГКАЯ ШПАРГАЛКА ПО ДАШБОРДУ ДОСТУПА */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-200 bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center bg-white">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ваш статус инструктажа</span>
          <div className="flex items-center gap-2">
            {profile?.safety_briefing_passed ? (
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold uppercase tracking-widest text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit">
                <CheckCircle2 className="w-4 h-4" /> ТБ ПРОЙДЕН
              </span>
            ) : (
              <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold uppercase tracking-widest text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit">
                <ShieldAlert className="w-4 h-4" /> ИНСТРУКТАЖ НЕ СДАН
              </span>
            )}
          </div>
        </div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center bg-white">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Уровень роли аккаунта</span>
          <div className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
            {profile?.role === 'admin' ? '⚡ АДМИНИСТРАТОР' : profile?.role === 'resident' ? '👑 РЕЗИДЕНТ ЛАБЫ' : '👤 СТУДЕНТ КАМПУСА'}
          </div>
        </div>
        <div className="p-5 bg-blue-50/50 text-blue-800 text-xs font-medium flex items-center leading-relaxed">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0 text-blue-500" />
          Внимание: Бронирование сложного оборудования (с пометкой ТБ/Ментор) станет доступно сразу после подтверждения вашей заявки администратором.
        </div>
      </div>

      {/* ШИРОКИЕ ТАБЫ (Идеально для мобилки) */}
      <Tabs defaultValue="stationary" onValueChange={(v) => setCategory(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 h-auto w-full bg-slate-100 p-1.5 rounded-2xl gap-2">
          <TabsTrigger 
            value="stationary" 
            className="h-12 md:h-14 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
          >
            <Wrench className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Станки
          </TabsTrigger>
          <TabsTrigger 
            value="portable" 
            className="h-12 md:h-14 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all"
          >
            <Laptop className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Инвентарь
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ГАЛЕРЕЯ КАРТОЧЕК (Остались брутальными) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-96 border-4 border-slate-900 bg-slate-200 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {equipment.map((item: any) => {
            const accessType = item.access_type || 'basic';
            const { hasAccess, reason } = checkAccess(accessType);

            return (
              <Card key={item.id} className="border-4 border-slate-900 rounded-none bg-white shadow-[6px_6px_0_#0f172a] hover:shadow-[12px_12px_0_#005BAB] hover:-translate-y-2 hover:-translate-x-2 transition-all duration-300 flex flex-col overflow-hidden group">
                
                {/* ОБЛОЖКА */}
                <div className="h-48 bg-slate-900 border-b-4 border-slate-900 relative overflow-hidden shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-100 font-black text-xs uppercase tracking-widest">ФОТО ОТСУТСТВУЕТ</div>
                  )}
                  
                  {/* Статус станка */}
                  <div className="absolute top-4 right-4">
                    <span className={`font-black uppercase tracking-widest text-[9px] border-2 border-slate-900 px-2 py-1 shadow-[2px_2px_0_#0f172a] ${
                      item.status === 'active' ? 'bg-emerald-400 text-slate-900' : 'bg-rose-500 text-white'
                    }`}>
                      {item.status === 'active' ? 'В СТРОЮ' : 'РЕМОНТ'}
                    </span>
                  </div>
                </div>

                {/* КОНТЕНТ КАРТОЧКИ */}
                <CardContent className="p-6 flex flex-col flex-1 justify-between gap-6">
                  <div className="space-y-4">
                    <h3 className="font-black text-xl md:text-2xl text-slate-900 uppercase tracking-tight leading-tight line-clamp-2">{item.name}</h3>
                    
                    {/* Метка уровня доступа */}
                    {renderAccessMarker(accessType)}
                    
                    <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-3">
                      {item.description || "Надежное промышленное оборудование мастерской для реализации ваших проектов."}
                    </p>
                  </div>

                  {/* КНОПКА ДЕЙСТВИЯ */}
                  <div className="mt-auto pt-4 border-t-2 border-slate-100">
                    {item.status === 'maintenance' ? (
                      <Button disabled className="w-full h-14 border-2 border-slate-400 bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-xs rounded-none cursor-not-allowed shadow-none">
                        <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> ТЕХОБСЛУЖИВАНИЕ
                      </Button>
                    ) : hasAccess ? (
                      <Button 
                        onClick={() => setSelectedEquipment(item)}
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-xs rounded-none shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                      >
                        ВЫБРАТЬ ВРЕМЯ
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => toast.error(reason)}
                        variant="secondary"
                        className="w-full h-14 bg-slate-200 hover:bg-slate-200 text-slate-500 border-2 border-slate-300 font-black uppercase tracking-widest text-xs rounded-none cursor-not-allowed shadow-none flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4 shrink-0 text-slate-400" /> {reason}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Окно детального выбора времени и параметров */}
      <EquipmentDetailDialog
        open={!!selectedEquipment}
        equipment={selectedEquipment}
        userId={profile?.id || null}
        safetyBriefingPassed={profile?.safety_briefing_passed || false}
        onClose={() => setSelectedEquipment(null)}
        onSuccess={() => setSelectedEquipment(null)}
      />
    </main>
  );
}