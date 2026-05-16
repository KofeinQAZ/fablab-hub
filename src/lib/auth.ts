import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  role: AppRole;
  safety_briefing_passed: boolean;
};

export async function ensureProfile(userId: string, email: string | undefined) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as UserProfile;

  const fallbackName = email?.split("@")[0] || "Student";
  const payload = {
    id: userId,
    name: fallbackName,
    role: "student" as const,
    safety_briefing_passed: false,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as UserProfile;
}

export function useCurrentProfile() {
  const queryClient = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const getInitial = async () => {
      await supabase.auth.getSession();
      setSessionReady(true);
    };
    void getInitial();

    const { data } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["current-profile"] });
    });

    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const profile = await ensureProfile(user.id, user.email);
      return {
        userId: user.id,
        email: user.email ?? "",
        profile,
      };
    },
    enabled: sessionReady,
  });

  return {
    isLoading: !sessionReady || query.isLoading,
    data: query.data ?? null,
  };
}
