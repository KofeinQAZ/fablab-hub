import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, X, Wrench as WrenchIcon, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

type Profile = { id: string; name: string; role: "student" | "admin"; safety_briefing_passed: boolean };
type Equipment = { id: string; name: string; category: "stationary" | "portable"; status: "active" | "maintenance" };
type Booking = {
  id: string;
  user_id: string;
  equipment_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "active" | "cancelled" | "completed";
  material_used: string | null;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      if (error) throw error;
      return data as Profile;
    },
  });

  useEffect(() => {
    if (profile && profile.role !== "admin") navigate({ to: "/dashboard" });
  }, [profile, navigate]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["all-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: profile?.role === "admin",
  });

  const { data: equipment } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return data as Equipment[];
    },
    enabled: profile?.role === "admin",
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name,role,safety_briefing_passed");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: profile?.role === "admin",
  });

  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const equipmentById = new Map((equipment ?? []).map((e) => [e.id, e]));

  const updateBooking = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Booking["status"] }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(`Booking ${v.status}`);
      qc.invalidateQueries({ queryKey: ["all-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setEquipmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Equipment["status"] }) => {
      const { error } = await supabase.from("equipment").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipment updated");
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBriefing = useMutation({
    mutationFn: async ({ id, passed }: { id: string; passed: boolean }) => {
      const { error } = await supabase.from("profiles").update({ safety_briefing_passed: passed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Briefing updated");
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border" />
        <div className="max-w-6xl mx-auto p-4 space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const pendingPortable = (bookings ?? []).filter(
    (b) => b.status === "pending" && equipmentById.get(b.equipment_id)?.category === "portable"
  );
  const otherBookings = (bookings ?? []).filter(
    (b) => !(b.status === "pending" && equipmentById.get(b.equipment_id)?.category === "portable")
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader name={profile.name} role={profile.role} safetyPassed={profile.safety_briefing_passed} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending portable requests</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPortable.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <div className="space-y-2">
                {pendingPortable.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-3 justify-between rounded-md border border-border bg-card/50 p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{equipmentById.get(b.equipment_id)?.name ?? "Equipment"}</div>
                      <div className="text-xs text-muted-foreground">
                        {profilesById.get(b.user_id)?.name ?? "Student"} • {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateBooking.mutate({ id: b.id, status: "active" })}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateBooking.mutate({ id: b.id, status: "cancelled" })}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active & upcoming bookings</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {bookingsLoading ? (
              <Skeleton className="h-40" />
            ) : otherBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherBookings.map((b) => {
                    const eq = equipmentById.get(b.equipment_id);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{eq?.name ?? "—"}</TableCell>
                        <TableCell>{profilesById.get(b.user_id)?.name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{new Date(b.start_time).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{new Date(b.end_time).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === "active" ? "default" : "outline"}>{b.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => updateBooking.mutate({ id: b.id, status: "cancelled" })}>
                              <Ban className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            {eq && (
                              <Button size="sm" variant="ghost" onClick={() => setEquipmentStatus.mutate({ id: eq.id, status: "maintenance" })}>
                                <WrenchIcon className="h-4 w-4 mr-1" /> Maint.
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(equipment ?? []).map((eq) => (
              <div key={eq.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="font-medium text-sm">{eq.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{eq.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={eq.status === "active" ? "secondary" : "destructive"}>{eq.status}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={eq.status === "active"}
                      onCheckedChange={(v) => setEquipmentStatus.mutate({ id: eq.id, status: v ? "active" : "maintenance" })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students — safety briefing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(profiles ?? []).filter((p) => p.role === "student").map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="font-medium text-sm">{p.name || "(unnamed)"}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Briefed</span>
                  <Switch
                    checked={p.safety_briefing_passed}
                    onCheckedChange={(v) => toggleBriefing.mutate({ id: p.id, passed: v })}
                  />
                </div>
              </div>
            ))}
            {(profiles ?? []).filter((p) => p.role === "student").length === 0 && (
              <p className="text-sm text-muted-foreground">No students yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}