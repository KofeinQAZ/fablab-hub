import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EquipmentBentoCard } from "@/components/equipment-bento-card";
import { EquipmentDetailDialog, type EquipmentDetails } from "@/components/equipment-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_student/stationary")({
  component: StationaryPage,
});

function StationaryPage() {
  const queryClient = useQueryClient();
  const { data: authData, isLoading: profileLoading } = useCurrentProfile();
  const [selected, setSelected] = useState<EquipmentDetails | null>(null);

  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ["equipment", "stationary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("category", "stationary")
        .order("name");
      if (error) throw error;
      return (data as EquipmentDetails[]) ?? [];
    },
  });

  if (profileLoading) {
    return (
      <main className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-64 rounded-3xl" />
        ))}
      </main>
    );
  }

  if (!authData) return <Navigate to="/login" />;

  return (
    <>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Станки и 3D-принтеры</h1>
          <p className="mt-1 text-sm text-slate-600">
            Нажмите на карточку, чтобы открыть полные характеристики и форму бронирования.
          </p>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipmentLoading
            ? Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} className="h-64 rounded-3xl" />)
            : equipment?.map((item) => (
                <EquipmentBentoCard key={item.id} equipment={item} onOpen={() => setSelected(item)} />
              ))}
        </section>
      </main>

      <EquipmentDetailDialog
        open={!!selected}
        equipment={selected}
        userId={authData.userId}
        safetyBriefingPassed={authData.profile.safety_briefing_passed}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["equipment", "stationary"] });
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        }}
      />
    </>
  );
}
