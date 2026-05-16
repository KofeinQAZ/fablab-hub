import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Wrench, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Props = {
  name: string;
  role: "student" | "admin";
  safetyPassed: boolean;
};

export function AppHeader({ name, role, safetyPassed }: Props) {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight truncate">FabLab Satbayev</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">
              {role === "admin" ? "Lab Assistant" : "Student"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {role === "student" && (
            safetyPassed ? (
              <Badge variant="secondary" className="gap-1 hidden sm:inline-flex">
                <ShieldCheck className="h-3 w-3 text-primary" /> Briefed
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 hidden sm:inline-flex border-destructive/50 text-destructive">
                <ShieldAlert className="h-3 w-3" /> No briefing
              </Badge>
            )
          )}
          <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[160px]">{name}</span>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}