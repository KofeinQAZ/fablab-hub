import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_admin/admin/projects")({
  beforeLoad: () => { throw redirect({ to: "/admin/clubs" }); },
});
