import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  component: AdminIndexRedirect,
});

function AdminIndexRedirect() {
  return <Navigate to="/admin/statistics" replace />;
}
