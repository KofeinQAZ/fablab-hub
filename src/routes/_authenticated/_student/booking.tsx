import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EquipmentBentoCard } from "@/components/equipment-bento-card";
import { EquipmentDetailDialog, type EquipmentDetails } from "@/components/equipment-detail-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode } from "lucide-react";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_student/booking")({
  component: BookingPage,
});

function BookingPage() {
  const queryClient = useQueryClient();
  const { data: authData, isLoading } = useCurrentProfile();
  const [selected, setSelected] = useState<EquipmentDetails | null>(null);

  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipment", "booking"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return (data as EquipmentDetails[]) ?? [];
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto grid w-full max-w-7xl gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-64 rounded-3xl" />
        ))}
      </main>
    );
  }

  const stationary = (equipment ?? []).filter((item) => item.category === "stationary");
  const portable = (equipment ?? []).filter((item) => item.category === "portable");
  const firstActivePortable = portable.find((item) => item.status === "active") ?? null;

  return (
    <>
      <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
          <CardHeader className="space-y-2 p-8 pb-6">
            <CardTitle className="text-3xl font-black text-slate-900">Бронирование оборудования</CardTitle>
            <p className="text-xs text-slate-600 md:text-sm">
              Выберите категорию, откройте карточку оборудования и оформите бронь через модальное окно.
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <Tabs defaultValue="stationary" className="space-y-6">
              <TabsList className="grid h-auto w-full max-w-lg grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
                <TabsTrigger
                  value="stationary"
                  className="h-11 rounded-xl text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  Станки
                </TabsTrigger>
                <TabsTrigger
                  value="portable"
                  className="h-11 rounded-xl text-sm font-semibold text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  Инвентарь
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stationary">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {equipmentLoading
                    ? Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} className="h-64 rounded-3xl" />)
                    : stationary.map((item) => (
                        <EquipmentBentoCard key={item.id} equipment={item} onOpen={() => setSelected(item)} />
                      ))}
                </div>
              </TabsContent>

              <TabsContent value="portable" className="space-y-6">
                <Card className="rounded-3xl border border-slate-100 bg-gradient-to-br from-[#005BAB] via-blue-700 to-blue-500 text-white shadow-sm transition-all hover:shadow-xl">
                  <CardContent className="flex flex-col gap-5 p-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                        <QrCode className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Portable Inventory</p>
                        <p className="text-2xl font-black">Сканировать инвентарь</p>
                      </div>
                    </div>
                    <Button
                      className="h-14 rounded-2xl bg-yellow-300 text-base font-bold text-slate-900 hover:bg-yellow-200"
                      onClick={() => setSelected(firstActivePortable)}
                      disabled={!firstActivePortable}
                    >
                      Сканировать инвентарь (Check-out)
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {equipmentLoading
                    ? Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} className="h-64 rounded-3xl" />)
                    : portable.map((item) => (
                        <EquipmentBentoCard key={item.id} equipment={item} onOpen={() => setSelected(item)} />
                      ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <EquipmentDetailDialog
        open={!!selected}
        equipment={selected}
        userId={authData?.userId ?? null}
        safetyBriefingPassed={authData?.profile.safety_briefing_passed ?? false}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["equipment", "booking"] });
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        }}
      />
    </>
  );
}
