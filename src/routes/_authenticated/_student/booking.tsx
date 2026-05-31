import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipmentDetailDialog, EquipmentDetails } from "@/components/equipment-detail-dialog";
import { Lock, AlertCircle } from "lucide-react";
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
          : { hasAccess: false, reason: "Требуется сдача ТБ" };
      case 'resident_only': 
        return profile.role === 'resident' 
          ? { hasAccess: true } 
          : { hasAccess: false, reason: "Только для Резидентов" };
      default: 
        return { hasAccess: true };
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-black text-slate-900">Бронирование оборудования</h1>
        <p className="text-slate-500 max-w-2xl">
          Выберите категорию, изучите уровни доступа и оформите бронь на нужный станок или инвентарь.
        </p>
      </div>

      <Tabs defaultValue="stationary" onValueChange={(v) => setCategory(v as any)} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-slate-100 p-1">
          <TabsTrigger value="stationary" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">Станки</TabsTrigger>
          <TabsTrigger value="portable" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">Инвентарь</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-[32px] bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item: any) => {
            const accessType = item.access_type || 'basic';
            const { hasAccess, reason } = checkAccess(accessType);

            return (
              <Card key={item.id} className="group relative overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl flex flex-col">
                <div className={`h-40 flex items-center justify-center text-white text-3xl font-black p-6 relative ${
                  item.status === 'maintenance' ? 'bg-red-500' : 'bg-blue-600'
                }`}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                  ) : null}
                  <span className="relative z-10 text-center line-clamp-2 leading-tight drop-shadow-md">{item.name.split(' — ')[0]}</span>
                </div>

                <CardContent className="p-6 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2">{item.name}</h3>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge className={`border-none ${item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {item.status === 'active' ? '🟢 Активен' : '🔴 Обслуживание'}
                    </Badge>
                    
                    {accessType === 'basic' && <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Общий</Badge>}
                    {accessType === 'independent' && <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Нужен ТБ</Badge>}
                    {accessType === 'mentor_required' && <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">С ментором</Badge>}
                    {accessType === 'resident_only' && <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">Резиденты</Badge>}
                  </div>
                  
                  <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">
                    {item.description || "Надежное оборудование для ваших проектов."}
                  </p>

                  {item.status === 'maintenance' ? (
                    <Button disabled className="w-full h-12 rounded-2xl bg-slate-100 text-slate-500 font-bold border-none">
                      <AlertCircle className="w-4 h-4 mr-2" /> В ремонте
                    </Button>
                  ) : hasAccess ? (
                    <Button 
                      onClick={() => setSelectedEquipment(item)}
                      className="w-full h-12 rounded-2xl bg-slate-100 text-blue-700 border border-blue-200 hover:bg-blue-50 font-bold"
                    >
                      Выбрать время
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => toast.error(reason)}
                      variant="secondary"
                      className="w-full h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold border-none cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 mr-2" /> {reason}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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