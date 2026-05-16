import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_student")({
  component: StudentLayout,
});

function StudentLayout() {
  const { data: authData, isLoading } = useCurrentProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-16 border-b border-slate-200 bg-white" />
      </div>
    );
  }

  if (!authData) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={authData.profile} />
      <Outlet />
    </div>
  );
}
