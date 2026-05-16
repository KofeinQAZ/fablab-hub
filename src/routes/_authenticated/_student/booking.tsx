import { createFileRoute, Navigate } from "@tanstack/react-router";
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
      <main className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-64 rounded-3xl" />
        ))}
      </main>
    );
  }

  if (!authData) return <Navigate to="/login" />;

  const stationary = (equipment ?? []).filter((item) => item.category === "stationary");
  const portable = (equipment ?? []).filter((item) => item.category === "portable");
  const firstActivePortable = portable.find((item) => item.status === "active") ?? null;

  return (
    <>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Бронирование оборудования</CardTitle>
            <p className="text-sm text-slate-600">
              Выберите категорию, откройте карточку оборудования и оформите бронь через модальное окно.
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stationary" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl">
                <TabsTrigger value="stationary" className="rounded-xl">Станки</TabsTrigger>
                <TabsTrigger value="portable" className="rounded-xl">Инвентарь</TabsTrigger>
              </TabsList>

              <TabsContent value="stationary">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {equipmentLoading
                    ? Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} className="h-64 rounded-3xl" />)
                    : stationary.map((item) => (
                        <EquipmentBentoCard key={item.id} equipment={item} onOpen={() => setSelected(item)} />
                      ))}
                </div>
              </TabsContent>

              <TabsContent value="portable" className="space-y-4">
                <Card className="rounded-3xl border border-blue-700 bg-gradient-to-br from-blue-700 to-blue-500 text-white shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                        <QrCode className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-blue-100">Portable Inventory</p>
                        <p className="text-lg font-semibold">Сканировать инвентарь</p>
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

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        userId={authData.userId}
        safetyBriefingPassed={authData.profile.safety_briefing_passed}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["equipment", "booking"] });
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        }}
      />
    </>
  );
}
