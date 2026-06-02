import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "resident" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  role: AppRole;
  safety_briefing_passed: boolean;
  contact_email?: string;
  contact_phone?: string;
  is_banned?: boolean;
};

export async function ensureProfile(userId: string, email: string | undefined, name?: string, phone?: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  
  const fallbackName = name || email?.split("@")[0] || "Student";

  if (data) {
    // 🩹 ЛОГИКА САМОЛЕЧЕНИЯ: Если профиль есть, но контакты пустые — чиним их на лету!
    if (!data.contact_email || !data.contact_phone) {
      const updatePayload: any = {};
      if (!data.contact_email && email) updatePayload.contact_email = email;
      if (!data.contact_phone && phone) updatePayload.contact_phone = phone;
      
      if (Object.keys(updatePayload).length > 0) {
        const { data: updated, error: updateError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", userId)
          .select("*")
          .single();
        if (!updateError && updated) return updated as UserProfile;
      }
    }
    return data as UserProfile;
  }

  // Если профиля нет вообще — создаем его со всеми контактами!
  const payload = {
    id: userId,
    name: fallbackName,
    contact_email: email,
    contact_phone: phone,
    safety_briefing_passed: false,
    is_banned: false
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

      // Извлекаем телефон и имя, которые мы надежно сохранили в метаданных при регистрации
      const userPhone = user.user_metadata?.phone || "";
      const userName = user.user_metadata?.name || user.email?.split("@")[0] || "Student";

      const profile = await ensureProfile(user.id, user.email, userName, userPhone);
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