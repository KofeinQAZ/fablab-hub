import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { useCurrentProfile } from "@/lib/auth";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const { data: authData } = useCurrentProfile();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader profile={authData?.profile ?? null} />
      <Outlet />
    </div>
  );
}
