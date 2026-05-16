import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/_student")({
  component: StudentLayout,
});

function StudentLayout() {
  const { data: authData } = useCurrentProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={authData?.profile ?? null} />
      <Outlet />
    </div>
  );
}
