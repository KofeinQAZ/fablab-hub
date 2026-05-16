import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  component: AdminContentLayout,
});

function AdminContentLayout() {
  return <Outlet />;
}
