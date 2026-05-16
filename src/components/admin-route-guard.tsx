import { useEffect, useRef } from "react";
import { Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentProfile, type UserProfile } from "@/lib/auth";

export function AdminRouteGuard({
  children,
}: {
  children: (profile: UserProfile) => React.ReactNode;
}) {
  const { data: authData, isLoading } = useCurrentProfile();
  const deniedToastShownRef = useRef(false);

  useEffect(() => {
    if (!isLoading && authData && authData.profile.role !== "admin" && !deniedToastShownRef.current) {
      deniedToastShownRef.current = true;
      toast.error("Доступ запрещен. Требуются права администратора");
    }
  }, [authData, isLoading]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!authData) {
    return <Navigate to="/login" replace />;
  }

  if (authData.profile.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children(authData.profile)}</>;
}
