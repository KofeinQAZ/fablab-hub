import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Calendar, QrCode, Wrench as WrenchIcon, Zap, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: StudentDashboard,
});

type Profile = {
  id: string;
  name: string;
  role: "student" | "admin";
  safety_briefing_passed: boolean;
};

type Equipment = {
  id: string;
  name: string;
  category: "stationary" | "portable";
  status: "active" | "maintenance";
  image_url: string | null;
};

type Booking = {
  id: string;
  equipment_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "active" | "cancelled" | "completed";
  material_used: string | null;
};

const MATERIALS = ["ABS", "PLA", "PETG", "Own Material"];
const DURATIONS = [
  { label: "1 hour", hours: 1 },
  { label: "2 hours", hours: 2 },
  { label: "4 hours", hours: 4 },
  { label: "1 day", hours: 24 },
];

function StudentDashboard() {
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
    if (profile?.role === "admin") navigate({ to: "/admin" });
  }, [profile, navigate]);

  const { data: equipment, isLoading: equipLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const { data: myBookings } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["pending", "active"])
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const [bookingTarget, setBookingTarget] = useState<Equipment | null>(null);
  const [portableTarget, setPortableTarget] = useState<Equipment | null>(null);
  const [portableOpen, setPortableOpen] = useState(false);

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border" />
        <div className="max-w-6xl mx-auto p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const stationary = equipment?.filter((e) => e.category === "stationary") ?? [];
  const portable = equipment?.filter((e) => e.category === "portable") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader name={profile.name} role={profile.role} safetyPassed={profile.safety_briefing_passed} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!profile.safety_briefing_passed && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-foreground">Safety briefing required</div>
              <div className="text-muted-foreground">Visit the lab to complete your briefing before booking stationary equipment.</div>
            </div>
          </div>
        )}

        <Tabs defaultValue="stationary">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="stationary">Stationary</TabsTrigger>
            <TabsTrigger value="portable">Portable</TabsTrigger>
          </TabsList>

          <TabsContent value="stationary" className="mt-4">
            {equipLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stationary.map((eq) => (
                  <EquipmentCard
                    key={eq.id}
                    eq={eq}
                    canBook={profile.safety_briefing_passed}
                    onBook={() => setBookingTarget(eq)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="portable" className="mt-4 space-y-6">
            <Button
              size="lg"
              className="w-full h-28 text-lg font-semibold gap-3"
              onClick={() => { setPortableTarget(null); setPortableOpen(true); }}
            >
              <QrCode className="h-7 w-7" />
              Scan QR to Check-out
            </Button>
            <div>
              <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Available portable items</h2>
              {equipLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {portable.map((eq) => (
                    <button
                      key={eq.id}
                      onClick={() => { setPortableTarget(eq); setPortableOpen(true); }}
                      disabled={eq.status === "maintenance"}
                      className="text-left rounded-md border border-border bg-card p-3 flex items-center justify-between hover:border-primary/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <div className="font-medium">{eq.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{eq.status}</div>
                      </div>
                      {eq.status === "maintenance" ? (
                        <Badge variant="destructive">Maintenance</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> Ready</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {myBookings && myBookings.length > 0 && (
              <div>
                <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">My current bookings</h2>
                <div className="space-y-2">
                  {myBookings.map((b) => {
                    const eq = equipment?.find((e) => e.id === b.equipment_id);
                    return (
                      <div key={b.id} className="rounded-md border border-border bg-card p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{eq?.name ?? "Equipment"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={b.status === "active" ? "default" : "outline"}>{b.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BookingModal
        equipment={bookingTarget}
        onClose={() => setBookingTarget(null)}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ["my-bookings"] }); setBookingTarget(null); }}
      />
      <PortableModal
        open={portableOpen}
        target={portableTarget}
        portable={portable}
        onClose={() => setPortableOpen(false)}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ["my-bookings"] }); setPortableOpen(false); }}
      />
    </div>
  );
}

function EquipmentCard({ eq, canBook, onBook }: { eq: Equipment; canBook: boolean; onBook: () => void }) {
  const maintenance = eq.status === "maintenance";
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="aspect-video bg-muted flex items-center justify-center">
        <WrenchIcon className="h-12 w-12 text-muted-foreground/40" />
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{eq.name}</CardTitle>
          {maintenance && <Badge variant="destructive">Maintenance</Badge>}
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground capitalize flex-1">
        {eq.category} equipment
      </CardContent>
      <CardFooter>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full">
                <Button
                  className="w-full"
                  onClick={onBook}
                  disabled={maintenance || !canBook}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book
                </Button>
              </span>
            </TooltipTrigger>
            {!canBook && !maintenance && (
              <TooltipContent>Safety briefing required</TooltipContent>
            )}
            {maintenance && (
              <TooltipContent>Equipment is under maintenance</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}

function BookingModal({
  equipment,
  onClose,
  onSuccess,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<number>(10);
  const [material, setMaterial] = useState("PLA");

  const slots = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 2), []);

  const { data: dayBookings } = useQuery({
    queryKey: ["day-bookings", equipment?.id, date],
    queryFn: async () => {
      if (!equipment) return [];
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59`).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time,end_time,status")
        .eq("equipment_id", equipment.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .in("status", ["pending", "active"]);
      if (error) throw error;
      return data;
    },
    enabled: !!equipment,
  });

  const takenSlots = useMemo(() => {
    const set = new Set<number>();
    (dayBookings ?? []).forEach((b) => {
      const h = new Date(b.start_time).getHours();
      set.add(h - (h % 2));
    });
    return set;
  }, [dayBookings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!equipment) throw new Error("No equipment");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const start = new Date(`${date}T${String(slot).padStart(2, "0")}:00:00`);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const { error } = await supabase.from("bookings").insert({
        user_id: u.user.id,
        equipment_id: equipment.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "pending",
        material_used: material,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking requested successfully");
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!equipment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {equipment?.name}</DialogTitle>
          <DialogDescription>Pick a date and a 2-hour slot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Time slot (2-hour blocks)</Label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((h) => {
                const taken = takenSlots.has(h);
                const selected = slot === h;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={taken}
                    onClick={() => setSlot(h)}
                    className={`text-xs rounded-md border py-2 transition ${
                      taken
                        ? "bg-muted text-muted-foreground/50 border-border cursor-not-allowed line-through"
                        : selected
                        ? "border-primary bg-primary/15 text-primary font-medium"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    {String(h).padStart(2, "0")}:00
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Material</Label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || takenSlots.has(slot)}>
            {mutation.isPending ? "Requesting…" : "Request booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PortableModal({
  open, target, portable, onClose, onSuccess,
}: {
  open: boolean;
  target: Equipment | null;
  portable: Equipment[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [equipmentId, setEquipmentId] = useState<string>(target?.id ?? "");
  const [duration, setDuration] = useState(2);

  useEffect(() => {
    if (target?.id) setEquipmentId(target.id);
    else if (portable.length) setEquipmentId(portable.find((p) => p.status === "active")?.id ?? "");
  }, [target, portable]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      if (!equipmentId) throw new Error("Select equipment");
      const start = new Date();
      const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
      const { error } = await supabase.from("bookings").insert({
        user_id: u.user.id,
        equipment_id: equipmentId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Check-out requested"); onSuccess(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Portable check-out</DialogTitle>
          <DialogDescription>Mock QR flow — select item and duration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Equipment</Label>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {portable.filter((p) => p.status === "active").map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d.hours} value={String(d.hours)}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !equipmentId}>
            {mutation.isPending ? "Requesting…" : "Request check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}